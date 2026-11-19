from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from threading import Event, Lock, Thread
from typing import Literal
from uuid import uuid4

import logging
import os
import platform

from fastapi import (
    APIRouter,
    HTTPException,
    Response,
    status,
)

from app.experiments.runner import (
    ExperimentCancelled,
    ExperimentResult,
    run_experiment,
)

from app.experiments.scenarios import (
    ExperimentCase,
    build_scenarios,
    validate_readiness,
)

from app.schemas import ExperimentRequest


router = APIRouter(
    prefix='/api/experiments',
    tags=['Experiments'],
)

logger = logging.getLogger(__name__)


JobStatus = Literal[
    'queued',
    'running',
    'cancelling',
    'completed',
    'cancelled',
    'failed',
]

ACTIVE_STATUSES = {
    'queued',
    'running',
    'cancelling',
}

TERMINAL_STATUSES = {
    'completed',
    'cancelled',
    'failed',
}

MAX_RETAINED_JOBS = 6


def _now() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def _environment() -> dict:
    return {
        'python_version': platform.python_version(),

        'operating_system': platform.platform(),

        'machine': platform.machine(),

        'processor': (
            platform.processor() or None
        ),

        'logical_cpu_count': os.cpu_count(),

        'execution_mode': 'sequential',

        'timing_method': 'perf_counter',
    }


@dataclass(frozen=True, slots=True)
class CaseResult:
    id: str
    label: str
    result: ExperimentResult


@dataclass(slots=True)
class ExperimentJob:
    id: str

    request: ExperimentRequest

    cases: tuple[ExperimentCase, ...]

    status: JobStatus = 'queued'

    completed_games: int = 0

    current_case_id: str | None = None

    current_case_label: str | None = None

    current_case_completed_games: int = 0

    current_case_total_games: int = 0

    error: str | None = None

    created_at: str = field(
        default_factory=_now
    )

    started_at: str | None = None

    finished_at: str | None = None

    environment: dict = field(
        default_factory=_environment
    )

    cancel_event: Event = field(
        default_factory=Event
    )

    results: tuple[CaseResult, ...] = ()

    @property
    def total_games(self) -> int:
        return (
            len(self.cases)
            * self.request.pairs
            * 2
        )


_jobs: dict[str, ExperimentJob] = {}

_lock = Lock()


def _snapshot(
    job: ExperimentJob,
) -> dict:
    progress = (
        100
        * job.completed_games
        / job.total_games
        if job.total_games
        else 0
    )

    return {
        'job_id': job.id,

        'scenario': job.request.scenario,

        'status': job.status,

        'pairs': job.request.pairs,

        'seed': job.request.seed,

        'total_cases': len(job.cases),

        'completed_games': job.completed_games,

        'total_games': job.total_games,

        'progress': round(progress, 2),

        'current_case_id': job.current_case_id,

        'current_case_label': job.current_case_label,

        'current_case_completed_games':
            job.current_case_completed_games,

        'current_case_total_games':
            job.current_case_total_games,

        'error': job.error,

        'created_at': job.created_at,

        'started_at': job.started_at,

        'finished_at': job.finished_at,

        'status_url':
            f'/api/experiments/{job.id}',

        'result_url':
            f'/api/experiments/{job.id}/result',

        'cancel_url':
            f'/api/experiments/{job.id}/cancel',
    }


def _get_job(
    job_id: str,
) -> ExperimentJob:
    job = _jobs.get(job_id)

    if job is None:
        raise HTTPException(
            status_code=404,
            detail='Experiment job not found',
        )

    return job


def _remove_old_jobs() -> None:
    # Called while holding the lock.
    while len(_jobs) >= MAX_RETAINED_JOBS:
        terminal_job_id = next(
            (
                job_id
                for job_id, job in _jobs.items()
                if job.status in TERMINAL_STATUSES
            ),
            None,
        )

        if terminal_job_id is None:
            break

        del _jobs[terminal_job_id]


def _run_job(
    job: ExperimentJob,
) -> None:
    with _lock:
        job.started_at = _now()

        if job.cancel_event.is_set():
            job.status = 'cancelled'
            job.finished_at = _now()
            return

        job.status = 'running'

    results: list[CaseResult] = []

    completed_before_case = 0

    try:
        for case in job.cases:
            if job.cancel_event.is_set():
                raise ExperimentCancelled()

            with _lock:
                job.current_case_id = case.id

                job.current_case_label = case.label

                job.current_case_completed_games = 0

                job.current_case_total_games = (
                    job.request.pairs * 2
                )

            def on_progress(
                completed: int,
                total: int,
            ) -> None:
                with _lock:
                    job.current_case_completed_games = (
                        completed
                    )

                    job.current_case_total_games = total

                    job.completed_games = (
                        completed_before_case
                        + completed
                    )

            result = run_experiment(
                competitor_a=case.competitor_a,

                competitor_b=case.competitor_b,

                pairs=job.request.pairs,

                seed=job.request.seed,

                on_progress=on_progress,

                cancelled=job.cancel_event.is_set,
            )

            results.append(
                CaseResult(
                    id=case.id,
                    label=case.label,
                    result=result,
                )
            )

            completed_before_case += len(
                result.games
            )

        with _lock:
            if job.cancel_event.is_set():
                job.status = 'cancelled'

            else:
                job.results = tuple(results)

                job.completed_games = job.total_games

                job.status = 'completed'

            job.finished_at = _now()

    except ExperimentCancelled:
        with _lock:
            job.status = 'cancelled'

            job.finished_at = _now()

    except Exception as exc:
        logger.exception(
            'Experiment job %s failed',
            job.id,
        )

        with _lock:
            job.status = 'failed'

            job.error = (
                f'{type(exc).__name__}: {exc}'
            )

            job.finished_at = _now()


@router.post(
    '',
    status_code=status.HTTP_202_ACCEPTED,
)
def create_experiment(
    request: ExperimentRequest,
    response: Response,
):
    try:
        cases = build_scenarios(request)

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    try:
        validate_readiness(cases)

    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    with _lock:
        if any(
            job.status in ACTIVE_STATUSES
            for job in _jobs.values()
        ):
            raise HTTPException(
                status_code=409,

                detail=(
                    'Another experiment is already running'
                ),
            )

        _remove_old_jobs()

        job = ExperimentJob(
            id=uuid4().hex,
            request=request,
            cases=cases,
        )

        _jobs[job.id] = job

        worker = Thread(
            target=_run_job,

            args=(job,),

            name=f'experiment-{job.id}',

            daemon=True,
        )

        try:
            worker.start()

        except RuntimeError as exc:
            del _jobs[job.id]

            raise HTTPException(
                status_code=503,

                detail='Cannot start experiment worker',
            ) from exc

        response.headers['Location'] = (
            f'/api/experiments/{job.id}'
        )

        response.headers['Retry-After'] = '1'

        return _snapshot(job)


@router.get('/{job_id}')
def get_experiment_status(
    job_id: str,
):
    with _lock:
        job = _get_job(job_id)

        return _snapshot(job)


@router.get('/{job_id}/result')
def get_experiment_result(
    job_id: str,
):
    with _lock:
        job = _get_job(job_id)

        if job.status != 'completed':
            raise HTTPException(
                status_code=409,

                detail=(
                    'Experiment result is not available '
                    f'while status is {job.status}'
                ),
            )

        request = job.request.model_dump()

        metadata = {
            'job_id': job.id,

            'scenario': job.request.scenario,

            'created_at': job.created_at,

            'started_at': job.started_at,

            'finished_at': job.finished_at,

            'environment': dict(
                job.environment
            ),

            'source_revision':
                job.request.source_revision,

            'total_games': job.total_games,
        }

        results = job.results

    # Serialize outside the lock so that status
    # requests are not blocked by a large response.
    return {
        **metadata,

        'request': request,

        'cases': [
            asdict(result)
            for result in results
        ],
    }


@router.post(
    '/{job_id}/cancel',
    status_code=status.HTTP_202_ACCEPTED,
)
def cancel_experiment(
    job_id: str,
):
    with _lock:
        job = _get_job(job_id)

        if job.status in TERMINAL_STATUSES:
            raise HTTPException(
                status_code=409,

                detail=(
                    'Cannot cancel an experiment '
                    f'with status {job.status}'
                ),
            )

        job.cancel_event.set()

        job.status = 'cancelling'

        return _snapshot(job)
