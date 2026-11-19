import { readFileSync } from 'node:fs'

import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    initialGame,
    play,
    winningLine,

    type Board,
    type Game,
    type Move,
    type Player,
    type Cell,
    type Winner,
} from '@/lib/game'

interface GameFixture {
    id: string

    moves: Move[]

    rejected_steps: number[]

    terminal_step: number | null

    winner: Winner
}

const fixturePath = new URL(
    '../../../shared/fixtures/game_cases.json',

    import.meta.url,
)

const cases = JSON.parse(
    readFileSync(
        fixturePath,
        'utf-8',
    ),
) as GameFixture[]

function assertState(
    game: Game,
    expectedBoard: Board,
    expectedTurn: Player,
    expectedWinner: Winner,
) {
    expect(
        game.board,
    ).toEqual(expectedBoard)

    expect(
        game.to_move,
    ).toBe(expectedTurn)

    expect(
        game.winner,
    ).toBe(expectedWinner)
}

describe('Shared game engine fixtures', () => {
    it.each(cases)(
        '$id',

        (testCase) => {
            let game = initialGame()

            const expectedBoard: Board =
                Array.from(
                    { length: 9 },

                    () => Array<Cell>(9).fill(0),
                )

            let expectedTurn: Player = 1

            let expectedWinner: Winner = null

            const rejectedSteps = new Set(
                testCase.rejected_steps,
            )

            assertState(
                game,
                expectedBoard,
                expectedTurn,
                expectedWinner,
            )

            for (
                const [index, move]
                of testCase.moves.entries()
                ) {
                const step = index + 1

                const [row, col] = move

                const previousGame = game

                const previousSnapshot =
                    JSON.stringify(previousGame)

                const next = play(
                    game,
                    move,
                )

                const rejected =
                    rejectedSteps.has(step)

                if (rejected) {
                    // TypeScript rejects an invalid
                    // move by returning the old state.
                    expect(next).toBe(
                        previousGame,
                    )
                } else {
                    expect(next).not.toBe(
                        previousGame,
                    )

                    // Build the expected board independently
                    // of the game engine.
                    expect(
                        expectedBoard[row][col],
                    ).toBe(0)

                    expectedBoard[row][col] =
                        expectedTurn

                    expectedTurn =
                        expectedTurn === 1 ? 2 : 1
                }

                expectedWinner =
                    testCase.terminal_step !== null &&
                    step >= testCase.terminal_step

                        ? testCase.winner

                        : null

                assertState(
                    next,
                    expectedBoard,
                    expectedTurn,
                    expectedWinner,
                )

                // Verify that the previous game state
                // has not been mutated.
                expect(
                    JSON.stringify(previousGame),
                ).toBe(previousSnapshot)

                if (!rejected) {
                    const line = winningLine(
                        next.board,
                        row,
                        col,
                    )

                    if (
                        expectedWinner === 1 ||
                        expectedWinner === 2
                    ) {
                        expect(
                            line.length,
                        ).toBeGreaterThanOrEqual(5)

                        expect(line).toContainEqual(
                            move,
                        )

                        for (
                            const [winRow, winCol]
                            of line
                            ) {
                            expect(
                                next.board[winRow][winCol],
                            ).toBe(expectedWinner)
                        }
                    } else {
                        expect(line).toEqual([])
                    }
                }

                game = next
            }

            expect(
                game.winner,
            ).toBe(testCase.winner)
        },
    )
})
