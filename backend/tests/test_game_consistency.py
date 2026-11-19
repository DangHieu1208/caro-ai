import json
from pathlib import Path

import pytest

from app.core.game import GameState


FIXTURE_PATH = (
    Path(__file__).resolve().parents[2]
    / 'shared'
    / 'fixtures'
    / 'game_cases.json'
)


CASES = json.loads(
    FIXTURE_PATH.read_text(
        encoding='utf-8'
    )
)


def assert_state(
    state,
    expected_board,
    expected_turn,
    expected_winner,
):
    expected = tuple(
        tuple(row)
        for row in expected_board
    )

    assert state.board == expected

    assert state.to_move == expected_turn

    assert state.winner == expected_winner

    # Verify that reconstructing a state from
    # its board produces the same result.
    reconstructed = GameState.from_board(
        expected_board
    )

    assert reconstructed == state

    # Verify the legal move list.
    expected_legal_moves = (
        {
            (row, col)

            for row in range(9)

            for col in range(9)

            if expected_board[row][col] == 0
        }

        if expected_winner is None

        else set()
    )

    legal_moves = state.legal_moves()

    assert set(
        legal_moves
    ) == expected_legal_moves

    assert len(
        legal_moves
    ) == len(expected_legal_moves)


@pytest.mark.parametrize(
    'case',
    CASES,
    ids=[
        case['id']
        for case in CASES
    ],
)
def test_shared_game_fixture(case):
    state = GameState.initial()

    expected_board = [
        [0 for _ in range(9)]

        for _ in range(9)
    ]

    expected_turn = 1

    expected_winner = None

    rejected_steps = set(
        case['rejected_steps']
    )

    terminal_step = case['terminal_step']

    assert_state(
        state,
        expected_board,
        expected_turn,
        expected_winner,
    )

    for step, raw_move in enumerate(
        case['moves'],
        start=1,
    ):
        move = tuple(raw_move)

        row, col = move

        previous_state = state

        previous_board = state.board

        previous_turn = state.to_move

        previous_winner = state.winner

        if step in rejected_steps:
            # Python rejects an invalid move
            # by raising ValueError.
            with pytest.raises(
                ValueError,
                match='Illegal move',
            ):
                state.play(move)

            assert state is previous_state

        else:
            state = state.play(move)

            assert state is not previous_state

            # Build the expected board independently
            # of the game engine.
            assert expected_board[row][col] == 0

            expected_board[row][col] = (
                expected_turn
            )

            expected_turn = (
                2 if expected_turn == 1 else 1
            )

        # The expected terminal step comes
        # directly from the shared fixture.
        expected_winner = (
            case['winner']

            if (
                terminal_step is not None

                and step >= terminal_step
            )

            else None
        )

        assert_state(
            state,
            expected_board,
            expected_turn,
            expected_winner,
        )

        # Previous states must remain immutable.
        assert (
            previous_state.board
            == previous_board
        )

        assert (
            previous_state.to_move
            == previous_turn
        )

        assert (
            previous_state.winner
            == previous_winner
        )

    assert state.winner == case['winner']
