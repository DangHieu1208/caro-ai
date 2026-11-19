import {
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    createExperiment,
    getExperimentStatus,
    getExperimentResult,
    cancelExperiment,
    isActiveJob,
    ExperimentApiError,

    type ExperimentRequest,
    type ExperimentJob,
    type ExperimentResult,
} from '@/lib/experimentApi'

const POLLING_INTERVAL = 1000

const RETRY_INTERVAL = 3000

const STORAGE_KEY =
    'caro-ai-experiment-job-id'

export function readStoredJobId(): string | null {
    try {
        return sessionStorage.getItem(
            STORAGE_KEY,
        )
    } catch {
        return null
    }
}

function storeJobId(
    jobId: string | null,
): void {
    try {
        if (jobId === null) {
            sessionStorage.removeItem(
                STORAGE_KEY,
            )
        } else {
            sessionStorage.setItem(
                STORAGE_KEY,
                jobId,
            )
        }
    } catch {
        // Experiment tracking still works
        // if browser storage is unavailable.
    }
}

function errorMessage(
    error: unknown,
): string {
    return error instanceof Error
        ? error.message
        : 'Đã xảy ra lỗi không xác định.'
}

export function useExperiment() {
    const [jobId, setJobId] =
        useState<string | null>(
            readStoredJobId,
        )

    const [job, setJob] =
        useState<ExperimentJob | null>(
            null,
        )

    const [result, setResult] =
        useState<ExperimentResult | null>(
            null,
        )

    const [starting, setStarting] =
        useState(false)

    const [cancelling, setCancelling] =
        useState(false)

    const [pollError, setPollError] =
        useState('')

    const [actionError, setActionError] =
        useState('')

    const actionLock = useRef(false)

    const recovering =
        jobId !== null &&
        job?.job_id !== jobId

    const active =
        recovering ||
        isActiveJob(job)

    const loadingResult =
        job?.status === 'completed' &&
        result === null

    const busy =
        starting ||
        cancelling ||
        active ||
        loadingResult

    // Polling lifecycle.
    useEffect(() => {
        if (!jobId) {
            return
        }

        const controller =
            new AbortController()

        let timer: number | undefined

        function schedule(
            delay: number,
        ) {
            if (controller.signal.aborted) {
                return
            }

            timer = window.setTimeout(
                () => {
                    void poll()
                },
                delay,
            )
        }

        async function poll() {
            try {
                const currentJob =
                    await getExperimentStatus(
                        jobId!,
                        controller.signal,
                    )

                if (controller.signal.aborted) {
                    return
                }

                setJob(currentJob)

                setPollError('')

                if (
                    currentJob.status === 'completed'
                ) {
                    const data =
                        await getExperimentResult(
                            jobId!,
                            controller.signal,
                        )

                    if (controller.signal.aborted) {
                        return
                    }

                    setResult(data)

                    return
                }

                if (
                    currentJob.status === 'failed' ||
                    currentJob.status === 'cancelled'
                ) {
                    return
                }

                schedule(POLLING_INTERVAL)
            } catch (error) {
                if (controller.signal.aborted) {
                    return
                }

                if (
                    error instanceof ExperimentApiError &&
                    error.status === 404
                ) {
                    // The backend may have restarted
                    // or removed an old job.
                    storeJobId(null)

                    setJobId(null)
                    setJob(null)
                    setResult(null)

                    setPollError(
                        'Không tìm thấy tác vụ. Backend có thể đã khởi động lại hoặc xóa tác vụ cũ.',
                    )

                    return
                }

                setPollError(
                    `${errorMessage(error)} Đang thử kết nối lại...`,
                )

                // Network failures do not imply that
                // the backend job has stopped.
                schedule(RETRY_INTERVAL)
            }
        }

        void poll()

        return () => {
            controller.abort()

            if (timer !== undefined) {
                window.clearTimeout(timer)
            }
        }
    }, [jobId])

    async function start(
        request: ExperimentRequest,
    ): Promise<void> {
        if (
            busy ||
            actionLock.current
        ) {
            return
        }

        actionLock.current = true

        setStarting(true)

        setActionError('')
        setPollError('')

        try {
            const created =
                await createExperiment(
                    request,
                )

            setResult(null)

            setJob(created)

            storeJobId(
                created.job_id,
            )

            setJobId(
                created.job_id,
            )
        } catch (error) {
            setActionError(
                errorMessage(error),
            )
        } finally {
            actionLock.current = false

            setStarting(false)
        }
    }

    async function cancel(): Promise<void> {
        if (
            !job ||
            !isActiveJob(job) ||
            job.status === 'cancelling' ||
            actionLock.current
        ) {
            return
        }

        actionLock.current = true

        setCancelling(true)

        setActionError('')

        try {
            const updated =
                await cancelExperiment(
                    job.job_id,
                )

            setJob((previous) => {
                if (
                    previous?.job_id !== updated.job_id ||
                    !isActiveJob(previous)
                ) {
                    return previous
                }

                return updated
            })
        } catch (error) {
            setActionError(
                errorMessage(error),
            )
        } finally {
            actionLock.current = false

            setCancelling(false)
        }
    }

    function clearError() {
        setActionError('')
    }

    return {
        jobId,
        job,
        result,

        starting,
        cancelling,
        recovering,

        active,
        busy,
        loadingResult,

        pollError,
        actionError,

        start,
        cancel,
        clearError,
    }
}

export type ExperimentController =
    ReturnType<typeof useExperiment>
