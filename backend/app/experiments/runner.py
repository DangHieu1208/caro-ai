from dataclasses import dataclass, replace
from random import Random
from time import perf_counter
from typing import Literal

from app.agents.base import AgentConfig, SearchResult
from app.agents.registry import AGENTS
from app.core.game import GameState


Side = Literal['A', 'B']


@dataclass(frozen=True, slots=True)
class Competitor:
    algorithm: str
    config: AgentConfig


@dataclass(frozen=True, slots=True)
class MoveRecord:
    ply: int
    player: int
    side: Side
    seed: int
    elapsed_ms: float
    result: SearchResult


@dataclass(frozen=True, slots=True)
class GameRecord:
    pair_number: int
    game_number: int
    pair_seed: int
    x_side: Side
    winner: int
    winner_side: Side | None
    moves: tuple[MoveRecord, ...]


@dataclass(frozen=True, slots=True)
class SideSummary:
    games: int
    wins: int
    draws: int
    losses: int
    win_rate: float
    draw_rate: float
    loss_rate: float
    ai_moves: int
    total_time_ms: float
    average_time_ms: float | None


@dataclass(frozen=True, slots=True)
class ExperimentResult:
    competitor_a: Competitor
    competitor_b: Competitor
    pairs: int
    seed: int
    games: tuple[GameRecord, ...]
    summary_a: SideSummary
    summary_b: SideSummary


def _validate_competitor(
    competitor: Competitor,
) -> None:
    if competitor.algorithm not in AGENTS:
        raise ValueError(
            f'Unknown algorithm: {competitor.algorithm}'
        )

    if not AGENTS[competitor.algorithm][1]:
        raise ValueError(
            f'Algorithm not ready: {competitor.algorithm}'
        )

    if competitor.config.seed is not None:
        raise ValueError(
            'Use the experiment seed, not a competitor seed'
        )


def _other_side(side: Side) -> Side:
    return 'B' if side == 'A' else 'A'


def _play_game(
    competitor_a: Competitor,
    competitor_b: Competitor,
    pair_number: int,
    game_number: int,
    pair_seed: int,
    x_side: Side,
) -> GameRecord:
    competitors = {
        'A': competitor_a,
        'B': competitor_b,
    }

    # Recreate the same random streams
    # when the competitors swap sides.
    pair_rng = Random(pair_seed)

    streams = {
        'A': Random(pair_rng.getrandbits(53)),
        'B': Random(pair_rng.getrandbits(53)),
    }

    state = GameState.initial()

    moves: list[MoveRecord] = []

    while state.winner is None:
        player = state.to_move

        side = (
            x_side
            if player == 1
            else _other_side(x_side)
        )

        competitor = competitors[side]

        # Generate a reproducible seed
        # for this decision.
        move_seed = streams[side].getrandbits(53)

        config = replace(
            competitor.config,
            seed=move_seed,
        )

        agent_class, _ = AGENTS[
            competitor.algorithm
        ]

        agent = agent_class()

        # Measure search time only.
        start = perf_counter()

        result = agent.choose_move(
            state,
            config,
        )

        elapsed_ms = (
            perf_counter() - start
        ) * 1000

        # Reject an illegal move.
        if result.move not in state.legal_moves():
            raise ValueError(
                f'Illegal move from {side}: {result.move}'
            )

        state = state.play(
            result.move
        )

        moves.append(
            MoveRecord(
                ply=len(moves) + 1,
                player=player,
                side=side,
                seed=move_seed,
                elapsed_ms=elapsed_ms,
                result=result,
            )
        )

    winner = state.winner

    winner_side = (
        None
        if winner == 0
        else x_side
        if winner == 1
        else _other_side(x_side)
    )

    return GameRecord(
        pair_number=pair_number,
        game_number=game_number,
        pair_seed=pair_seed,
        x_side=x_side,
        winner=winner,
        winner_side=winner_side,
        moves=tuple(moves),
    )


def summarize(
    games: tuple[GameRecord, ...],
    side: Side,
) -> SideSummary:
    total = len(games)

    wins = sum(
        game.winner_side == side
        for game in games
    )

    draws = sum(
        game.winner == 0
        for game in games
    )

    losses = total - wins - draws

    times = [
        move.elapsed_ms
        for game in games
        for move in game.moves
        if move.side == side
    ]

    total_time = sum(times, 0.0)

    return SideSummary(
        games=total,

        wins=wins,

        draws=draws,

        losses=losses,

        win_rate=(
            100 * wins / total
            if total
            else 0.0
        ),

        draw_rate=(
            100 * draws / total
            if total
            else 0.0
        ),

        loss_rate=(
            100 * losses / total
            if total
            else 0.0
        ),

        ai_moves=len(times),

        total_time_ms=total_time,

        average_time_ms=(
            total_time / len(times)
            if times
            else None
        ),
    )


def run_experiment(
    competitor_a: Competitor,
    competitor_b: Competitor,
    pairs: int = 10,
    seed: int = 42,
) -> ExperimentResult:
    if type(pairs) is not int or pairs < 1:
        raise ValueError(
            'pairs must be a positive integer'
        )

    if type(seed) is not int:
        raise ValueError(
            'seed must be an integer'
        )

    _validate_competitor(
        competitor_a
    )

    _validate_competitor(
        competitor_b
    )

    master_rng = Random(seed)

    records: list[GameRecord] = []

    for pair_number in range(
        1,
        pairs + 1,
    ):
        pair_seed = master_rng.getrandbits(53)

        # Game 1: A plays X.
        # Game 2: B plays X.
        for x_side in ('A', 'B'):
            records.append(
                _play_game(
                    competitor_a=competitor_a,
                    competitor_b=competitor_b,
                    pair_number=pair_number,
                    game_number=len(records) + 1,
                    pair_seed=pair_seed,
                    x_side=x_side,
                )
            )

    games = tuple(records)

    return ExperimentResult(
        competitor_a=competitor_a,
        competitor_b=competitor_b,
        pairs=pairs,
        seed=seed,
        games=games,

        summary_a=summarize(
            games,
            'A',
        ),

        summary_b=summarize(
            games,
            'B',
        ),
    )
