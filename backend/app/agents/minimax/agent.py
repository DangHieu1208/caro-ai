from app.agents.base import AgentConfig, SearchResult
from app.core.game import GameState


class MinimaxAgent:
    def choose_move(self, state: GameState, config: AgentConfig) -> SearchResult:
        raise NotImplementedError('Team A: implement MiniMax and Alpha-Beta here')
