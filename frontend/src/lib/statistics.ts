import type {
    Algorithm,
    Config,
    Metrics,
} from '@/lib/api'

import {
    symbol,
    type Move,
    type Player,
    type Winner,
} from '@/lib/game'

export interface MoveLog {
    player: Player
    move: Move
    algorithm: string
    algorithmId: Algorithm | 'human'
    config?: Config
    metrics?: Metrics
}

export interface MatchStatistics {
    totalMoves: number
    aiMoves: number
    totalTime: number | null
    averageTime: number | null
    minTime: number | null
    maxTime: number | null
    lastMetrics: Metrics | null
}

export function formatNumber(
    value: number | null | undefined,
): string {
    if (value == null || !Number.isFinite(value)) {
        return '—'
    }

    return value.toLocaleString('vi-VN', {
        maximumFractionDigits: 2,
    })
}

export function formatTime(
    value: number | null | undefined,
): string {
    if (value == null || !Number.isFinite(value)) {
        return '—'
    }

    return `${formatNumber(value)} ms`
}

export function calculateStatistics(
    logs: readonly MoveLog[],
    player?: Player,
): MatchStatistics {
    const selectedLogs = logs.filter(
        (log) =>
            player === undefined ||
            log.player === player,
    )

    const metrics = selectedLogs.flatMap(
        (log) => log.metrics ? [log.metrics] : [],
    )

    const times = metrics.map(
        (metric) => metric.elapsed_ms,
    )

    const totalTime = times.length
        ? times.reduce(
            (sum, time) => sum + time,
            0,
        )
        : null

    return {
        totalMoves: selectedLogs.length,

        aiMoves: metrics.length,

        totalTime,

        averageTime:
            totalTime !== null
                ? totalTime / times.length
                : null,

        minTime:
            times.length > 0
                ? Math.min(...times)
                : null,

        maxTime:
            times.length > 0
                ? Math.max(...times)
                : null,

        lastMetrics:
            metrics.at(-1) ?? null,
    }
}

function csvEscape(value: unknown): string {
    if (value === null || value === undefined) {
        return ''
    }

    const text = String(value)

    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }

    return text
}

function winnerLabel(winner: Winner): string {
    if (winner === null) {
        return 'unfinished'
    }

    if (winner === 0) {
        return 'draw'
    }

    return symbol(winner)
}

export function createMatchCsv(
    logs: readonly MoveLog[],
    winner: Winner,
): string {
    const headers = [
        'move_number',
        'player',
        'row',
        'col',
        'algorithm_id',
        'algorithm_name',
        'elapsed_ms',
        'nodes',
        'cutoffs',
        'iterations_executed',
        'depth_executed',
        'evaluation',
        'configured_depth',
        'candidate_limit',
        'pruning',
        'configured_iterations',
        'uct_c',
        'rollout',
        'match_result_at_export',
    ]

    const rows = logs.map((log, index) => {
        const metrics = log.metrics
        const config = log.config

        const isMinimax =
            log.algorithmId === 'minimax'

        const isMcts =
            log.algorithmId === 'mcts'

        return [
            index + 1,
            symbol(log.player),
            log.move[0],
            log.move[1],
            log.algorithmId,
            log.algorithm,

            metrics?.elapsed_ms,
            metrics?.nodes,
            metrics?.cutoffs,
            metrics?.iterations,
            metrics?.depth,
            metrics?.value,

            isMinimax ? config?.depth : null,

            isMinimax
                ? config?.candidate_limit
                : null,

            isMinimax
                ? config?.pruning
                : null,

            isMcts
                ? config?.iterations
                : null,

            isMcts ? config?.c : null,

            isMcts ? config?.rollout : null,

            winnerLabel(winner),
        ]
    })

    return [headers, ...rows]
        .map((row) =>
            row.map(csvEscape).join(','),
        )
        .join('\r\n')
}

export function downloadMatchCsv(
    logs: readonly MoveLog[],
    winner: Winner,
): void {
    if (logs.length === 0) {
        return
    }

    const csv = createMatchCsv(
        logs,
        winner,
    )

    // UTF-8 BOM helps Excel recognize Vietnamese text.
    const blob = new Blob(
        ['\uFEFF', csv],
        {
            type: 'text/csv;charset=utf-8;',
        },
    )

    const url =
        URL.createObjectURL(blob)

    const timestamp =
        new Date()
            .toISOString()
            .replace(/[:.]/g, '-')

    const link =
        document.createElement('a')

    link.href = url
    link.download =
        `caro-match-${timestamp}.csv`

    document.body.appendChild(link)

    link.click()
    link.remove()

    window.setTimeout(() => {
        URL.revokeObjectURL(url)
    }, 1000)
}
