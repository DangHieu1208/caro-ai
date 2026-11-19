import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    calculateStatistics,
    createMatchCsv,
    formatNumber,
    formatTime,

    type MoveLog,
} from '@/lib/statistics'

import type {
    Config,
    Metrics,
} from '@/lib/api'

const config: Config = {
    depth: 2,
    candidate_limit: 10,
    pruning: true,

    iterations: 300,
    c: 1.4,

    rollout: 'random',
}

function metrics(
    elapsed_ms: number,
    changes: Partial<Metrics> = {},
): Metrics {
    return {
        elapsed_ms,

        nodes: null,
        cutoffs: null,
        iterations: null,
        depth: null,
        value: null,

        ...changes,
    }
}

function createLogs(): MoveLog[] {
    return [
        {
            player: 1,
            move: [4, 4],

            algorithm: 'Người chơi',
            algorithmId: 'human',
        },

        {
            player: 2,
            move: [4, 5],

            algorithm: 'MiniMax + Alpha-Beta',
            algorithmId: 'minimax',

            config: {
                ...config,
            },

            metrics: metrics(
                10,
                {
                    nodes: 100,
                    cutoffs: 5,
                    depth: 2,
                    value: 20,
                },
            ),
        },

        {
            player: 1,
            move: [5, 4],

            algorithm: 'Người chơi',
            algorithmId: 'human',
        },

        {
            player: 2,
            move: [3, 4],

            algorithm: 'MiniMax + Alpha-Beta',
            algorithmId: 'minimax',

            config: {
                ...config,
            },

            metrics: metrics(
                30,
                {
                    nodes: 150,
                    cutoffs: 10,
                    depth: 2,
                    value: 50,
                },
            ),
        },
    ]
}

describe('Match statistics', () => {
    it('returns empty statistics for a new match', () => {
        expect(
            calculateStatistics([]),
        ).toEqual({
            totalMoves: 0,
            aiMoves: 0,

            totalTime: null,
            averageTime: null,
            minTime: null,
            maxTime: null,

            lastMetrics: null,
        })
    })

    it('calculates statistics using AI decisions only', () => {
        const logs = createLogs()

        const result =
            calculateStatistics(logs)

        expect(result.totalMoves).toBe(4)

        expect(result.aiMoves).toBe(2)

        expect(result.totalTime).toBe(40)

        expect(result.averageTime).toBe(20)

        expect(result.minTime).toBe(10)

        expect(result.maxTime).toBe(30)

        expect(
            result.lastMetrics?.nodes,
        ).toBe(150)
    })

    it('calculates human statistics separately', () => {
        const result = calculateStatistics(
            createLogs(),
            1,
        )

        expect(result.totalMoves).toBe(2)

        expect(result.aiMoves).toBe(0)

        expect(result.totalTime).toBeNull()

        expect(result.averageTime).toBeNull()

        expect(result.lastMetrics).toBeNull()
    })

    it('calculates AI statistics separately', () => {
        const result = calculateStatistics(
            createLogs(),
            2,
        )

        expect(result.totalMoves).toBe(2)

        expect(result.aiMoves).toBe(2)

        expect(result.totalTime).toBe(40)

        expect(result.averageTime).toBe(20)

        expect(
            result.lastMetrics?.cutoffs,
        ).toBe(10)
    })

    it('preserves a measured zero', () => {
        const logs: MoveLog[] = [
            {
                player: 1,
                move: [4, 4],

                algorithm: 'Random',
                algorithmId: 'random',

                metrics: metrics(0),
            },
        ]

        const result =
            calculateStatistics(logs)

        expect(result.totalTime).toBe(0)

        expect(result.averageTime).toBe(0)

        expect(result.minTime).toBe(0)

        expect(result.maxTime).toBe(0)
    })

    it('does not modify the original logs', () => {
        const logs = createLogs()

        const snapshot =
            JSON.stringify(logs)

        calculateStatistics(
            logs,
            2,
        )

        expect(
            JSON.stringify(logs),
        ).toBe(snapshot)
    })
})

describe('Metric formatting', () => {
    it('displays unavailable metrics correctly', () => {
        expect(formatNumber(null)).toBe('—')

        expect(
            formatNumber(undefined),
        ).toBe('—')

        expect(
            formatNumber(Number.NaN),
        ).toBe('—')

        expect(
            formatNumber(Infinity),
        ).toBe('—')

        expect(formatTime(null)).toBe('—')
    })

    it('distinguishes zero from missing data', () => {
        expect(formatNumber(0)).toBe('0')

        expect(formatTime(0)).toBe('0 ms')
    })
})

describe('Match CSV export', () => {
    it('exports one row for every move', () => {
        const csv = createMatchCsv(
            createLogs(),
            null,
        )

        const lines = csv.split('\r\n')

        expect(lines).toHaveLength(5)

        expect(
            lines[0].split(','),
        ).toHaveLength(19)

        for (const line of lines.slice(1)) {
            expect(
                line.split(','),
            ).toHaveLength(19)
        }
    })

    it('leaves human search metrics empty', () => {
        const csv = createMatchCsv(
            createLogs(),
            null,
        )

        const lines = csv.split('\r\n')

        const header = lines[0].split(',')

        const humanRow = lines[1].split(',')

        expect(
            humanRow[
                header.indexOf('elapsed_ms')
                ],
        ).toBe('')

        expect(
            humanRow[
                header.indexOf('nodes')
                ],
        ).toBe('')
    })

    it('exports search metrics and configured depth', () => {
        const csv = createMatchCsv(
            createLogs(),
            2,
        )

        const lines = csv.split('\r\n')

        const header = lines[0].split(',')

        const aiRow = lines[2].split(',')

        expect(
            aiRow[
                header.indexOf('elapsed_ms')
                ],
        ).toBe('10')

        expect(
            aiRow[
                header.indexOf('nodes')
                ],
        ).toBe('100')

        expect(
            aiRow[
                header.indexOf('configured_depth')
                ],
        ).toBe('2')

        expect(
            aiRow[
                header.indexOf('pruning')
                ],
        ).toBe('true')
    })

    it('escapes commas and quotation marks', () => {
        const logs: MoveLog[] = [
            {
                player: 1,
                move: [4, 4],

                algorithm: 'Test, "Agent"',
                algorithmId: 'human',
            },
        ]

        const csv =
            createMatchCsv(logs, null)

        expect(csv).toContain(
            '"Test, ""Agent"""',
        )
    })

    it.each([
        {
            winner: null,
            label: 'unfinished',
        },
        {
            winner: 0,
            label: 'draw',
        },
        {
            winner: 1,
            label: 'X',
        },
        {
            winner: 2,
            label: 'O',
        },
    ] as const)(
        'exports match result as $label',
        ({ winner, label }) => {
            const csv = createMatchCsv(
                createLogs(),
                winner,
            )

            for (
                const line of csv
                .split('\r\n')
                .slice(1)
                ) {
                expect(
                    line.endsWith(`,${label}`),
                ).toBe(true)
            }
        },
    )
})
