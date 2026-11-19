from dataclasses import dataclass

SIZE = 9
Move = tuple[int, int]
Board = tuple[tuple[int, ...], ...]


def other(player: int) -> int:
    return 3 - player


def has_five(board: Board, row: int, col: int) -> bool:
    player = board[row][col]
    if not player:
        return False
    for dr, dc in ((1, 0), (0, 1), (1, 1), (1, -1)):
        count = 1
        for sign in (-1, 1):
            r, c = row + sign * dr, col + sign * dc
            while 0 <= r < SIZE and 0 <= c < SIZE and board[r][c] == player:
                count += 1
                r, c = r + sign * dr, c + sign * dc
        if count >= 5:
            return True
    return False


@dataclass(frozen=True, slots=True)
class GameState:
    board: Board
    to_move: int
    winner: int | None  # None: ongoing, 0: draw, 1: X, 2: O

    @classmethod
    def from_board(cls, board: list[list[int]] | Board) -> 'GameState':
        if len(board) != SIZE or any(len(row) != SIZE for row in board):
            raise ValueError('Board must be 9 × 9')
        b = tuple(tuple(row) for row in board)
        if any(type(cell) is not int or cell not in (0, 1, 2) for row in b for cell in row):
            raise ValueError('Cells must be 0, 1, or 2')
        nx = sum(row.count(1) for row in b)
        no = sum(row.count(2) for row in b)
        if nx not in (no, no + 1):
            raise ValueError('Invalid X/O counts')
        winners = {b[r][c] for r in range(SIZE) for c in range(SIZE) if has_five(b, r, c)}
        if len(winners) > 1 or (1 in winners and nx != no + 1) or (2 in winners and nx != no):
            raise ValueError('Inconsistent winning board')
        winner = next(iter(winners), 0 if nx + no == SIZE * SIZE else None)
        return cls(b, 1 if nx == no else 2, winner)

    @classmethod
    def initial(cls) -> 'GameState':
        return cls(tuple((0,) * SIZE for _ in range(SIZE)), 1, None)

    def legal_moves(self) -> list[Move]:
        if self.winner is not None:
            return []
        return [(r, c) for r in range(SIZE) for c in range(SIZE) if self.board[r][c] == 0]

    def play(self, move: Move) -> 'GameState':
        r, c = move
        if self.winner is not None or not (0 <= r < SIZE and 0 <= c < SIZE) or self.board[r][c] != 0:
            raise ValueError('Illegal move')
        row = self.board[r][:c] + (self.to_move,) + self.board[r][c + 1:]
        board = self.board[:r] + (row,) + self.board[r + 1:]
        winner = self.to_move if has_five(board, r, c) else (0 if all(all(row) for row in board) else None)
        return GameState(board, other(self.to_move), winner)
