import type {
    Algorithm,
    Config,
} from '@/lib/api'

import type {
    Move,
    Player,
} from '@/lib/game'

export type ExperimentScenario =
    | 'custom'
    | 'comparison'
    | 'uct_c'
    | 'iterations'

export type JobStatus =
    | 'queued'
    | 'running'
    | 'cancelling'
    | 'completed'
    | 'cancelled'
    | 'failed'

export type Side = 'A' | 'B'

export type ExperimentConfig =
    Omit<Config, 'rollout'> & {
    rollout: 'random'
    seed?: null
}

export interface Competitor {
    algorithm: Algorithm
    config: ExperimentConfig
}

export interface ExperimentRequest {
    scenario: ExperimentScenario
    pairs: number
    seed: number
    competitor_a?: Competitor | null
    competitor_b?: Competitor | null
    opponent?: Competitor | null
    source_revision?: string | null
}

export interface ExperimentJob {
    job_id: string
    scenario: ExperimentScenario
    status: JobStatus

    pairs: number
    seed: number
    total_cases: number

    completed_games: number
    total_games: number
    progress: number

    current_case_id: string | null
    current_case_label: string | null

    current_case_completed_games: number
    current_case_total_games: number

    error: string | null

    created_at: string
    started_at: string | null
    finished_at: string | null

    status_url: string
    result_url: string
    cancel_url: string
}

export interface SearchResult {
    move: Move
    nodes: number | null
    cutoffs: number | null
    iterations: number | null
    depth: number | null
    value: number | null
}

export interface MoveRecord {
    ply: number
    player: Player
    side: Side
    seed: number
    elapsed_ms: number
    result: SearchResult
}

export interface GameRecord {
    pair_number: number
    game_number: number
    pair_seed: number
    x_side: Side
    winner: Player | 0
    winner_side: Side | null
    moves: MoveRecord[]
}

export interface SideSummary {
    games: number

    wins: number
    draws: number
    losses: number

    win_rate: number
    draw_rate: number
    loss_rate: number

    ai_moves: number
    total_time_ms: number
    average_time_ms: number | null
}

export interface CaseResult {
    id: string
    label: string

    result: {
        competitor_a: Competitor
        competitor_b: Competitor

        pairs: number
        seed: number

        games: GameRecord[]

        summary_a: SideSummary
        summary_b: SideSummary
    }
}

export interface ExperimentEnvironment {
    python_version: string
    operating_system: string
    machine: string
    processor: string | null
    logical_cpu_count: number | null
    execution_mode: string
    timing_method: string
}

export interface ExperimentResult {
    job_id: string
    scenario: ExperimentScenario

    created_at: string
    started_at: string | null
    finished_at: string | null

    environment: ExperimentEnvironment

    source_revision: string | null
    total_games: number

    request: ExperimentRequest

    cases: CaseResult[]
}

export const scenarioNames: Record<
    ExperimentScenario,
    string
> = {
    custom: 'Thực nghiệm tùy chỉnh',
    comparison: 'Đối sánh thuật toán',
    uct_c: 'Khảo sát hệ số UCT',
    iterations: 'Khảo sát iterations',
}

export const scenarioCaseCounts: Record<
    ExperimentScenario,
    number
> = {
    custom: 1,
    comparison: 3,
    uct_c: 4,
    iterations: 3,
}

export const jobStatusNames: Record<
    JobStatus,
    string
> = {
    queued: 'Đang chờ',
    running: 'Đang chạy',
    cancelling: 'Đang dừng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    failed: 'Thất bại',
}

export function isActiveJob(
    job: ExperimentJob | null,
): boolean {
    return (
        job?.status === 'queued' ||
        job?.status === 'running' ||
        job?.status === 'cancelling'
    )
}

export function createCompetitor(
    algorithm: Algorithm = 'random',
): Competitor {
    return {
        algorithm,

        config: {
            depth: 2,
            candidate_limit: 10,
            pruning: true,

            iterations: 300,
            c: 1.4,

            rollout: 'random',
            seed: null,
        },
    }
}

export class ExperimentApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message)

        this.name = 'ExperimentApiError'
    }
}

function parseErrorDetail(
    detail: unknown,
): string | null {
    if (typeof detail === 'string') {
        return detail
    }

    if (Array.isArray(detail)) {
        const messages = detail.map((item) => {
            if (typeof item?.msg === 'string') {
                const location = Array.isArray(item.loc)
                    ? item.loc.join('.')
                    : 'request'

                return `${location}: ${item.msg}`
            }

            return 'Dữ liệu không hợp lệ'
        })

        return messages.join('; ')
    }

    return null
}

async function requestJson<T>(
    url: string,
    options?: RequestInit,
): Promise<T> {
    const response = await fetch(
        url,
        options,
    )

    if (!response.ok) {
        const body = await response
            .json()
            .catch(() => ({}))

        throw new ExperimentApiError(
            response.status,

            parseErrorDetail(body.detail) ??
            `API lỗi ${response.status}`,
        )
    }

    return response.json() as Promise<T>
}

export function createExperiment(
    request: ExperimentRequest,
): Promise<ExperimentJob> {
    return requestJson<ExperimentJob>(
        '/api/experiments',
        {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify(request),
        },
    )
}

export function getExperimentStatus(
    jobId: string,
    signal?: AbortSignal,
): Promise<ExperimentJob> {
    return requestJson<ExperimentJob>(
        `/api/experiments/${encodeURIComponent(jobId)}`,
        {
            signal,
            cache: 'no-store',
        },
    )
}

export function getExperimentResult(
    jobId: string,
    signal?: AbortSignal,
): Promise<ExperimentResult> {
    return requestJson<ExperimentResult>(
        `/api/experiments/${encodeURIComponent(jobId)}/result`,
        {
            signal,
            cache: 'no-store',
        },
    )
}

export function cancelExperiment(
    jobId: string,
): Promise<ExperimentJob> {
    return requestJson<ExperimentJob>(
        `/api/experiments/${encodeURIComponent(jobId)}/cancel`,
        {
            method: 'POST',
        },
    )
}

export function downloadExperimentJson(
    result: ExperimentResult,
): void {
    const content = JSON.stringify(
        result,
        null,
        2,
    )

    const blob = new Blob(
        [content],
        {
            type: 'application/json;charset=utf-8',
        },
    )

    const url =
        URL.createObjectURL(blob)

    const link =
        document.createElement('a')

    link.href = url

    link.download =
        `caro-experiment-${result.job_id}.json`

    document.body.appendChild(link)

    link.click()
    link.remove()

    window.setTimeout(() => {
        URL.revokeObjectURL(url)
    }, 1000)
}
