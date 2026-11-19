import { useEffect, useState } from 'react'
import {
  Activity,
  Bot,
  BrainCircuit,
  Circle,
  Grid3X3,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  UserRound,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import {
  getAgents,
  getMove,
  names,
  type Algorithm,
  type AgentStatus,
  type Config,
  type Metrics,
} from '@/lib/api'

import {
  initialGame,
  play,
  symbol,
  winningLine,
  type Move,
  type Player,
} from '@/lib/game'

type Mode = 'human' | 'ai'

type Log = {
  player: Player
  move: Move
  algorithm: string
  metrics?: Metrics
}

type Connection = 'loading' | 'online' | 'offline'

const defaults: Config = {
  depth: 2,
  candidate_limit: 10,
  pruning: true,
  iterations: 300,
  c: 1.4,
  rollout: 'random',
}

const players: Player[] = [1, 2]

const inputStyle = 'lab-control'

function formatNumber(value: number | null | undefined) {
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
  // Agent and connection state
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [connection, setConnection] =
      useState<Connection>('loading')

  // Match configuration
  const [mode, setMode] = useState<Mode>('human')
  const [human, setHuman] = useState<Player>(1)

  const [xAgent, setXAgent] =
      useState<Algorithm>('random')

  const [oAgent, setOAgent] =
      useState<Algorithm>('random')

  const [config, setConfig] =
      useState<Config>(defaults)

  const [delay, setDelay] = useState(350)

  // Match state
  const [game, setGame] = useState(initialGame)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)

  // Logging and errors
  const [logs, setLogs] = useState<Log[]>([])
  const [error, setError] = useState('')

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
    return mode === 'human' && player === human
  }

  function agentFor(player: Player): Algorithm {
    return player === 1 ? xAgent : oAgent
  }

  const pending = players.filter(
      (player) =>
          !isHuman(player) &&
          !agents.some(
              (agent) =>
                  agent.id === agentFor(player) &&
                  agent.ready,
          ),
  )

  const activeAlgorithms = players
      .filter((player) => !isHuman(player))
      .map(agentFor)

  const aiTurn =
      started &&
      game.winner === null &&
      !isHuman(game.to_move)

  const locked = started

  const latest = logs.at(-1)

  const aiLogs = logs.filter(
      (log) => log.metrics !== undefined,
  )

  const lastAI = aiLogs.at(-1)

  const averageTime = aiLogs.length
      ? aiLogs.reduce(
      (sum, log) => sum + log.metrics!.elapsed_ms,
      0,
  ) / aiLogs.length
      : null

  const line =
      game.winner !== null &&
      game.winner !== 0 &&
      latest
          ? winningLine(game.board, ...latest.move)
          : []

  // Request an AI move whenever it becomes the AI's turn.
  useEffect(() => {
    if (!aiTurn || paused || error) return

    const controller = new AbortController()

    const timer = window.setTimeout(async () => {
      try {
        const algorithm =
            game.to_move === 1 ? xAgent : oAgent

        const next = await getMove(
            game,
            algorithm,
            config,
            controller.signal,
        )

        if (controller.signal.aborted) return

        setLogs((previous) => [
          ...previous,
          {
            player: game.to_move,
            move: next.move,
            algorithm: names[algorithm],
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
    }, delay)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [
    aiTurn,
    paused,
    error,
    game,
    xAgent,
    oAgent,
    config,
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
        pending.length > 0
    ) {
      return
    }

    setError('')
    setPaused(false)
    setStarted(true)
  }

  function humanMove(move: Move) {
    const [row, col] = move

    if (
        !started ||
        paused ||
        !isHuman(game.to_move) ||
        game.winner !== null ||
        game.board[row][col] !== 0
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

  function setNum(
      key: 'depth' | 'candidate_limit' | 'iterations' | 'c',
      value: number,
  ) {
    setConfig((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  function renderAlgorithmSelect(player: Player) {
    return (
        <label className="block space-y-2 text-sm font-medium">
          <span>Quân {symbol(player)}</span>

          {isHuman(player) ? (
              <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                <UserRound size={15} />
                Người chơi
              </div>
          ) : (
              <select
                  className={inputStyle}
                  disabled={locked}
                  value={agentFor(player)}
                  onChange={(event) => {
                    const algorithm =
                        event.target.value as Algorithm

                    if (player === 1) {
                      setXAgent(algorithm)
                    } else {
                      setOAgent(algorithm)
                    }
                  }}
              >
                {Object.entries(names).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                      {agents.some(
                          (agent) =>
                              agent.id === id && agent.ready,
                      )
                          ? ''
                          : ' (chưa tích hợp)'}
                    </option>
                ))}
              </select>
          )}
        </label>
    )
  }

  const matchStatus =
      game.winner === 0
          ? 'Hòa'
          : game.winner !== null
              ? `${symbol(game.winner)} thắng`
              : !started
                  ? 'Chờ bắt đầu'
                  : paused
                      ? 'Tạm dừng'
                      : `Lượt ${symbol(game.to_move)}`

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
              Thi đấu và khám phá các thuật toán tìm kiếm
              đối kháng.
            </p>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_285px]">
            {/* Left panel: Match configuration */}
            <Card className="lab-panel">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Settings2 size={18} />
                  Cấu hình trận đấu
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                  Thiết lập người chơi và thuật toán.
                </p>
              </CardHeader>

              <CardContent className="space-y-5 pt-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Chế độ chơi
                  </p>

                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                    {(['human', 'ai'] as Mode[]).map(
                        (item) => (
                            <button
                                key={item}
                                disabled={locked}
                                aria-pressed={mode === item}
                                onClick={() => setMode(item)}
                                className={cn(
                                    'rounded-md px-2 py-2 text-xs font-medium transition-colors disabled:opacity-60',
                                    mode === item
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                              {item === 'human'
                                  ? 'Người vs Máy'
                                  : 'Máy vs Máy'}
                            </button>
                        ),
                    )}
                  </div>
                </div>

                {mode === 'human' && (
                    <label className="block space-y-2 text-sm font-medium">
                      <span>Bạn chơi quân</span>

                      <select
                          className={inputStyle}
                          disabled={locked}
                          value={human}
                          onChange={(event) =>
                              setHuman(
                                  Number(event.target.value) as Player,
                              )
                          }
                      >
                        <option value={1}>X — đi trước</option>
                        <option value={2}>O — đi sau</option>
                      </select>
                    </label>
                )}

                {renderAlgorithmSelect(1)}
                {renderAlgorithmSelect(2)}

                {/* MiniMax parameters */}
                {activeAlgorithms.includes('minimax') && (
                    <div className="space-y-4 border-t pt-4">
                      <p className="text-sm font-semibold">
                        Tham số MiniMax
                      </p>

                      <label className="block space-y-2 text-xs font-medium">
                        <span>Độ sâu tìm kiếm</span>

                        <select
                            className={inputStyle}
                            disabled={locked}
                            value={config.depth}
                            onChange={(event) =>
                                setNum(
                                    'depth',
                                    Number(event.target.value),
                                )
                            }
                        >
                          {[2, 3, 4, 5].map((depth) => (
                              <option key={depth} value={depth}>
                                {depth}
                              </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-2 text-xs font-medium">
                        <span>Giới hạn ứng viên</span>

                        <select
                            className={inputStyle}
                            disabled={locked}
                            value={config.candidate_limit}
                            onChange={(event) =>
                                setNum(
                                    'candidate_limit',
                                    Number(event.target.value),
                                )
                            }
                        >
                          {[5, 10, 15, 20, 0].map((limit) => (
                              <option key={limit} value={limit}>
                                {limit || 'Không giới hạn'}
                              </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-medium">
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-slate-900"
                            disabled={locked}
                            checked={config.pruning}
                            onChange={(event) =>
                                setConfig((previous) => ({
                                  ...previous,
                                  pruning: event.target.checked,
                                }))
                            }
                        />

                        Alpha-Beta Pruning
                      </label>
                    </div>
                )}

                {/* MCTS parameters */}
                {activeAlgorithms.includes('mcts') && (
                    <div className="space-y-4 border-t pt-4">
                      <p className="text-sm font-semibold">
                        Tham số MCTS
                      </p>

                      <label className="block space-y-2 text-xs font-medium">
                        <span>Số iterations</span>

                        <select
                            className={inputStyle}
                            disabled={locked}
                            value={config.iterations}
                            onChange={(event) =>
                                setNum(
                                    'iterations',
                                    Number(event.target.value),
                                )
                            }
                        >
                          {[100, 300, 500, 1000, 3000].map(
                              (iterations) => (
                                  <option
                                      key={iterations}
                                      value={iterations}
                                  >
                                    {iterations}
                                  </option>
                              ),
                          )}
                        </select>
                      </label>

                      <label className="block space-y-2 text-xs font-medium">
                        <span>Hệ số khám phá UCT (c)</span>

                        <select
                            className={inputStyle}
                            disabled={locked}
                            value={config.c}
                            onChange={(event) =>
                                setNum(
                                    'c',
                                    Number(event.target.value),
                                )
                            }
                        >
                          {[0.5, 1, 1.4, 2].map((value) => (
                              <option key={value} value={value}>
                                {value.toFixed(1)}
                              </option>
                          ))}
                        </select>
                      </label>
                    </div>
                )}

                <label className="block space-y-2 border-t pt-4 text-xs font-medium">
                  <span>Khoảng nghỉ trước lượt máy</span>

                  <select
                      className={inputStyle}
                      value={delay}
                      onChange={(event) =>
                          setDelay(Number(event.target.value))
                      }
                  >
                    <option value={0}>Không nghỉ</option>
                    <option value={350}>350 ms</option>
                    <option value={800}>800 ms</option>
                  </select>
                </label>

                {!locked &&
                    connection === 'online' &&
                    pending.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                          Thuật toán đã chọn chưa được tích hợp.
                          Hãy chọn Random để thử nghiệm.
                        </div>
                    )}

                {connection === 'offline' && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800">
                      Không thể kết nối backend. Hãy kiểm tra
                      server FastAPI.
                    </div>
                )}

                <div className="space-y-2">
                  <Button
                      className="w-full"
                      disabled={
                          locked ||
                          connection !== 'online' ||
                          pending.length > 0
                      }
                      onClick={startMatch}
                  >
                    <Play size={15} />
                    Bắt đầu trận
                  </Button>

                  <Button
                      variant="outline"
                      className="w-full"
                      onClick={reset}
                  >
                    <RotateCcw size={15} />
                    Trận mới
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Center panel: Game board */}
            <Card className="lab-panel overflow-hidden">
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
                <div>
                  <CardTitle>Ván đấu</CardTitle>

                  <p className="mt-1 text-xs text-muted-foreground">
                    5 quân liên tiếp để chiến thắng
                  </p>
                </div>

                <Badge
                    className={cn(
                        game.winner !== null
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'bg-background',
                    )}
                >
                  {matchStatus}
                </Badge>
              </CardHeader>

              <CardContent className="pt-5">
                {/* Player status */}
                <div className="mb-5 grid grid-cols-2 gap-3">
                  {players.map((player) => (
                      <div
                          key={player}
                          className={cn(
                              'flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors',
                              started &&
                              game.winner === null &&
                              game.to_move === player &&
                              'border-slate-400 bg-slate-50',
                          )}
                      >
                        <div
                            className={cn(
                                'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
                                player === 1
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-rose-50 text-rose-600',
                            )}
                        >
                          {player === 1 ? (
                              <X size={24} strokeWidth={2.8} />
                          ) : (
                              <Circle
                                  size={22}
                                  strokeWidth={2.8}
                              />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Quân {symbol(player)}
                          </p>

                          <p
                              className="truncate text-sm font-semibold"
                              title={
                                isHuman(player)
                                    ? 'Người chơi'
                                    : names[agentFor(player)]
                              }
                          >
                            {isHuman(player)
                                ? 'Người chơi'
                                : names[agentFor(player)]}
                          </p>
                        </div>
                      </div>
                  ))}
                </div>

                {/* Board */}
                <div className="mx-auto w-full max-w-[590px]">
                  <div className="grid grid-cols-[22px_repeat(9,minmax(0,1fr))] items-center text-center text-[11px] text-muted-foreground">
                    <div />

                    {Array.from(
                        { length: 9 },
                        (_, col) => (
                            <div key={col} className="pb-2">
                              {col}
                            </div>
                        ),
                    )}

                    {game.board.map((row, rowIndex) => (
                        <div
                            className="contents"
                            key={rowIndex}
                        >
                          <div className="pr-1">
                            {rowIndex}
                          </div>

                          {row.map((cell, colIndex) => {
                            const win = line.some(
                                ([row, col]) =>
                                    row === rowIndex &&
                                    col === colIndex,
                            )

                            const last =
                                latest?.move[0] === rowIndex &&
                                latest?.move[1] === colIndex

                            return (
                                <button
                                    key={colIndex}
                                    type="button"
                                    aria-label={`Hàng ${rowIndex}, cột ${colIndex}: ${
                                        cell === 0
                                            ? 'trống'
                                            : symbol(cell)
                                    }`}
                                    disabled={
                                        !started ||
                                        paused ||
                                        aiTurn ||
                                        game.winner !== null ||
                                        cell !== 0
                                    }
                                    onClick={() =>
                                        humanMove([
                                          rowIndex,
                                          colIndex,
                                        ])
                                    }
                                    className={cn(
                                        'lab-cell',
                                        rowIndex === 0 &&
                                        'border-t',
                                        colIndex === 0 &&
                                        'border-l',
                                        last && 'lab-cell-last',
                                        win && 'lab-cell-win',
                                    )}
                                >
                                  {cell === 1 ? (
                                      <X
                                          className="h-3/5 w-3/5 text-blue-700"
                                          strokeWidth={2.6}
                                      />
                                  ) : cell === 2 ? (
                                      <Circle
                                          className="h-[52%] w-[52%] text-rose-600"
                                          strokeWidth={2.6}
                                      />
                                  ) : (
                                      <span className="h-1 w-1 rounded-full bg-slate-200" />
                                  )}

                                  {last && (
                                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
                                  )}
                                </button>
                            )
                          })}
                        </div>
                    ))}
                  </div>
                </div>

                {/* Match controls */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <div
                      aria-live="polite"
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    {error ? (
                        'Không thể hoàn thành lượt máy'
                    ) : aiTurn && !paused ? (
                        <>
                          <Bot
                              size={18}
                              className="animate-pulse"
                          />
                          AI đang suy luận...
                        </>
                    ) : game.winner !== null ? (
                        'Ván đấu đã kết thúc'
                    ) : !started ? (
                        'Cấu hình và bắt đầu trận đấu'
                    ) : paused ? (
                        'Trận đấu đang tạm dừng'
                    ) : (
                        'Đến lượt người chơi'
                    )}
                  </div>

                  {started && game.winner === null && (
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                              setPaused((previous) => !previous)
                          }
                      >
                        {paused ? (
                            <Play size={14} />
                        ) : (
                            <Pause size={14} />
                        )}

                        {paused ? 'Tiếp tục' : 'Tạm dừng'}
                      </Button>
                  )}
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                      {error}

                      <button
                          className="ml-2 font-medium underline"
                          onClick={() => setError('')}
                      >
                        Thử lại
                      </button>
                    </div>
                )}
              </CardContent>
            </Card>

            {/* Right panel: Metrics and move history */}
            <div className="grid gap-5 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
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
                              : `${formatNumber(averageTime)} ms`
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
                    Các chỉ số không được thuật toán cung cấp
                    sẽ hiển thị dấu —.
                  </p>
                </CardContent>
              </Card>

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
                          Nhật ký sẽ xuất hiện khi trận đấu
                          bắt đầu.
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
