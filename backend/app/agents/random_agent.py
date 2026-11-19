from random import Random
from app.agents.base import AgentConfig, SearchResult
from app.core.game import GameState


class RandomAgent:
    def choose_move(self, state: GameState, config: AgentConfig) -> SearchResult:
        moves = state.legal_moves()
        if not moves:
            raise ValueError('No legal moves')
        return SearchResult(move=Random(config.seed).choice(moves))
