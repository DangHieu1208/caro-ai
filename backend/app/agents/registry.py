from app.agents.base import Agent
from app.agents.random_agent import RandomAgent
from app.agents.minimax.agent import MinimaxAgent
from app.agents.mcts.agent import MCTSAgent

# Enable a module only after its implementation and tests are reviewed.
AGENTS: dict[str, tuple[type[Agent], bool]] = {
    'random': (RandomAgent, True),
    'minimax': (MinimaxAgent, False),
    'mcts': (MCTSAgent, False),
}
