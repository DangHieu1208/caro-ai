from dataclasses import dataclass

from app.agents.base import AgentConfig
from app.agents.registry import AGENTS

from app.experiments.runner import Competitor

from app.schemas import (
    CompetitorRequest,
    ExperimentRequest,
)


@dataclass(frozen=True, slots=True)
class ExperimentCase:
    id: str
    label: str
    competitor_a: Competitor
    competitor_b: Competitor


def _from_request(
    request: CompetitorRequest,
) -> Competitor:
    return Competitor(
        algorithm=request.algorithm,
        config=AgentConfig(
            **request.config.model_dump()
        ),
    )


def _random() -> Competitor:
    return Competitor(
        algorithm='random',
        config=AgentConfig(),
    )


def _minimax() -> Competitor:
    return Competitor(
        algorithm='minimax',
        config=AgentConfig(
            depth=2,
            candidate_limit=10,
            pruning=True,
        ),
    )


def _mcts(
    iterations: int = 300,
    c: float = 1.4,
) -> Competitor:
    return Competitor(
        algorithm='mcts',
        config=AgentConfig(
            iterations=iterations,
            c=c,
            rollout='random',
        ),
    )


def build_scenarios(
    request: ExperimentRequest,
) -> tuple[ExperimentCase, ...]:
    scenario = request.scenario

    # Preset experiments must satisfy the assignment's
    # minimum sample size.
    if scenario != 'custom' and request.pairs < 10:
        raise ValueError(
            'Preset experiments require at least 10 pairs'
        )

    if scenario == 'custom':
        if (
            request.competitor_a is None
            or request.competitor_b is None
        ):
            raise ValueError(
                'Custom experiments require both competitors'
            )

        if request.opponent is not None:
            raise ValueError(
                'Custom experiments do not use opponent'
            )

        return (
            ExperimentCase(
                id='custom',
                label='Custom experiment',

                competitor_a=_from_request(
                    request.competitor_a
                ),

                competitor_b=_from_request(
                    request.competitor_b
                ),
            ),
        )

    if (
        request.competitor_a is not None
        or request.competitor_b is not None
    ):
        raise ValueError(
            'Preset experiments do not accept custom competitors'
        )

    if scenario == 'comparison':
        if request.opponent is not None:
            raise ValueError(
                'Comparison uses predefined opponents'
            )

        return (
            ExperimentCase(
                id='random_vs_minimax',
                label='Random vs MiniMax + Alpha-Beta',
                competitor_a=_random(),
                competitor_b=_minimax(),
            ),

            ExperimentCase(
                id='random_vs_mcts',
                label='Random vs MCTS + UCT',
                competitor_a=_random(),
                competitor_b=_mcts(),
            ),

            ExperimentCase(
                id='minimax_vs_mcts',
                label='MiniMax + Alpha-Beta vs MCTS + UCT',
                competitor_a=_minimax(),
                competitor_b=_mcts(),
            ),
        )

    # The opponent stays fixed throughout a sweep.
    opponent = (
        _from_request(request.opponent)
        if request.opponent is not None
        else _minimax()
    )

    if scenario == 'uct_c':
        return tuple(
            ExperimentCase(
                id=f'uct_c_{c}',

                label=f'MCTS: c = {c}',

                competitor_a=_mcts(
                    iterations=300,
                    c=c,
                ),

                competitor_b=opponent,
            )
            for c in (0.5, 1.0, 1.4, 2.0)
        )

    if scenario == 'iterations':
        return tuple(
            ExperimentCase(
                id=f'iterations_{iterations}',

                label=f'MCTS: {iterations} iterations',

                competitor_a=_mcts(
                    iterations=iterations,
                    c=1.4,
                ),

                competitor_b=opponent,
            )
            for iterations in (100, 300, 500)
        )

    raise ValueError(
        f'Unsupported scenario: {scenario}'
    )


def validate_readiness(
    cases: tuple[ExperimentCase, ...],
) -> None:
    required_algorithms = {
        competitor.algorithm

        for case in cases

        for competitor in (
            case.competitor_a,
            case.competitor_b,
        )
    }

    unavailable = sorted(
        algorithm
        for algorithm in required_algorithms
        if (
            algorithm not in AGENTS
            or not AGENTS[algorithm][1]
        )
    )

    if unavailable:
        raise ValueError(
            'Algorithms not ready: '
            + ', '.join(unavailable)
        )
