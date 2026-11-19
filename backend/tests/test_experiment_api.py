from threading import Event
from time import monotonic, sleep

import pytest

from fastapi.testclient import TestClient

from app.agents.base import AgentConfig
from app.agents.registry import AGENTS

from app.experiments import api as experiment_api

from app.experiments.runner import (
    Competitor,
    ExperimentCancelled,
    run_experiment,
)

from app.experiments.scenarios import (
    build_scenarios,
)

from app.main import app

from app.schemas import ExperimentRequest


client = TestClient(app)


def custom_payload(pairs=1):
    return {
        'scenario': 'custom',

        'pairs': pairs,

        'seed': 42,

        'competitor_a': {
            'algorithm': 'random',
            'config': {},
        },

        'competitor_b': {
            'algorithm': 'random',
            'config': {},
        },
    }


def wait_for_terminal(
    job_id,
    timeout=5,
):
    deadline = monotonic() + timeout

    while monotonic() < deadline:
        response = client.get(
            f'/api/experiments/{job_id}'
        )

        assert response.status_code == 200

        data = response.json()

        if data['status'] in {
            'completed',
            'failed',
            'cancelled',
        }:
            return data

        sleep(0.01)

    pytest.fail(
        f'Job did not finish: {job_id}'
    )


def test_custom_experiment_lifecycle():
    response = client.post(
        '/api/experiments',
        json=custom_payload(),
    )

    assert response.status_code == 202

    data = response.json()

    job_id = data['job_id']

    assert response.headers['Location'] == (
        f'/api/experiments/{job_id}'
    )

    assert data['total_games'] == 2

    final = wait_for_terminal(job_id)

    assert final['status'] == 'completed'

    assert final['completed_games'] == 2

    assert final['progress'] == 100

    result_response = client.get(
        f'/api/experiments/{job_id}/result'
    )

    assert result_response.status_code == 200

    result = result_response.json()

    assert len(result['cases']) == 1

    assert result['environment']['python_version']

    case = result['cases'][0]['result']

    assert len(case['games']) == 2

    assert case['summary_a']['games'] == 2

    assert case['summary_b']['games'] == 2


def test_comparison_scenarios():
    cases = build_scenarios(
        ExperimentRequest(
            scenario='comparison',
            pairs=10,
        )
    )

    assert len(cases) == 3

    assert [
        (
            case.competitor_a.algorithm,
            case.competitor_b.algorithm,
        )

        for case in cases

    ] == [
        ('random', 'minimax'),
        ('random', 'mcts'),
        ('minimax', 'mcts'),
    ]


def test_uct_sweep():
    cases = build_scenarios(
        ExperimentRequest(
            scenario='uct_c',
            pairs=10,
        )
    )

    assert [
        case.competitor_a.config.c

        for case in cases

    ] == [0.5, 1.0, 1.4, 2.0]

    assert all(
        case.competitor_a.config.iterations == 300

        for case in cases
    )

    assert all(
        case.competitor_b == cases[0].competitor_b

        for case in cases
    )


def test_iteration_sweep():
    cases = build_scenarios(
        ExperimentRequest(
            scenario='iterations',
            pairs=10,
        )
    )

    assert [
        case.competitor_a.config.iterations

        for case in cases

    ] == [100, 300, 500]

    assert all(
        case.competitor_a.config.c == 1.4

        for case in cases
    )

    assert all(
        case.competitor_b == cases[0].competitor_b

        for case in cases
    )


def test_custom_sweep_opponent():
    request = ExperimentRequest(
        scenario='uct_c',

        pairs=10,

        opponent={
            'algorithm': 'random',
        },
    )

    cases = build_scenarios(request)

    assert all(
        case.competitor_b.algorithm == 'random'

        for case in cases
    )


def test_preset_requires_ten_pairs():
    response = client.post(
        '/api/experiments',

        json={
            'scenario': 'uct_c',
            'pairs': 9,
        },
    )

    assert response.status_code == 422


def test_missing_custom_competitors():
    response = client.post(
        '/api/experiments',

        json={
            'scenario': 'custom',
            'pairs': 1,
        },
    )

    assert response.status_code == 422


def test_unready_algorithm(monkeypatch):
    cls, _ = AGENTS['mcts']

    monkeypatch.setitem(
        AGENTS,
        'mcts',
        (cls, False),
    )

    payload = custom_payload()

    payload['competitor_b']['algorithm'] = 'mcts'

    response = client.post(
        '/api/experiments',
        json=payload,
    )

    assert response.status_code == 409


def test_invalid_configuration():
    payload = custom_payload()

    payload['competitor_a']['config'] = {
        'depth': 100,
    }

    response = client.post(
        '/api/experiments',
        json=payload,
    )

    assert response.status_code == 422


def test_unknown_job():
    response = client.get(
        '/api/experiments/unknown'
    )

    assert response.status_code == 404


def test_runner_progress_callback():
    competitor = Competitor(
        'random',
        AgentConfig(),
    )

    updates = []

    result = run_experiment(
        competitor,
        competitor,

        pairs=1,

        on_progress=lambda done, total:
            updates.append((done, total)),
    )

    assert len(result.games) == 2

    assert updates == [
        (0, 2),
        (1, 2),
        (2, 2),
    ]


def test_runner_cancellation():
    competitor = Competitor(
        'random',
        AgentConfig(),
    )

    cancellation = Event()

    def on_progress(done, total):
        if done == 1:
            cancellation.set()

    with pytest.raises(ExperimentCancelled):
        run_experiment(
            competitor,
            competitor,

            pairs=2,

            on_progress=on_progress,

            cancelled=cancellation.is_set,
        )


def test_busy_job_and_cancellation(monkeypatch):
    entered = Event()

    release = Event()

    def slow_runner(*args, **kwargs):
        entered.set()

        release.wait(timeout=5)

        if kwargs['cancelled']():
            raise ExperimentCancelled()

        raise RuntimeError(
            'Unexpected test execution'
        )

    monkeypatch.setattr(
        experiment_api,

        'run_experiment',

        slow_runner,
    )

    response = client.post(
        '/api/experiments',
        json=custom_payload(),
    )

    assert response.status_code == 202

    job_id = response.json()['job_id']

    try:
        assert entered.wait(timeout=2)

        busy_response = client.post(
            '/api/experiments',
            json=custom_payload(),
        )

        assert busy_response.status_code == 409

        premature_result = client.get(
            f'/api/experiments/{job_id}/result'
        )

        assert premature_result.status_code == 409

        cancel_response = client.post(
            f'/api/experiments/{job_id}/cancel'
        )

        assert cancel_response.status_code == 202

        assert (
            cancel_response.json()['status']
            == 'cancelling'
        )

    finally:
        release.set()

        final = wait_for_terminal(job_id)

    assert final['status'] == 'cancelled'

    result_response = client.get(
        f'/api/experiments/{job_id}/result'
    )

    assert result_response.status_code == 409


def test_failed_job(monkeypatch):
    def broken_runner(*args, **kwargs):
        raise RuntimeError(
            'Simulated experiment failure'
        )

    monkeypatch.setattr(
        experiment_api,

        'run_experiment',

        broken_runner,
    )

    response = client.post(
        '/api/experiments',
        json=custom_payload(),
    )

    assert response.status_code == 202

    job_id = response.json()['job_id']

    final = wait_for_terminal(job_id)

    assert final['status'] == 'failed'

    assert (
        'Simulated experiment failure'
        in final['error']
    )

    result_response = client.get(
        f'/api/experiments/{job_id}/result'
    )

    assert result_response.status_code == 409
