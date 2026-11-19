import { names } from '@/lib/api'

import type {
    CaseResult,
    Competitor,
    ExperimentResult,
    GameRecord,
    Side,
} from '@/lib/experimentApi'

export function competitorName(
    competitor: Competitor,
): string {
    if (
        competitor.algorithm === 'minimax' &&
        !competitor.config.pruning
    ) {
        return 'MiniMax thuần'
    }

    return names[competitor.algorithm]
}

export function competitorDescription(
    competitor: Competitor,
): string {
    const { algorithm, config } = competitor

    if (algorithm === 'minimax') {
        return [
            competitorName(competitor),
            `depth=${config.depth}`,
            `limit=${config.candidate_limit || 'unlimited'}`,
            `pruning=${config.pruning}`,
        ].join(' · ')
    }

    if (algorithm === 'mcts') {
        return [
            competitorName(competitor),
            `iterations=${config.iterations}`,
            `c=${config.c}`,
            `rollout=${config.rollout}`,
        ].join(' · ')
    }

    return competitorName(competitor)
}

export function formatMeasuredTime(
    value: number | null | undefined,
): string {
    if (
        value == null ||
        !Number.isFinite(value)
    ) {
        return '—'
    }

    return `${value.toLocaleString('vi-VN', {
        maximumFractionDigits: 4,
    })} ms`
}

export function getCompetitor(
    item: CaseResult,
    side: Side,
): Competitor {
    return side === 'A'
        ? item.result.competitor_a
        : item.result.competitor_b
}

export function winnerName(
    game: GameRecord,
): string {
    if (game.winner === 0) {
        return 'Hòa'
    }

    return `${game.winner_side} (${game.winner === 1 ? 'X' : 'O'})`
}

export function createOutcomeData(
    cases: readonly CaseResult[],
) {
    return cases.flatMap(
        (item, index) => [
            {
                label: `C${index + 1} · A`,
                wins: item.result.summary_a.wins,
                draws: item.result.summary_a.draws,
                losses: item.result.summary_a.losses,
            },
            {
                label: `C${index + 1} · B`,
                wins: item.result.summary_b.wins,
                draws: item.result.summary_b.draws,
                losses: item.result.summary_b.losses,
            },
        ],
    )
}

export function createTimingData(
    cases: readonly CaseResult[],
) {
    return cases.map(
        (item, index) => ({
            label: `C${index + 1}`,

            sideA:
            item.result.summary_a.average_time_ms,

            sideB:
            item.result.summary_b.average_time_ms,
        }),
    )
}

export function createSweepData(
    experiment: ExperimentResult,
) {
    if (
        experiment.scenario !== 'uct_c' &&
        experiment.scenario !== 'iterations'
    ) {
        return []
    }

    return experiment.cases
        .map((item) => {
            const config =
                item.result.competitor_a.config

            const parameter =
                experiment.scenario === 'uct_c'
                    ? config.c
                    : config.iterations

            return {
                parameter,

                label: String(parameter),

                winRate:
                item.result.summary_a.win_rate,

                averageTime:
                item.result.summary_a.average_time_ms,
            }
        })
        .sort(
            (a, b) => a.parameter - b.parameter,
        )
}

type CsvCell =
    | string
    | number
    | boolean
    | null
    | undefined

function csvEscape(
    value: CsvCell,
): string {
    if (value == null) {
        return ''
    }

    let text = String(value)

    // Prevent user-provided text from being
    // interpreted as an Excel formula.
    if (
        typeof value === 'string' &&
        /^\s*[=+\-@]/.test(text)
    ) {
        text = `'${text}`
    }

    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }

    return text
}

function buildCsv(
    headers: string[],
    rows: CsvCell[][],
): string {
    return [headers, ...rows]
        .map((row) =>
            row.map(csvEscape).join(','),
        )
        .join('\r\n')
}

function configValues(
    competitor: Competitor,
): CsvCell[] {
    const { algorithm, config } = competitor

    return [
        algorithm,

        algorithm === 'minimax'
            ? config.depth
            : null,

        algorithm === 'minimax'
            ? config.candidate_limit
            : null,

        algorithm === 'minimax'
            ? config.pruning
            : null,

        algorithm === 'mcts'
            ? config.iterations
            : null,

        algorithm === 'mcts'
            ? config.c
            : null,

        algorithm === 'mcts'
            ? config.rollout
            : null,
    ]
}

const configHeaders = [
    'algorithm',
    'configured_depth',
    'candidate_limit',
    'pruning',
    'configured_iterations',
    'uct_c',
    'rollout',
]

const commonHeaders = [
    'job_id',
    'scenario',
    'source_revision',
    'case_id',
    'case_label',
    'experiment_seed',
]

function commonValues(
    experiment: ExperimentResult,
    item: CaseResult,
): CsvCell[] {
    return [
        experiment.job_id,
        experiment.scenario,
        experiment.source_revision,
        item.id,
        item.label,
        item.result.seed,
    ]
}

export function createSummaryCsv(
    experiment: ExperimentResult,
): string {
    const headers = [
        ...commonHeaders,

        'side',

        ...configHeaders,

        'pairs',
        'games',
        'wins',
        'draws',
        'losses',
        'win_rate_percent',
        'draw_rate_percent',
        'loss_rate_percent',
        'ai_moves',
        'total_time_ms',
        'average_time_ms',
    ]

    const rows = experiment.cases.flatMap(
        (item) => {
            const sides: Side[] = ['A', 'B']

            return sides.map((side) => {
                const summary =
                    side === 'A'
                        ? item.result.summary_a
                        : item.result.summary_b

                return [
                    ...commonValues(experiment, item),

                    side,

                    ...configValues(
                        getCompetitor(item, side),
                    ),

                    item.result.pairs,

                    summary.games,
                    summary.wins,
                    summary.draws,
                    summary.losses,

                    summary.win_rate,
                    summary.draw_rate,
                    summary.loss_rate,

                    summary.ai_moves,
                    summary.total_time_ms,
                    summary.average_time_ms,
                ]
            })
        },
    )

    return buildCsv(headers, rows)
}

export function createGamesCsv(
    experiment: ExperimentResult,
): string {
    const headers = [
        ...commonHeaders,

        'pair_number',
        'game_number',
        'pair_seed',
        'x_side',

        'algorithm_a',
        'algorithm_b',

        'winner_player',
        'winner_side',
        'total_moves',

        'time_a_ms',
        'time_b_ms',
    ]

    const rows = experiment.cases.flatMap(
        (item) =>
            item.result.games.map((game) => {
                const timeA = game.moves
                    .filter((move) => move.side === 'A')
                    .reduce(
                        (sum, move) => sum + move.elapsed_ms,
                        0,
                    )

                const timeB = game.moves
                    .filter((move) => move.side === 'B')
                    .reduce(
                        (sum, move) => sum + move.elapsed_ms,
                        0,
                    )

                return [
                    ...commonValues(experiment, item),

                    game.pair_number,
                    game.game_number,
                    game.pair_seed,
                    game.x_side,

                    item.result.competitor_a.algorithm,
                    item.result.competitor_b.algorithm,

                    game.winner === 0
                        ? 'draw'
                        : game.winner === 1
                            ? 'X'
                            : 'O',

                    game.winner_side ?? 'draw',

                    game.moves.length,

                    timeA,
                    timeB,
                ]
            }),
    )

    return buildCsv(headers, rows)
}

export function createMovesCsv(
    experiment: ExperimentResult,
): string {
    const headers = [
        ...commonHeaders,

        'pair_number',
        'game_number',
        'pair_seed',
        'x_side',

        'ply',
        'player',
        'side',

        ...configHeaders,

        'move_seed',
        'row',
        'col',
        'elapsed_ms',

        'nodes',
        'cutoffs',
        'iterations_executed',
        'depth_executed',
        'evaluation',

        'winner_side',
    ]

    const rows = experiment.cases.flatMap(
        (item) =>
            item.result.games.flatMap(
                (game) =>
                    game.moves.map((move) => [
                        ...commonValues(experiment, item),

                        game.pair_number,
                        game.game_number,
                        game.pair_seed,
                        game.x_side,

                        move.ply,
                        move.player === 1 ? 'X' : 'O',
                        move.side,

                        ...configValues(
                            getCompetitor(item, move.side),
                        ),

                        move.seed,

                        move.result.move[0],
                        move.result.move[1],

                        move.elapsed_ms,

                        move.result.nodes,
                        move.result.cutoffs,
                        move.result.iterations,
                        move.result.depth,
                        move.result.value,

                        game.winner_side ?? 'draw',
                    ]),
            ),
    )

    return buildCsv(headers, rows)
}

export type CsvKind =
    | 'summary'
    | 'games'
    | 'moves'

export function downloadExperimentCsv(
    experiment: ExperimentResult,
    kind: CsvKind,
): void {
    const content =
        kind === 'summary'
            ? createSummaryCsv(experiment)
            : kind === 'games'
                ? createGamesCsv(experiment)
                : createMovesCsv(experiment)

    const blob = new Blob(
        ['\uFEFF', content],
        {
            type: 'text/csv;charset=utf-8;',
        },
    )

    const url =
        URL.createObjectURL(blob)

    const link =
        document.createElement('a')

    link.href = url

    link.download =
        `caro-${experiment.job_id}-${kind}.csv`

    document.body.appendChild(link)

    link.click()
    link.remove()

    window.setTimeout(() => {
        URL.revokeObjectURL(url)
    }, 1000)
}
