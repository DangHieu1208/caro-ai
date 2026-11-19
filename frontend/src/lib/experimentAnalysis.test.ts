import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    competitorName,
    competitorDescription,

    createOutcomeData,
    createTimingData,
    createSweepData,

    createSummaryCsv,
    createGamesCsv,
    createMovesCsv,

    formatMeasuredTime,
    getCompetitor,
    winnerName,
} from '@/lib/experimentAnalysis'

import {
    createCompetitor,

    type CaseResult,
    type ExperimentResult,
    type GameRecord,
    type MoveRecord,
    type Side,
    type SideSummary,
} from '@/lib/experimentApi'

import type {
    Move,
    Player,
} from '@/lib/game'

function createGame(
    gameNumber: number,
    xSide: Side,
    winner: Player,
): GameRecord {
    const moves: MoveRecord[] = []

    const totalMoves =
        winner === 1 ? 9 : 10

    for (
        let index = 0;
        index < totalMoves;
        index++
    ) {
        const player: Player =
            index % 2 === 0 ? 1 : 2

        const side: Side =
            player === 1
                ? xSide
                : xSide === 'A'
                    ? 'B'
                    : 'A'

        const turn =
            Math.floor(index / 2)

        const move: Move =
            winner === 1
                ? [
                    player - 1,
                    turn,
                ]
                : player === 1
                    ? [0, turn * 2]
                    : [1, turn]

        const isMcts = side === 'A'

        moves.push({
            ply: index + 1,

            player,
            side,

            seed: 100 + index,

            elapsed_ms:
                isMcts ? 0.125 : 2.5,

            result: {
                move,

                nodes:
                    isMcts ? null : 12,

                cutoffs:
                    isMcts ? null : 0,

                iterations:
                    isMcts ? 300 : null,

                depth:
                    isMcts ? null : 2,

                value: -2,
            },
        })
    }

    const winnerSide: Side =
        winner === 1
            ? xSide
            : xSide === 'A'
                ? 'B'
                : 'A'

    return {
        pair_number: 1,

        game_number: gameNumber,

        pair_seed: 123,

        x_side: xSide,

        winner,

        winner_side: winnerSide,

        moves,
    }
}

function summarizeFixture(
    games: GameRecord[],
    side: Side,
): SideSummary {
    const wins = games.filter(
        (game) =>
            game.winner_side === side,
    ).length

    const draws = games.filter(
        (game) =>
            game.winner === 0,
    ).length

    const losses =
        games.length - wins - draws

    const moves = games.flatMap(
        (game) =>
            game.moves.filter(
                (move) =>
                    move.side === side,
            ),
    )

    const totalTime =
        moves.reduce(
            (sum, move) =>
                sum + move.elapsed_ms,
            0,
        )

    return {
        games: games.length,

        wins,
        draws,
        losses,

        win_rate:
            wins / games.length * 100,

        draw_rate:
            draws / games.length * 100,

        loss_rate:
            losses / games.length * 100,

        ai_moves: moves.length,

        total_time_ms: totalTime,

        average_time_ms:
            totalTime / moves.length,
    }
}

function createCase(
    id: string,
    c: number,
    allAWins: boolean,
): CaseResult {
    const competitorA =
        createCompetitor('mcts')

    competitorA.config.c = c

    const competitorB =
        createCompetitor('minimax')

    const games = [
        createGame(
            1,
            'A',
            1,
        ),

        createGame(
            2,
            'B',
            allAWins ? 2 : 1,
        ),
    ]

    return {
        id,

        label: `MCTS c=${c}`,

        result: {
            competitor_a: competitorA,

            competitor_b: competitorB,

            pairs: 1,

            seed: 42,

            games,

            summary_a:
                summarizeFixture(games, 'A'),

            summary_b:
                summarizeFixture(games, 'B'),
        },
    }
}

function createExperiment(
    cases: CaseResult[] = [
        createCase(
            'uct_c_1.4',
            1.4,
            true,
        ),
    ],
): ExperimentResult {
    return {
        job_id: 'test-job',

        scenario: 'uct_c',

        created_at:
            '2026-01-01T00:00:00Z',

        started_at:
            '2026-01-01T00:00:01Z',

        finished_at:
            '2026-01-01T00:00:10Z',

        source_revision:
            'test-revision',

        total_games:
            cases.reduce(
                (sum, item) =>
                    sum + item.result.games.length,
                0,
            ),

        request: {
            scenario: 'uct_c',

            pairs: 1,

            seed: 42,
        },

        environment: {
            python_version: '3.13',

            operating_system: 'Test OS',

            machine: 'x86_64',

            processor: 'Test CPU',

            logical_cpu_count: 12,

            execution_mode: 'sequential',

            timing_method: 'perf_counter',
        },

        cases,
    }
}

function csvRows(
    csv: string,
): Record<string, string>[] {
    // This helper is only used with fixture
    // values that do not contain commas or quotes.
    const [header, ...rows] =
        csv.split('\r\n')

    const columns =
        header.split(',')

    return rows.map((row) => {
        const values =
            row.split(',')

        expect(values).toHaveLength(
            columns.length,
        )

        return Object.fromEntries(
            columns.map(
                (column, index) => [
                    column,
                    values[index],
                ],
            ),
        )
    })
}

describe('Competitor descriptions', () => {
    it('distinguishes plain MiniMax from Alpha-Beta', () => {
        const competitor =
            createCompetitor('minimax')

        expect(
            competitorName(competitor),
        ).not.toBe('MiniMax thuần')

        competitor.config.pruning = false

        expect(
            competitorName(competitor),
        ).toBe('MiniMax thuần')
    })

    it('describes MCTS configuration', () => {
        const competitor =
            createCompetitor('mcts')

        const description =
            competitorDescription(competitor)

        expect(description).toContain(
            'iterations=300',
        )

        expect(description).toContain(
            'c=1.4',
        )

        expect(description).toContain(
            'rollout=random',
        )
    })

    it('describes unlimited candidate selection', () => {
        const competitor =
            createCompetitor('minimax')

        competitor.config.candidate_limit = 0

        expect(
            competitorDescription(competitor),
        ).toContain('limit=unlimited')
    })

    it('retrieves the correct competitor by side', () => {
        const item =
            createCase('test', 1.4, true)

        expect(
            getCompetitor(item, 'A').algorithm,
        ).toBe('mcts')

        expect(
            getCompetitor(item, 'B').algorithm,
        ).toBe('minimax')
    })
})

describe('Experiment chart data', () => {
    it('creates outcome data for both sides', () => {
        const result = createExperiment()

        expect(
            createOutcomeData(result.cases),
        ).toEqual([
            {
                label: 'C1 · A',

                wins: 2,
                draws: 0,
                losses: 0,
            },

            {
                label: 'C1 · B',

                wins: 0,
                draws: 0,
                losses: 2,
            },
        ])
    })

    it('preserves average decision time', () => {
        const result = createExperiment()

        expect(
            createTimingData(result.cases),
        ).toEqual([
            {
                label: 'C1',

                sideA: 0.125,

                sideB: 2.5,
            },
        ])
    })

    it('sorts UCT values numerically', () => {
        const result = createExperiment([
            createCase(
                'uct_c_2.0',
                2,
                true,
            ),

            createCase(
                'uct_c_0.5',
                0.5,
                false,
            ),
        ])

        const data =
            createSweepData(result)

        expect(
            data.map(
                (item) => item.parameter,
            ),
        ).toEqual([
            0.5,
            2,
        ])

        expect(
            data.map(
                (item) => item.winRate,
            ),
        ).toEqual([
            50,
            100,
        ])
    })

    it('sorts iterations numerically', () => {
        const first =
            createCase('iterations_500', 1.4, true)

        const second =
            createCase('iterations_100', 1.4, false)

        first.result.competitor_a.config.iterations =
            500

        second.result.competitor_a.config.iterations =
            100

        const result = createExperiment([
            first,
            second,
        ])

        result.scenario = 'iterations'

        expect(
            createSweepData(result).map(
                (item) => item.parameter,
            ),
        ).toEqual([
            100,
            500,
        ])
    })

    it('does not create sweep data for comparison', () => {
        const result = createExperiment()

        result.scenario = 'comparison'

        expect(
            createSweepData(result),
        ).toEqual([])
    })

    it('preserves missing timing values', () => {
        const result = createExperiment()

        const summary =
            result.cases[0].result.summary_b

        summary.average_time_ms = null

        expect(
            createTimingData(result.cases)[0].sideB,
        ).toBeNull()
    })
})

describe('Experiment formatting', () => {
    it('distinguishes unavailable and zero metrics', () => {
        expect(
            formatMeasuredTime(null),
        ).toBe('—')

        expect(
            formatMeasuredTime(0),
        ).toBe('0 ms')
    })

    it('identifies the winner by side and symbol', () => {
        expect(
            winnerName(
                createGame(1, 'A', 1),
            ),
        ).toBe('A (X)')

        expect(
            winnerName(
                createGame(2, 'B', 2),
            ),
        ).toBe('A (O)')
    })
})

describe('Experiment CSV exports', () => {
    it('exports two summary rows per case', () => {
        const result = createExperiment([
            createCase('case1', 0.5, false),

            createCase('case2', 1.4, true),
        ])

        const rows = csvRows(
            createSummaryCsv(result),
        )

        expect(rows).toHaveLength(4)

        expect(
            rows.map(
                (row) => row.side,
            ),
        ).toEqual([
            'A',
            'B',
            'A',
            'B',
        ])
    })

    it('exports relevant algorithm parameters', () => {
        const rows = csvRows(
            createSummaryCsv(
                createExperiment(),
            ),
        )

        expect(rows[0].algorithm).toBe('mcts')

        expect(
            rows[0].configured_iterations,
        ).toBe('300')

        expect(rows[0].uct_c).toBe('1.4')

        expect(
            rows[0].configured_depth,
        ).toBe('')

        expect(
            rows[1].algorithm,
        ).toBe('minimax')

        expect(
            rows[1].configured_depth,
        ).toBe('2')

        expect(
            rows[1].pruning,
        ).toBe('true')

        expect(
            rows[1].configured_iterations,
        ).toBe('')
    })

    it('exports paired games with correct winner attribution', () => {
        const rows = csvRows(
            createGamesCsv(
                createExperiment(),
            ),
        )

        expect(rows).toHaveLength(2)

        expect(
            rows.map(
                (row) => row.x_side,
            ),
        ).toEqual([
            'A',
            'B',
        ])

        expect(
            rows.map(
                (row) => row.winner_side,
            ),
        ).toEqual([
            'A',
            'A',
        ])

        expect(
            rows.map(
                (row) => row.winner_player,
            ),
        ).toEqual([
            'X',
            'O',
        ])
    })

    it('exports every AI decision', () => {
        const result = createExperiment()

        const rows = csvRows(
            createMovesCsv(result),
        )

        expect(rows).toHaveLength(19)

        const item = result.cases[0]

        expect(rows.length).toBe(
            item.result.summary_a.ai_moves +
            item.result.summary_b.ai_moves,
        )
    })

    it('preserves raw metrics and missing values', () => {
        const rows = csvRows(
            createMovesCsv(
                createExperiment(),
            ),
        )

        const mctsRow =
            rows.find(
                (row) => row.algorithm === 'mcts',
            )!

        const minimaxRow =
            rows.find(
                (row) => row.algorithm === 'minimax',
            )!

        expect(mctsRow.elapsed_ms).toBe('0.125')

        expect(mctsRow.nodes).toBe('')

        expect(
            mctsRow.iterations_executed,
        ).toBe('300')

        expect(
            minimaxRow.nodes,
        ).toBe('12')

        expect(
            minimaxRow.cutoffs,
        ).toBe('0')

        expect(
            minimaxRow.evaluation,
        ).toBe('-2')
    })

    it('keeps game time consistent with the summary', () => {
        const result = createExperiment()

        const rows = csvRows(
            createGamesCsv(result),
        )

        const totalA =
            rows.reduce(
                (sum, row) =>
                    sum + Number(row.time_a_ms),
                0,
            )

        const totalB =
            rows.reduce(
                (sum, row) =>
                    sum + Number(row.time_b_ms),
                0,
            )

        expect(totalA).toBeCloseTo(
            result.cases[0].result
                .summary_a.total_time_ms,
        )

        expect(totalB).toBeCloseTo(
            result.cases[0].result
                .summary_b.total_time_ms,
        )
    })

    it('escapes CSV special characters', () => {
        const result = createExperiment()

        result.cases[0].label =
            'MCTS, "Test"'

        const csv = createSummaryCsv(
            result,
        )

        expect(csv).toContain(
            '"MCTS, ""Test"""',
        )
    })

    it('protects against spreadsheet formula injection', () => {
        const result = createExperiment()

        result.source_revision =
            '=1+1'

        expect(
            createSummaryCsv(result),
        ).toContain("'=1+1")
    })
})
