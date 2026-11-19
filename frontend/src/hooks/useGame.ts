import {
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    getMove,
    names,
    type AgentStatus,
    type Config,
} from '@/lib/api'

import {
    initialGame,
    play,
    type Game,
    type Move,
    type Player,
} from '@/lib/game'

import type {
    MoveLog,
} from '@/lib/statistics'

import type {
    Connection,
    MatchSettingsValue,
    PlayerSettings,
} from '@/components/game/MatchSettings'

export type GameActivity =
    | 'idle'
    | 'waiting'
    | 'thinking'

interface UseGameOptions {
    agents: AgentStatus[]
    connection: Connection
}

interface MatchSnapshot {
    game: Game
    logs: MoveLog[]
}

const players: Player[] = [1, 2]

const DEFAULT_DELAY = 350

function createDefaultConfig(): Config {
    return {
        depth: 2,
        candidate_limit: 10,
        pruning: true,
        iterations: 300,
        c: 1.4,
        rollout: 'random',
    }
}

function createDefaultSettings(): MatchSettingsValue {
    return {
        mode: 'human',
        human: 1,
        delay: DEFAULT_DELAY,

        sides: {
            1: {
                algorithm: 'random',
                config: createDefaultConfig(),
            },

            2: {
                algorithm: 'random',
                config: createDefaultConfig(),
            },
        },
    }
}

function createSnapshot(): MatchSnapshot {
    return {
        game: initialGame(),
        logs: [],
    }
}

function algorithmName(
    settings: PlayerSettings,
): string {
    if (
        settings.algorithm === 'minimax' &&
        !settings.config.pruning
    ) {
        return 'MiniMax thuần'
    }

    return names[settings.algorithm]
}

export function useGame({
                            agents,
                            connection,
                        }: UseGameOptions) {
    // Match configuration
    const [settings, setSettings] =
        useState<MatchSettingsValue>(
            createDefaultSettings,
        )

    // Board and logs are updated together.
    const [snapshot, setSnapshot] =
        useState<MatchSnapshot>(
            createSnapshot,
        )

    const { game, logs } = snapshot

    // Match lifecycle
    const [started, setStarted] =
        useState(false)

    const [paused, setPaused] =
        useState(false)

    const [stepRequested, setStepRequested] =
        useState(false)

    const [activity, setActivity] =
        useState<GameActivity>('idle')

    const [error, setError] =
        useState('')

    // Reference to the current AI operation.
    const controllerRef =
        useRef<AbortController | null>(null)

    // Read the latest delay when scheduling a turn.
    const delayRef =
        useRef(DEFAULT_DELAY)

    function isHuman(player: Player): boolean {
        return (
            settings.mode === 'human' &&
            settings.human === player
        )
    }

    function playerName(player: Player): string {
        return isHuman(player)
            ? 'Người chơi'
            : algorithmName(
                settings.sides[player],
            )
    }

    const playerNames: Record<Player, string> = {
        1: playerName(1),
        2: playerName(2),
    }

    const finished =
        game.winner !== null

    const pending = players.some(
        (player) =>
            !isHuman(player) &&
            !agents.some(
                (agent) =>
                    agent.id ===
                    settings.sides[player].algorithm &&
                    agent.ready,
            ),
    )

    const canStart =
        !started &&
        connection === 'online' &&
        !pending

    const aiTurn =
        started &&
        !finished &&
        !isHuman(game.to_move)

    const turnSettings =
        settings.sides[game.to_move]

    const latest =
        logs.at(-1)

    const canStep =
        settings.mode === 'ai' &&
        aiTurn &&
        paused &&
        !stepRequested &&
        activity === 'idle' &&
        !error

    function cancelCurrentRequest() {
        controllerRef.current?.abort()
        controllerRef.current = null
    }

    // AI move lifecycle
    useEffect(() => {
        const shouldRun =
            aiTurn &&
            !error &&
            (!paused || stepRequested)

        if (!shouldRun) {
            setActivity('idle')
            return
        }

        const controller =
            new AbortController()

        controllerRef.current =
            controller

        const isCurrentRequest = () =>
            !controller.signal.aborted &&
            controllerRef.current === controller

        // A manual step does not need an artificial delay.
        const waitTime =
            stepRequested
                ? 0
                : delayRef.current

        setActivity('waiting')

        const timer = window.setTimeout(
            async () => {
                if (!isCurrentRequest()) {
                    return
                }

                setActivity('thinking')

                try {
                    const next = await getMove(
                        game,
                        turnSettings.algorithm,
                        turnSettings.config,
                        controller.signal,
                    )

                    if (!isCurrentRequest()) {
                        return
                    }

                    const log: MoveLog = {
                        player: game.to_move,

                        move: next.move,

                        algorithm: algorithmName(
                            turnSettings,
                        ),

                        algorithmId:
                        turnSettings.algorithm,

                        config: {
                            ...turnSettings.config,
                        },

                        metrics: next.metrics,
                    }

                    // Commit board and history atomically.
                    setSnapshot((previous) => {
                        if (previous.game !== game) {
                            return previous
                        }

                        return {
                            game: {
                                board: next.board,
                                to_move: next.to_move,
                                winner: next.winner,
                            },

                            logs: [
                                ...previous.logs,
                                log,
                            ],
                        }
                    })

                    // A manual step completes exactly one move.
                    setStepRequested(false)
                } catch (requestError) {
                    if (!isCurrentRequest()) {
                        return
                    }

                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : 'Không thể lấy nước đi từ backend.',
                    )

                    setStepRequested(false)
                } finally {
                    if (isCurrentRequest()) {
                        controllerRef.current = null
                        setActivity('idle')
                    }
                }
            },
            waitTime,
        )

        return () => {
            window.clearTimeout(timer)

            controller.abort()

            if (
                controllerRef.current === controller
            ) {
                controllerRef.current = null
            }
        }
    }, [
        aiTurn,
        paused,
        stepRequested,
        error,
        game,
        turnSettings,
    ])

    function startMatch() {
        if (!canStart) {
            return
        }

        cancelCurrentRequest()

        setSnapshot(createSnapshot())
        setError('')
        setPaused(false)
        setStepRequested(false)
        setActivity('idle')
        setStarted(true)
    }

    function reset() {
        // Invalidate the request immediately,
        // before React renders a new match.
        cancelCurrentRequest()

        setStarted(false)
        setPaused(false)
        setStepRequested(false)
        setActivity('idle')
        setError('')

        setSnapshot(
            createSnapshot(),
        )
    }

    function togglePause() {
        if (
            !started ||
            finished ||
            stepRequested
        ) {
            return
        }

        if (!paused) {
            cancelCurrentRequest()

            setStepRequested(false)
            setActivity('idle')
            setPaused(true)

            return
        }

        setPaused(false)
    }

    function step() {
        if (!canStep) {
            return
        }

        // Keep paused = true.
        // The effect will execute exactly one move.
        setStepRequested(true)
    }

    function retry() {
        cancelCurrentRequest()

        setActivity('idle')
        setStepRequested(false)
        setError('')
    }

    function updateSettings(
        next: MatchSettingsValue,
    ) {
        delayRef.current =
            next.delay

        if (started) {
            // Algorithm settings remain locked.
            // Only the display delay can change.
            setSettings((previous) => ({
                ...previous,
                delay: next.delay,
            }))

            return
        }

        setSettings(next)
    }

    function humanMove(move: Move) {
        const [row, col] = move

        if (
            !started ||
            paused ||
            finished
        ) {
            return
        }

        setSnapshot((previous) => {
            const currentGame =
                previous.game

            if (
                currentGame.winner !== null ||
                !isHuman(currentGame.to_move) ||
                currentGame.board[row]?.[col] !== 0
            ) {
                return previous
            }

            const nextGame =
                play(currentGame, move)

            const log: MoveLog = {
                player: currentGame.to_move,

                move,

                algorithm: 'Người chơi',

                algorithmId: 'human',
            }

            return {
                game: nextGame,

                logs: [
                    ...previous.logs,
                    log,
                ],
            }
        })
    }

    return {
        // Data
        settings,
        game,
        logs,
        playerNames,

        lastMove:
            latest?.move ?? null,

        // Lifecycle
        started,
        paused,
        finished,
        activity,
        error,

        // Derived conditions
        aiTurn,
        canStart,
        canStep,
        stepRequested,

        // Actions
        startMatch,
        reset,
        togglePause,
        step,
        retry,
        updateSettings,
        humanMove,
    }
}
