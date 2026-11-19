import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    initialGame,
    play,
    symbol,
    winningLine,

    type Game,
    type Move,
} from '@/lib/game'

function replay(
    moves: readonly Move[],
): Game {
    let game = initialGame()

    for (const move of moves) {
        const next = play(game, move)

        expect(next).not.toBe(game)

        game = next
    }

    return game
}

function createWinningGame(
    xMoves: Move[],
): Game {
    const oMoves: Move[] = [
        [8, 0],
        [8, 2],
        [8, 4],
        [8, 6],
    ]

    const moves: Move[] = []

    for (let index = 0; index < xMoves.length; index++) {
        moves.push(xMoves[index])

        if (index < oMoves.length) {
            moves.push(oMoves[index])
        }
    }

    return replay(moves)
}

describe('Game initialization', () => {
    it('creates an empty 9x9 board', () => {
        const game = initialGame()

        expect(game.board).toHaveLength(9)

        expect(
            game.board.every(
                (row) =>
                    row.length === 9 &&
                    row.every((cell) => cell === 0),
            ),
        ).toBe(true)

        expect(game.to_move).toBe(1)

        expect(game.winner).toBeNull()
    })

    it('creates independent game instances', () => {
        const first = initialGame()
        const second = initialGame()

        expect(first).not.toBe(second)

        expect(first.board).not.toBe(
            second.board,
        )

        expect(first.board[0]).not.toBe(
            first.board[1],
        )

        const next = play(first, [4, 4])

        expect(next.board[4][4]).toBe(1)

        expect(second.board[4][4]).toBe(0)
    })

    it('maps player symbols correctly', () => {
        expect(symbol(1)).toBe('X')
        expect(symbol(2)).toBe('O')
    })
})

describe('Playing moves', () => {
    it('alternates between X and O', () => {
        const first = initialGame()

        const second = play(
            first,
            [4, 4],
        )

        expect(second.board[4][4]).toBe(1)

        expect(second.to_move).toBe(2)

        const third = play(
            second,
            [4, 5],
        )

        expect(third.board[4][5]).toBe(2)

        expect(third.to_move).toBe(1)
    })

    it('does not mutate the previous state', () => {
        const original = initialGame()

        const snapshot = JSON.stringify(
            original,
        )

        const next = play(
            original,
            [4, 4],
        )

        expect(next).not.toBe(original)

        expect(
            JSON.stringify(original),
        ).toBe(snapshot)

        expect(original.board[4][4]).toBe(0)
    })

    it('rejects an occupied cell', () => {
        const game = play(
            initialGame(),
            [4, 4],
        )

        const next = play(
            game,
            [4, 4],
        )

        expect(next).toBe(game)

        expect(next.to_move).toBe(2)

        expect(next.board[4][4]).toBe(1)
    })

    const invalidMoves: Move[] = [
        [-1, 4],
        [9, 4],
        [4, -1],
        [4, 9],
    ]

    it.each(invalidMoves)(
        'rejects out-of-bounds move (%i, %i)',
        (row, col) => {
            const game = initialGame()

            expect(
                play(game, [row, col]),
            ).toBe(game)
        },
    )

    it('does not declare four stones a win', () => {
        const game = replay([
            [4, 1],
            [0, 0],

            [4, 2],
            [0, 2],

            [4, 3],
            [0, 4],

            [4, 4],
        ])

        expect(game.winner).toBeNull()

        expect(
            winningLine(
                game.board,
                4,
                4,
            ),
        ).toEqual([])
    })
})

describe('Winning conditions', () => {
    const directions: {
        name: string
        moves: Move[]
    }[] = [
        {
            name: 'horizontal',

            moves: [
                [4, 0],
                [4, 1],
                [4, 2],
                [4, 3],
                [4, 4],
            ],
        },

        {
            name: 'vertical',

            moves: [
                [0, 4],
                [1, 4],
                [2, 4],
                [3, 4],
                [4, 4],
            ],
        },

        {
            name: 'main diagonal',

            moves: [
                [0, 0],
                [1, 1],
                [2, 2],
                [3, 3],
                [4, 4],
            ],
        },

        {
            name: 'anti diagonal',

            moves: [
                [0, 8],
                [1, 7],
                [2, 6],
                [3, 5],
                [4, 4],
            ],
        },
    ]

    it.each(directions)(
        'detects a $name win',
        ({ moves }) => {
            const game =
                createWinningGame(moves)

            expect(game.winner).toBe(1)

            const [row, col] =
                moves[moves.length - 1]

            const line = winningLine(
                game.board,
                row,
                col,
            )

            expect(line).toHaveLength(5)

            expect(line).toEqual(
                expect.arrayContaining(moves),
            )
        },
    )

    it('detects an O victory', () => {
        const game = replay([
            [0, 0],
            [4, 0],

            [0, 2],
            [4, 1],

            [0, 4],
            [4, 2],

            [0, 6],
            [4, 3],

            [0, 8],
            [4, 4],
        ])

        expect(game.winner).toBe(2)
    })

    it('allows a five-in-a-row blocked at both ends', () => {
        const game = replay([
            [4, 2],
            [4, 1],

            [4, 3],
            [4, 7],

            [4, 4],
            [0, 0],

            [4, 5],
            [0, 2],

            [4, 6],
        ])

        expect(game.winner).toBe(1)

        expect(
            winningLine(
                game.board,
                4,
                6,
            ),
        ).toHaveLength(5)
    })

    it('treats six consecutive stones as a victory', () => {
        const game = replay([
            [4, 0],
            [8, 0],

            [4, 1],
            [8, 2],

            [4, 2],
            [8, 4],

            [4, 4],
            [8, 6],

            [4, 5],
            [8, 8],

            [4, 3],
        ])

        expect(game.winner).toBe(1)

        expect(
            winningLine(
                game.board,
                4,
                3,
            ),
        ).toHaveLength(6)
    })

    it('rejects additional moves after a victory', () => {
        const game = createWinningGame([
            [4, 0],
            [4, 1],
            [4, 2],
            [4, 3],
            [4, 4],
        ])

        expect(game.winner).toBe(1)

        expect(
            play(game, [0, 0]),
        ).toBe(game)
    })
})

describe('Draw conditions', () => {
    it('detects a full board without five consecutive stones', () => {
        const xMoves: Move[] = []

        const oMoves: Move[] = []

        // Construct a full board without a
        // five-in-a-row in any direction.
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const move: Move = [
                    row,
                    col,
                ]

                const player =
                    1 + (
                        (row + Math.floor(col / 2)) % 2
                    )

                if (player === 1) {
                    xMoves.push(move)
                } else {
                    oMoves.push(move)
                }
            }
        }

        expect(xMoves).toHaveLength(41)

        expect(oMoves).toHaveLength(40)

        let game = initialGame()

        for (let index = 0; index < 40; index++) {
            game = play(
                game,
                xMoves[index],
            )

            expect(game.winner).toBeNull()

            game = play(
                game,
                oMoves[index],
            )

            expect(game.winner).toBeNull()
        }

        game = play(
            game,
            xMoves[40],
        )

        expect(game.winner).toBe(0)

        expect(
            game.board.every(
                (row) =>
                    row.every(
                        (cell) => cell !== 0,
                    ),
            ),
        ).toBe(true)

        expect(
            play(game, [0, 0]),
        ).toBe(game)
    })
})
