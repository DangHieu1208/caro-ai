import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    Square,
    XCircle,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import type {
    ExperimentController,
} from '@/hooks/useExperiment'

import {
    jobStatusNames,
    scenarioNames,
    isActiveJob,
} from '@/lib/experimentApi'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
    value: number
    label: string
    completed?: boolean
}

function ProgressBar({
                         value,
                         label,
                         completed = false,
                     }: ProgressBarProps) {
    const progress = Math.max(
        0,
        Math.min(
            100,
            value,
        ),
    )

    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
            <div
                style={{
                    width: `${progress}%`,
                }}

                className={cn(
                    'h-full rounded-full transition-all duration-300',

                    completed
                        ? 'bg-emerald-600'
                        : 'bg-blue-600',
                )}
            />
        </div>
    )
}

function formatDate(
    value: string | null,
): string {
    if (!value) {
        return '—'
    }

    return new Date(
        value,
    ).toLocaleString('vi-VN')
}

export function ExperimentProgress({
                                       experiment,
                                   }: {
    experiment: ExperimentController
}) {
    const {
        job,
        starting,
        recovering,
        cancelling,
        loadingResult,
        pollError,
        cancel,
    } = experiment

    const active =
        isActiveJob(job)

    const caseProgress =
        job &&
        job.current_case_total_games > 0
            ? (
                100 *
                job.current_case_completed_games /
                job.current_case_total_games
            )
            : 0

    function renderStatusMessage() {
        if (!job) {
            return null
        }

        switch (job.status) {
            case 'queued':
                return (
                    <>
                        <Clock3 size={16} />
                        Tác vụ đang chờ thực hiện.
                    </>
                )

            case 'running':
                return (
                    <>
                        <LoaderCircle
                            size={16}
                            className="animate-spin"
                        />

                        Backend đang chạy các ván đấu.
                    </>
                )

            case 'cancelling':
                return (
                    <>
                        <LoaderCircle
                            size={16}
                            className="animate-spin"
                        />

                        Đang chờ thuật toán kết thúc
                        quyết định hiện tại.
                    </>
                )

            case 'completed':
                return (
                    <>
                        <CheckCircle2
                            size={16}
                            className="text-emerald-600"
                        />

                        Thực nghiệm đã hoàn thành.
                    </>
                )

            case 'cancelled':
                return (
                    <>
                        <XCircle size={16} />

                        Thực nghiệm đã được hủy.
                    </>
                )

            case 'failed':
                return (
                    <>
                        <AlertCircle
                            size={16}
                            className="text-red-600"
                        />

                        Thực nghiệm gặp lỗi.
                    </>
                )
        }
    }

    return (
        <Card className="lab-panel min-w-0">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <Activity size={18} />

                    Tiến độ thực nghiệm
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                    Theo dõi trạng thái xử lý từ Backend.
                </p>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
                {/* Empty state */}
                {!job && (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
                        {starting || recovering ? (
                            <LoaderCircle
                                size={27}
                                className="animate-spin text-muted-foreground"
                            />
                        ) : (
                            <Activity
                                size={27}
                                className="text-slate-400"
                            />
                        )}

                        <p className="text-sm font-medium">
                            {starting
                                ? 'Đang tạo tác vụ...'
                                : recovering
                                    ? 'Đang khôi phục tác vụ...'
                                    : 'Chưa có thực nghiệm'}
                        </p>

                        <p className="text-xs text-muted-foreground">
                            Chọn cấu hình rồi chạy thực nghiệm
                            để bắt đầu.
                        </p>
                    </div>
                )}

                {job && (
                    <>
                        {/* Job heading */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">
                                    {scenarioNames[job.scenario]}
                                </p>

                                <p
                                    title={job.job_id}
                                    className="mt-1 break-all font-mono text-[10px] text-muted-foreground"
                                >
                                    ID: {job.job_id}
                                </p>
                            </div>

                            <Badge
                                className={cn(
                                    job.status === 'completed'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'

                                        : job.status === 'failed'
                                            ? 'border-red-200 bg-red-50 text-red-700'

                                            : job.status === 'running'
                                                ? 'border-blue-200 bg-blue-50 text-blue-700'

                                                : job.status === 'cancelling'
                                                    ? 'border-amber-200 bg-amber-50 text-amber-700'

                                                    : 'bg-muted',
                                )}
                            >
                                {jobStatusNames[job.status]}
                            </Badge>
                        </div>

                        {/* Overall progress */}
                        <div className="space-y-3">
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Tiến độ tổng thể
                                    </p>

                                    <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
                                        {job.progress.toFixed(1)}%
                                    </p>
                                </div>

                                <p className="text-sm font-medium tabular-nums">
                                    {job.completed_games}
                                    {' / '}
                                    {job.total_games} ván
                                </p>
                            </div>

                            <ProgressBar
                                value={job.progress}
                                label="Tiến độ tổng thể"

                                completed={
                                    job.status === 'completed'
                                }
                            />

                            <p
                                aria-live="polite"
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                                {renderStatusMessage()}
                            </p>
                        </div>

                        {/* Current configuration */}
                        {job.current_case_label && (
                            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Cấu hình gần nhất
                                </p>

                                <p className="text-sm font-semibold">
                                    {job.current_case_label}
                                </p>

                                <ProgressBar
                                    value={caseProgress}
                                    label="Tiến độ cấu hình"
                                    completed={caseProgress === 100}
                                />

                                <p className="text-xs tabular-nums text-muted-foreground">
                                    {job.current_case_completed_games}
                                    {' / '}
                                    {job.current_case_total_games}
                                    {' '}ván
                                </p>
                            </div>
                        )}

                        {/* Job metadata */}
                        <div className="space-y-2 border-t pt-4 text-xs">
                            <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Số cấu hình
                </span>

                                <span className="font-medium">
                  {job.total_cases}
                </span>
                            </div>

                            <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Random seed
                </span>

                                <span className="break-all text-right font-mono">
                  {job.seed}
                </span>
                            </div>

                            <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Bắt đầu
                </span>

                                <span className="text-right">
                  {formatDate(job.started_at)}
                </span>
                            </div>

                            <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  Kết thúc
                </span>

                                <span className="text-right">
                  {formatDate(job.finished_at)}
                </span>
                            </div>
                        </div>

                        {/* Cancel action */}
                        {active && (
                            <Button
                                variant="outline"
                                className="w-full border-red-200 text-red-700 hover:bg-red-50"

                                disabled={
                                    cancelling ||
                                    job.status === 'cancelling'
                                }

                                onClick={() =>
                                    void cancel()
                                }
                            >
                                {cancelling ||
                                job.status === 'cancelling'
                                    ? (
                                        <LoaderCircle
                                            size={15}
                                            className="animate-spin"
                                        />
                                    )
                                    : (
                                        <Square size={15} />
                                    )}

                                {cancelling ||
                                job.status === 'cancelling'
                                    ? 'Đang dừng...'
                                    : 'Dừng thực nghiệm'}
                            </Button>
                        )}

                        {loadingResult && (
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                <LoaderCircle
                                    size={15}
                                    className="animate-spin"
                                />

                                Đang tải dữ liệu kết quả...
                            </p>
                        )}

                        {job.error && (
                            <div
                                role="alert"
                                className="break-words rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                            >
                                {job.error}
                            </div>
                        )}
                    </>
                )}

                {pollError && (
                    <div
                        role="alert"
                        className="break-words rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"
                    >
                        {pollError}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
