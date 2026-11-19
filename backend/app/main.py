from dataclasses import asdict
from time import perf_counter
from typing import Literal

from fastapi import FastAPI, HTTPException

from pydantic import (
    BaseModel,
    Field,
    StrictInt,
)

from app.agents.base import AgentConfig
from app.agents.registry import AGENTS
from app.core.game import GameState

from app.experiments.api import (
    router as experiment_router,
)

from app.schemas import ConfigRequest


app = FastAPI(
    title='Caro AI Lab',
)

app.include_router(
    experiment_router
)


class MoveRequest(BaseModel):
    board: list[list[StrictInt]]

    player: Literal[1, 2]

    algorithm: Literal[
        'random',
        'minimax',
        'mcts',
    ]

    config: ConfigRequest = Field(
        default_factory=ConfigRequest,
    )


@app.get('/api/agents')
def list_agents():
    return [
        {
            'id': key,
            'ready': ready,
        }

        for key, (_, ready) in AGENTS.items()
    ]


@app.post('/api/move')
def move(
    request: MoveRequest,
):
    try:
        state = GameState.from_board(
            request.board
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    if (
        state.winner is not None
        or state.to_move != request.player
    ):
        raise HTTPException(
            status_code=422,

            detail=(
                'Game is over or player is out of turn'
            ),
        )

    cls, ready = AGENTS[
        request.algorithm
    ]

    if not ready:
        raise HTTPException(
            status_code=501,

            detail=(
                'Algorithm has not been integrated yet'
            ),
        )

    config = AgentConfig(
        **request.config.model_dump()
    )

    start = perf_counter()

    result = cls().choose_move(
        state,
        config,
    )

    elapsed = (
        perf_counter() - start
    ) * 1000

    if result.move not in state.legal_moves():
        raise HTTPException(
            status_code=500,

            detail=(
                'Agent returned an illegal move'
            ),
        )

    next_state = state.play(
        result.move
    )

    metrics = asdict(result)

    metrics.pop('move')

    metrics['elapsed_ms'] = elapsed

    return {
        'move': result.move,

        'board': next_state.board,

        'winner': next_state.winner,

        'to_move': next_state.to_move,

        'metrics': metrics,
    }
