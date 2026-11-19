from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def payload():
    return {'board': [[0]*9 for _ in range(9)], 'player': 1, 'algorithm': 'random', 'config': {'seed': 42}}


def test_move_endpoint():
    res = client.post('/api/move', json=payload())
    assert res.status_code == 200
    data = res.json()
    r, c = data['move']
    assert data['board'][r][c] == 1 and data['to_move'] == 2 and data['winner'] is None
    assert data['metrics']['elapsed_ms'] >= 0


def test_not_integrated():
    p = payload(); p['algorithm'] = 'mcts'
    assert client.post('/api/move', json=p).status_code == 501


def test_out_of_turn():
    p = payload(); p['player'] = 2
    assert client.post('/api/move', json=p).status_code == 422


def test_registry():
    assert {a['id']: a['ready'] for a in client.get('/api/agents').json()} == {'random': True, 'minimax': False, 'mcts': False}
