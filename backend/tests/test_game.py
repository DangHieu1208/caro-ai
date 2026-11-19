import pytest
from app.core.game import GameState, has_five
from app.agents.base import AgentConfig
from app.agents.random_agent import RandomAgent


def test_initial():
    s = GameState.initial()
    assert len(s.legal_moves()) == 81 and s.to_move == 1


def test_immutable_and_occupied():
    s = GameState.initial()
    t = s.play((4, 4))
    assert s.board[4][4] == 0 and t.board[4][4] == 1 and t.to_move == 2
    with pytest.raises(ValueError):
        t.play((4, 4))


@pytest.mark.parametrize('dr,dc,start', [(0,1,(4,1)),(1,0,(1,4)),(1,1,(1,1)),(1,-1,(1,7))])
def test_six_in_a_row(dr, dc, start):
    board = [[0] * 9 for _ in range(9)]
    for i in range(6):
        board[start[0]+i*dr][start[1]+i*dc] = 1
    assert has_five(tuple(map(tuple, board)), *start)


def test_win_stops_play():
    s = GameState.initial()
    for col in range(4):
        s = s.play((4,col)).play((0,col))
    s = s.play((4,4))
    assert s.winner == 1 and not s.legal_moves()
    with pytest.raises(ValueError):
        s.play((1,1))


def test_random_repeatable():
    s = GameState.initial()
    agent = RandomAgent()
    a = agent.choose_move(s, AgentConfig(seed=42))
    assert a.move in s.legal_moves() and a == agent.choose_move(s, AgentConfig(seed=42))


def test_invalid_count():
    b = [[0]*9 for _ in range(9)]
    b[0][0] = 2
    with pytest.raises(ValueError):
        GameState.from_board(b)


def test_draw_pattern():
    # Alternating two-column bands shifted each row; no 5 contiguous stones.
    b = [[1 if (r+2*c)%4<2 else 2 for c in range(9)] for r in range(9)]
    # This pattern has no 5, and exactly 41 X / 40 O.
    s = GameState.from_board(b)
    assert s.winner == 0
