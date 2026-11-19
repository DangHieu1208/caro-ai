from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


AlgorithmId = Literal[
    'random',
    'minimax',
    'mcts',
]

ExperimentScenario = Literal[
    'custom',
    'comparison',
    'uct_c',
    'iterations',
]


class ConfigRequest(BaseModel):
    depth: int = Field(2, ge=1, le=6)

    candidate_limit: int = Field(
        10, ge=0, le=81,
    )

    pruning: bool = True

    iterations: int = Field(
        300, ge=1, le=10000,
    )

    c: float = Field(
        1.4, gt=0, le=10,
    )

    seed: int | None = None

    rollout: Literal[
        'random',
        'heuristic',
    ] = 'random'


class ExperimentConfigRequest(ConfigRequest):
    model_config = ConfigDict(
        extra='forbid',
    )

    # Seeds are controlled by the experiment runner.
    seed: None = None

    # Only the baseline rollout is currently supported.
    rollout: Literal['random'] = 'random'


class CompetitorRequest(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )

    algorithm: AlgorithmId

    config: ExperimentConfigRequest = Field(
        default_factory=ExperimentConfigRequest,
    )


class ExperimentRequest(BaseModel):
    model_config = ConfigDict(
        extra='forbid',
    )

    scenario: ExperimentScenario = 'custom'

    pairs: int = Field(
        10,
        ge=1,
        le=30,
        strict=True,
    )

    seed: int = Field(
        42,
        ge=0,
        le=9007199254740991,
        strict=True,
    )

    # Required for custom experiments.
    competitor_a: CompetitorRequest | None = None

    competitor_b: CompetitorRequest | None = None

    # Optional fixed opponent for MCTS sweeps.
    opponent: CompetitorRequest | None = None

    # Git commit used for official experiments.
    source_revision: str | None = Field(
        None,
        max_length=80,
    )
