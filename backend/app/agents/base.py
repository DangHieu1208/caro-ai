from dataclasses import dataclass
from typing import Protocol
from app.core.game import GameState, Move


@dataclass(frozen=True, slots=True)
class AgentConfig:
    depth: int = 2
    candidate_limit: int = 10
    pruning: bool = True
    iterations: int = 300
    c: float = 1.4
    seed: int | None = None
    rollout: str = 'random'


@dataclass(frozen=True, slots=True)
class SearchResult:
    move: Move
    nodes: int | None = None
    cutoffs: int | None = None
    iterations: int | None = None
    depth: int | None = None
    value: float | None = None


class Agent(Protocol):
    def choose_move(self, state: GameState, config: AgentConfig) -> SearchResult: ...
