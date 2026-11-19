import {
    FlaskConical,
    X,
} from 'lucide-react'

import {
    ExperimentSettings,
} from '@/components/experiments/ExperimentSettings'

import {
    ExperimentProgress,
} from '@/components/experiments/ExperimentProgress'

import {
    ExperimentResults,
} from '@/components/experiments/ExperimentResults'

import type {
    ExperimentController,
} from '@/hooks/useExperiment'

import type {
    Connection,
} from '@/components/game/MatchSettings'

import type {
    AgentStatus,
} from '@/lib/api'

interface ExperimentsPageProps {
    agents: AgentStatus[]
    connection: Connection
    experiment: ExperimentController
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

            {/* Completed experiment results */}
            {experiment.result && (
                <ExperimentResults
                    key={experiment.result.job_id}
                    result={experiment.result}
                />
            )}
        </div>
    )
}
