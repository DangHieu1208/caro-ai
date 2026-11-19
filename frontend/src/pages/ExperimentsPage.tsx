import {
    BarChart3,
    Download,
    FlaskConical,
    X,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import {
    ExperimentSettings,
} from '@/components/experiments/ExperimentSettings'

import {
    ExperimentProgress,
} from '@/components/experiments/ExperimentProgress'

import type {
    ExperimentController,
} from '@/hooks/useExperiment'

import type {
    Connection,
} from '@/components/game/MatchSettings'

import {
    names,
    type AgentStatus,
} from '@/lib/api'

import {
    downloadExperimentJson,
    type Competitor,
    type ExperimentResult,
} from '@/lib/experimentApi'

import {
    formatTime,
} from '@/lib/statistics'

interface ExperimentsPageProps {
    agents: AgentStatus[]

    connection: Connection

    experiment: ExperimentController
}

function competitorName(
    competitor: Competitor,
): string {
    if (
        competitor.algorithm === 'minimax' &&
        !competitor.config.pruning
    ) {
        return 'MiniMax thuần'
    }

    return names[
        competitor.algorithm
        ]
}

function BasicResults({
                          result,
                      }: {
    result: ExperimentResult
}) {
    return (
        <Card className="lab-panel min-w-0">
            <CardHeader className="border-b">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 size={18} />

                            Kết quả thực nghiệm
                        </CardTitle>

                        <p className="mt-2 text-xs text-muted-foreground">
                            {result.cases.length} cấu hình
                            {' · '}
                            {result.total_games} ván hoàn thành
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"

                        onClick={() =>
                            downloadExperimentJson(result)
                        }
                    >
                        <Download size={15} />

                        Xuất JSON
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-left text-xs">
                        <thead className="bg-muted text-muted-foreground">
                        <tr>
                            {[
                                'Cấu hình',
                                'Đối thủ',
                                'Thắng',
                                'Hòa',
                                'Thua',
                                'Win Rate',
                                'Thời gian TB',
                            ].map((heading) => (
                                <th
                                    key={heading}
                                    className="whitespace-nowrap p-3 font-medium"
                                >
                                    {heading}
                                </th>
                            ))}
                        </tr>
                        </thead>

                        <tbody>
                        {result.cases.flatMap(
                            (item) => {
                                const competitors = [
                                    {
                                        side: 'A',

                                        competitor:
                                        item.result.competitor_a,

                                        summary:
                                        item.result.summary_a,
                                    },
                                    {
                                        side: 'B',

                                        competitor:
                                        item.result.competitor_b,

                                        summary:
                                        item.result.summary_b,
                                    },
                                ]

                                return competitors.map(
                                    (entry, index) => (
                                        <tr
                                            key={`${item.id}-${entry.side}`}
                                            className="border-b hover:bg-muted/40"
                                        >
                                            {index === 0 && (
                                                <td
                                                    rowSpan={2}
                                                    className="border-r p-3 align-top font-medium"
                                                >
                                                    {item.label}
                                                </td>
                                            )}

                                            <td className="p-3">
                          <span className="mr-2 font-semibold">
                            {entry.side}
                          </span>

                                                {competitorName(
                                                    entry.competitor,
                                                )}
                                            </td>

                                            <td className="p-3 tabular-nums">
                                                {entry.summary.wins}
                                            </td>

                                            <td className="p-3 tabular-nums">
                                                {entry.summary.draws}
                                            </td>

                                            <td className="p-3 tabular-nums">
                                                {entry.summary.losses}
                                            </td>

                                            <td className="p-3 font-semibold tabular-nums">
                                                {entry.summary.win_rate.toFixed(1)}%
                                            </td>

                                            <td className="whitespace-nowrap p-3 tabular-nums">
                                                {formatTime(
                                                    entry.summary.average_time_ms,
                                                )}
                                            </td>
                                        </tr>
                                    ),
                                )
                            },
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Environment information */}
                <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm font-semibold">
                        Môi trường thực nghiệm
                    </p>

                    <dl className="grid gap-3 text-xs sm:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground">
                                Python
                            </dt>

                            <dd className="mt-1 font-medium">
                                {result.environment.python_version}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-muted-foreground">
                                CPU
                            </dt>

                            <dd className="mt-1 break-words font-medium">
                                {result.environment.processor ?? '—'}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-muted-foreground">
                                Logical CPUs
                            </dt>

                            <dd className="mt-1 font-medium">
                                {result.environment.logical_cpu_count ?? '—'}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-muted-foreground">
                                Hệ điều hành
                            </dt>

                            <dd className="mt-1 break-words font-medium">
                                {result.environment.operating_system}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-muted-foreground">
                                Phương thức đo
                            </dt>

                            <dd className="mt-1 font-mono">
                                {result.environment.timing_method}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-muted-foreground">
                                Git revision
                            </dt>

                            <dd className="mt-1 break-all font-mono">
                                {result.source_revision ?? 'Chưa cung cấp'}
                            </dd>
                        </div>
                    </dl>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    Các số liệu được tổng hợp trực tiếp
                    từ Experiment Runner. Hãy lưu file JSON
                    trước khi khởi động lại Backend.
                </p>
            </CardContent>
        </Card>
    )
}

export function ExperimentsPage({
                                    agents,
                                    connection,
                                    experiment,
                                }: ExperimentsPageProps) {
    return (
        <div className="space-y-6">
            {/* Page heading */}
            <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <FlaskConical size={15} />

                    Experiments
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    Phòng thí nghiệm AI
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                    Đối sánh thuật toán,
                    khảo sát tham số và đo hiệu năng
                    trên nhiều ván đấu.
                </p>
            </div>

            {/* Action errors */}
            {experiment.actionError && (
                <div
                    role="alert"
                    className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    <p className="min-w-0 break-words">
                        {experiment.actionError}
                    </p>

                    <button
                        type="button"
                        aria-label="Đóng thông báo lỗi"
                        className="shrink-0"

                        onClick={experiment.clearError}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Configuration and progress */}
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <ExperimentSettings
                    agents={agents}
                    connection={connection}
                    locked={experiment.busy}
                    onStart={experiment.start}
                />

                <ExperimentProgress
                    experiment={experiment}
                />
            </div>

            {/* Results */}
            {experiment.result && (
                <BasicResults
                    result={experiment.result}
                />
            )}
        </div>
    )
}
