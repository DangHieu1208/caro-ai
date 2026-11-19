from app.agents.base import AgentConfig, SearchResult
from app.core.game import GameState


class MCTSAgent:
    def choose_move(self, state: GameState, config: AgentConfig) -> SearchResult:
        raise NotImplementedError('Team B: implement MCTS and UCT here')
