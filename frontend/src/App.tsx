import { useEffect, useState } from 'react'

import {
  Activity,
  BrainCircuit,
  Grid3X3,
} from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

import {
  GameBoard,
} from '@/components/game/GameBoard'

import {
  MatchSettings,
  type MatchSettingsValue,
  type Connection,
} from '@/components/game/MatchSettings'

import { cn } from '@/lib/utils'

import {
  getAgents,
  getMove,
  names,
  type AgentStatus,
  type Config,
  type Metrics,
} from '@/lib/api'

import {
  initialGame,
  play,
  symbol,
  type Move,
  type Player,
} from '@/lib/game'

type Log = {
  player: Player
  move: Move
  algorithm: string
  metrics?: Metrics
}

const players: Player[] = [1, 2]

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
    delay: 350,
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

function algorithmName(
    settings: MatchSettingsValue['sides'][Player],
) {
  if (
      settings.algorithm === 'minimax' &&
      !settings.config.pruning
  ) {
    return 'MiniMax thuần'
  }

  return names[settings.algorithm]
}

function formatNumber(
    value: number | null | undefined,
) {
  if (value == null) return '—'

  return value.toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
  })
}

function StatItem({
                    label,
                    value,
                  }: {
  label: string
  value: string | number
}) {
  return (
      <div className="lab-stat">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="mt-2 break-words text-xl font-semibold tabular-nums">
          {value}
        </p>
      </div>
  )
}

function App() {
  // Backend connection
  const [agents, setAgents] =
      useState<AgentStatus[]>([])

  const [connection, setConnection] =
      useState<Connection>('loading')

  // Independent player configurations
  const [settings, setSettings] =
      useState<MatchSettingsValue>(
          createDefaultSettings,
      )

  // Match state
  const [game, setGame] =
      useState(initialGame)

  const [started, setStarted] =
      useState(false)

  const [paused, setPaused] =
      useState(false)

  // Logs and errors
  const [logs, setLogs] =
      useState<Log[]>([])

  const [error, setError] =
      useState('')

  function refresh() {
    setConnection('loading')

    getAgents()
        .then((result) => {
          setAgents(result)
          setConnection('online')
        })
        .catch(() => {
          setAgents([])
          setConnection('offline')
        })
  }

  useEffect(() => {
    refresh()
  }, [])

  function isHuman(player: Player) {
    return (
        settings.mode === 'human' &&
        settings.human === player
    )
  }

  function playerName(player: Player) {
    return isHuman(player)
        ? 'Người chơi'
        : algorithmName(
            settings.sides[player],
        )
  }

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

  const aiTurn =
      started &&
      game.winner === null &&
      !isHuman(game.to_move)

  // Select the configuration of the current side.
  const turnSettings =
      settings.sides[game.to_move]

  const delay = settings.delay

  const latest = logs.at(-1)

  const aiLogs = logs.filter(
      (log) => log.metrics !== undefined,
  )

  const lastAI = aiLogs.at(-1)

  const averageTime = aiLogs.length
      ? aiLogs.reduce(
      (sum, log) =>
          sum + log.metrics!.elapsed_ms,
      0,
  ) / aiLogs.length
      : null

  // AI move lifecycle
  useEffect(() => {
    if (!aiTurn || paused || error) {
      return
    }

    const controller =
        new AbortController()

    const timer = window.setTimeout(
        async () => {
          try {
            const next = await getMove(
                game,
                turnSettings.algorithm,
                turnSettings.config,
                controller.signal,
            )

            if (controller.signal.aborted) {
              return
            }

            setLogs((previous) => [
              ...previous,
              {
                player: game.to_move,
                move: next.move,
                algorithm: algorithmName(
                    turnSettings,
                ),
                metrics: next.metrics,
              },
            ])

            setGame({
              board: next.board,
              to_move: next.to_move,
              winner: next.winner,
            })
          } catch (requestError) {
            if (!controller.signal.aborted) {
              setError(
                  requestError instanceof Error
                      ? requestError.message
                      : 'Không thể lấy nước đi từ backend.',
              )
            }
          }
        },
        delay,
    )

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [
    aiTurn,
    paused,
    error,
    game,
    turnSettings,
    delay,
  ])

  function reset() {
    setStarted(false)
    setPaused(false)
    setGame(initialGame())
    setLogs([])
    setError('')
  }

  function startMatch() {
    if (
        started ||
        connection !== 'online' ||
        pending
    ) {
      return
    }

    setError('')
    setPaused(false)
    setStarted(true)
  }

  function updateSettings(
      next: MatchSettingsValue,
  ) {
    if (started) {
      // Only the animation delay may change
      // during an ongoing match.
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
        !isHuman(game.to_move) ||
        game.winner !== null ||
        game.board[row]?.[col] !== 0
    ) {
      return
    }

    const next = play(game, move)

    setLogs((previous) => [
      ...previous,
      {
        player: game.to_move,
        move,
        algorithm: 'Người chơi',
      },
    ])

    setGame(next)
  }

  return (
      <div className="min-h-screen bg-background">
        {/* Application header */}
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Grid3X3 size={23} />
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  Caro AI Lab
                </h1>

                <p className="hidden text-xs text-muted-foreground sm:block">
                  Adversarial Search Playground
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className="hidden bg-background sm:inline-flex">
                9 × 9
              </Badge>

              <button
                  type="button"
                  onClick={refresh}
                  aria-label="Kiểm tra kết nối backend"
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
              <span
                  className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      connection === 'online'
                          ? 'bg-emerald-500'
                          : connection === 'offline'
                              ? 'bg-red-500'
                              : 'bg-amber-400',
                  )}
              />

                {connection === 'online'
                    ? 'Backend online'
                    : connection === 'offline'
                        ? 'Kết nối lại'
                        : 'Đang kết nối'}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Page heading */}
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Playground
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Đấu trường Caro
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Thi đấu và khám phá các thuật toán
              tìm kiếm đối kháng.
            </p>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_285px]">
            {/* Left panel */}
            <MatchSettings
                value={settings}
                agents={agents}
                connection={connection}
                locked={started}
                onChange={updateSettings}
                onStart={startMatch}
                onReset={reset}
            />

            {/* Center panel */}
            <GameBoard
                game={game}
                playerNames={{
                  1: playerName(1),
                  2: playerName(2),
                }}
                lastMove={latest?.move ?? null}
                started={started}
                paused={paused}
                aiTurn={aiTurn}
                error={error}
                onMove={humanMove}
                onTogglePause={() =>
                    setPaused(
                        (previous) => !previous,
                    )
                }
                onRetry={() => setError('')}
            />

            {/* Right panel */}
            <div className="grid gap-5 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
              {/* Live statistics */}
              <Card className="lab-panel">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Activity size={18} />
                    Thống kê trực tiếp
                  </CardTitle>

                  <p className="text-xs text-muted-foreground">
                    Số liệu từ quá trình suy luận.
                  </p>
                </CardHeader>

                <CardContent className="pt-5">
                  <div className="grid grid-cols-2 gap-2">
                    <StatItem
                        label="Số nước đi"
                        value={logs.length}
                    />

                    <StatItem
                        label="Thời gian TB"
                        value={
                          averageTime === null
                              ? '—'
                              : `${formatNumber(
                                  averageTime,
                              )} ms`
                        }
                    />

                    <StatItem
                        label="Thời gian gần nhất"
                        value={
                          lastAI?.metrics
                              ? `${formatNumber(
                                  lastAI.metrics.elapsed_ms,
                              )} ms`
                              : '—'
                        }
                    />

                    <StatItem
                        label="Số nút duyệt"
                        value={formatNumber(
                            lastAI?.metrics?.nodes,
                        )}
                    />

                    <StatItem
                        label="Số lần cắt"
                        value={formatNumber(
                            lastAI?.metrics?.cutoffs,
                        )}
                    />

                    <StatItem
                        label="Iterations"
                        value={formatNumber(
                            lastAI?.metrics?.iterations,
                        )}
                    />
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Các chỉ số không được thuật toán
                    cung cấp sẽ hiển thị dấu —.
                  </p>
                </CardContent>
              </Card>

              {/* Move history */}
              <Card className="lab-panel">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit size={18} />
                    Nhật ký nước đi
                  </CardTitle>

                  <p className="text-xs text-muted-foreground">
                    Lịch sử các quyết định trong ván.
                  </p>
                </CardHeader>

                <CardContent className="pt-5">
                  {logs.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-10 text-center">
                        <BrainCircuit
                            size={25}
                            className="text-slate-400"
                        />

                        <p className="text-xs font-medium">
                          Chưa có nước đi
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Nhật ký sẽ xuất hiện khi
                          trận đấu bắt đầu.
                        </p>
                      </div>
                  ) : (
                      <div className="max-h-[420px] overflow-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-card text-muted-foreground">
                          <tr>
                            <th className="pb-3 font-medium">
                              #
                            </th>

                            <th className="pb-3 font-medium">
                              Quân
                            </th>

                            <th className="pb-3 font-medium">
                              Ô (r, c)
                            </th>

                            <th className="pb-3 text-right font-medium">
                              ms
                            </th>
                          </tr>
                          </thead>

                          <tbody>
                          {logs.map((log, index) => (
                              <tr
                                  key={index}
                                  className="border-t hover:bg-muted"
                              >
                                <td className="py-2.5 text-muted-foreground">
                                  {index + 1}
                                </td>

                                <td
                                    title={log.algorithm}
                                    className={cn(
                                        'font-bold',
                                        log.player === 1
                                            ? 'text-blue-700'
                                            : 'text-rose-600',
                                    )}
                                >
                                  {symbol(log.player)}
                                </td>

                                <td>
                                  ({log.move.join(', ')})
                                </td>

                                <td className="text-right tabular-nums">
                                  {formatNumber(
                                      log.metrics?.elapsed_ms,
                                  )}
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <footer className="mt-8 border-t py-5 text-center text-xs text-muted-foreground">
            Caro AI Lab · UET Artificial Intelligence Project
          </footer>
        </main>
      </div>
  )
}

export default App
