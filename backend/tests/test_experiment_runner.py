import pytest

from app.agents.base import AgentConfig, SearchResult
from app.agents.registry import AGENTS
from app.core.game import GameState
from app.experiments.runner import Competitor, run_experiment


def random_competitor():
    return Competitor(
        'random',
        AgentConfig(),
    )


def test_paired_games():
    result = run_experiment(
        random_competitor(),
        random_competitor(),
        pairs=2,
    )

    assert len(result.games) == 4

    for i in range(0, 4, 2):
        first, second = result.games[i:i + 2]

        assert (
            first.x_side,
            second.x_side,
        ) == ('A', 'B')

        assert first.pair_seed == second.pair_seed

        assert (
            first.pair_number
            == second.pair_number
        )

        for side in ('A', 'B'):
            a = [
                move.seed
                for move in first.moves
                if move.side == side
            ]

            b = [
                move.seed
                for move in second.moves
                if move.side == side
            ]

            common = min(
                len(a),
                len(b),
            )

            assert a[:common] == b[:common]


def test_all_moves_are_legal_and_games_finish():
    result = run_experiment(
        random_competitor(),
        random_competitor(),
        pairs=2,
    )

    for record in result.games:
        state = GameState.initial()

        for ply, move in enumerate(
            record.moves,
            start=1,
        ):
            assert move.ply == ply

            assert (
                move.player
                == state.to_move
            )

            assert (
                move.result.move
                in state.legal_moves()
            )

            assert move.elapsed_ms >= 0

            state = state.play(
                move.result.move
            )

        assert state.winner is not None

        assert state.winner == record.winner

        assert len(record.moves) <= 81

        assert record.winner_side == (
            None
            if state.winner == 0
            else record.x_side
            if state.winner == 1
            else 'B'
            if record.x_side == 'A'
            else 'A'
        )


def test_summary_consistency():
    result = run_experiment(
        random_competitor(),
        random_competitor(),
        pairs=3,
    )

    a = result.summary_a
    b = result.summary_b

    assert a.wins == b.losses

    assert b.wins == a.losses

    assert a.draws == b.draws

    for summary in (a, b):
        assert (
            summary.wins
            + summary.draws
            + summary.losses
            == 6
        )

        assert (
            summary.win_rate
            + summary.draw_rate
            + summary.loss_rate
            == pytest.approx(100)
        )

        assert (
            summary.average_time_ms
            == pytest.approx(
                summary.total_time_ms
                / summary.ai_moves
            )
        )

    assert a.ai_moves + b.ai_moves == sum(
        len(game.moves)
        for game in result.games
    )


def test_reproducible_seed():
    def signature(result):
        return [
            (
                game.pair_seed,
                game.winner,
                [
                    (
                        move.seed,
                        move.result.move,
                    )
                    for move in game.moves
                ],
            )
            for game in result.games
        ]

    a = run_experiment(
        random_competitor(),
        random_competitor(),
        pairs=2,
        seed=123,
    )

    b = run_experiment(
        random_competitor(),
        random_competitor(),
        pairs=2,
        seed=123,
    )

    assert signature(a) == signature(b)


def test_winner_attribution_when_x_always_wins(
    monkeypatch,
):
    class ScriptedAgent:
        def choose_move(self, state, config):
            row = state.to_move - 1

            return SearchResult(
                move=(
                    row,
                    state.board[row].index(0),
                )
            )

    monkeypatch.setitem(
        AGENTS,
        'scripted',
        (ScriptedAgent, True),
    )

    competitor = Competitor(
        'scripted',
        AgentConfig(),
    )

    result = run_experiment(
        competitor,
        competitor,
        pairs=1,
    )

    assert [
        game.winner
        for game in result.games
    ] == [1, 1]

    assert [
        game.winner_side
        for game in result.games
    ] == ['A', 'B']

    assert (
        result.summary_a.wins
        == result.summary_b.wins
        == 1
    )


@pytest.mark.parametrize(
    'pairs',
    [0, -1, 1.5, True],
)
def test_invalid_pairs(pairs):
    with pytest.raises(
        ValueError,
        match='pairs',
    ):
        run_experiment(
            random_competitor(),
            random_competitor(),
            pairs=pairs,
        )


def test_unknown_agent():
    with pytest.raises(
        ValueError,
        match='Unknown algorithm',
    ):
        run_experiment(
            Competitor(
                'unknown',
                AgentConfig(),
            ),
            random_competitor(),
        )


def test_unready_agent(monkeypatch):
    agent_class, _ = AGENTS['mcts']

    monkeypatch.setitem(
        AGENTS,
        'mcts',
        (agent_class, False),
    )

    with pytest.raises(
        ValueError,
        match='not ready',
    ):
        run_experiment(
            Competitor(
                'mcts',
                AgentConfig(),
            ),
            random_competitor(),
        )


def test_competitor_seed_rejected():
    with pytest.raises(
        ValueError,
        match='experiment seed',
    ):
        run_experiment(
            Competitor(
                'random',
                AgentConfig(seed=1),
            ),
            random_competitor(),
        )


def test_illegal_move_rejected(monkeypatch):
    class BrokenAgent:
        def choose_move(self, state, config):
            return SearchResult(
                move=(-1, -1)
            )

    monkeypatch.setitem(
        AGENTS,
        'broken',
        (BrokenAgent, True),
    )

    with pytest.raises(
        ValueError,
        match='Illegal move',
    ):
        run_experiment(
            Competitor(
                'broken',
                AgentConfig(),
            ),
            random_competitor(),
            pairs=1,
        )
