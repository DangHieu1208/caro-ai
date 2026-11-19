from dataclasses import asdict
from time import perf_counter
from typing import Literal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, StrictInt
from app.agents.base import AgentConfig
from app.agents.registry import AGENTS
from app.core.game import GameState

app = FastAPI(title='Caro AI Lab')


class ConfigRequest(BaseModel):
    depth: int = Field(2, ge=1, le=6)
    candidate_limit: int = Field(10, ge=0, le=81)
    pruning: bool = True
    iterations: int = Field(300, ge=1, le=10000)
    c: float = Field(1.4, gt=0, le=10)
    seed: int | None = None
    rollout: Literal['random', 'heuristic'] = 'random'


class MoveRequest(BaseModel):
    board: list[list[StrictInt]]
    player: Literal[1, 2]
    algorithm: Literal['random', 'minimax', 'mcts']
    config: ConfigRequest = Field(default_factory=ConfigRequest)


@app.get('/api/agents')
def list_agents():
    return [{'id': key, 'ready': ready} for key, (_, ready) in AGENTS.items()]


@app.post('/api/move')
def move(request: MoveRequest):
    try:
        state = GameState.from_board(request.board)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    if state.winner is not None or state.to_move != request.player:
        raise HTTPException(422, 'Game is over or player is out of turn')
    cls, ready = AGENTS[request.algorithm]
    if not ready:
        raise HTTPException(501, 'Algorithm has not been integrated yet')
    config = AgentConfig(**request.config.model_dump())
    start = perf_counter()
    result = cls().choose_move(state, config)
    elapsed = (perf_counter() - start) * 1000
    if result.move not in state.legal_moves():
        raise HTTPException(500, 'Agent returned an illegal move')
    next_state = state.play(result.move)
    metrics = asdict(result)
    metrics.pop('move')
    metrics['elapsed_ms'] = elapsed
    return {'move': result.move, 'board': next_state.board, 'winner': next_state.winner,
            'to_move': next_state.to_move, 'metrics': metrics}
