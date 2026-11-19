import {
    Bot,
    Circle,
    Pause,
    Play,
    Trophy,
    X,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GameCell } from './GameCell'
import { cn } from '@/lib/utils'

import {
    symbol,
    winningLine,
    type Game,
    type Move,
    type Player,
} from '@/lib/game'

interface PlayerCardProps {
    player: Player
    name: string
    isActive: boolean
    isWinner: boolean
}

function PlayerCard({
                        player,
                        name,
                        isActive,
                        isWinner,
                    }: PlayerCardProps) {
    return (
        <div
            className={cn(
                'flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors',
                isActive && 'border-slate-400 bg-slate-50',
                isWinner &&
                'border-emerald-300 bg-emerald-50',
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
                    <Circle size={22} strokeWidth={2.8} />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                    Quân {symbol(player)}
                </p>

                <p
                    className="truncate text-sm font-semibold"
                    title={name}
                >
                    {name}
                </p>

                {isActive && (
                    <p className="mt-1 text-[10px] font-medium text-blue-700">
                        Đang đến lượt
                    </p>
                )}
            </div>

            {isWinner && (
                <Trophy
                    size={18}
                    className="shrink-0 text-emerald-600"
                    aria-label="Người chiến thắng"
                />
            )}
        </div>
    )
}

interface GameBoardProps {
    game: Game
    playerNames: Record<Player, string>
    lastMove: Move | null
    started: boolean
    paused: boolean
    aiTurn: boolean
    error: string
    onMove: (move: Move) => void
    onTogglePause: () => void
    onRetry: () => void
}

export function GameBoard({
                              game,
                              playerNames,
                              lastMove,
                              started,
                              paused,
                              aiTurn,
                              error,
                              onMove,
                              onTogglePause,
                              onRetry,
                          }: GameBoardProps) {
    const finished = game.winner !== null

    const boardDisabled =
        !started || paused || aiTurn || finished

    const winLine =
        game.winner !== null &&
        game.winner !== 0 &&
        lastMove
            ? winningLine(game.board, ...lastMove)
            : []

    const winningCells = new Set(
        winLine.map(([row, col]) => `${row},${col}`),
    )

    const status =
        game.winner === 0
            ? 'Hòa'
            : game.winner !== null
                ? `${symbol(game.winner)} thắng`
                : !started
                    ? 'Chờ bắt đầu'
                    : paused
                        ? 'Tạm dừng'
                        : `Lượt ${symbol(game.to_move)}`

    function renderMatchMessage() {
        if (error) {
            return 'Không thể hoàn thành lượt máy'
        }

        if (game.winner === 0) {
            return 'Ván đấu kết thúc với kết quả hòa'
        }

        if (game.winner !== null) {
            return (
                <>
                    <Trophy
                        size={18}
                        className="text-emerald-600"
                    />

                    Quân {symbol(game.winner)} chiến thắng!
                </>
            )
        }

        if (!started) {
            return 'Cấu hình và bắt đầu trận đấu'
        }

        if (paused) {
            return 'Trận đấu đang tạm dừng'
        }

        if (aiTurn) {
            return (
                <>
                    <Bot
                        size={18}
                        className="animate-pulse"
                    />

                    AI đang suy luận...
                </>
            )
        }

        return 'Đến lượt người chơi'
    }

    return (
        <Card className="lab-panel min-w-0 overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b">
                <div>
                    <CardTitle>Ván đấu</CardTitle>

                    <p className="mt-1 text-xs text-muted-foreground">
                        5 quân liên tiếp để chiến thắng
                    </p>
                </div>

                <Badge
                    className={cn(
                        game.winner === 0
                            ? 'bg-muted text-muted-foreground'
                            : finished
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : paused
                                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                                    : 'bg-background',
                    )}
                >
                    {status}
                </Badge>
            </CardHeader>

            <CardContent className="pt-5">
                <div className="mb-5 grid grid-cols-2 gap-3">
                    <PlayerCard
                        player={1}
                        name={playerNames[1]}
                        isActive={
                            started &&
                            !paused &&
                            !finished &&
                            game.to_move === 1
                        }
                        isWinner={game.winner === 1}
                    />

                    <PlayerCard
                        player={2}
                        name={playerNames[2]}
                        isActive={
                            started &&
                            !paused &&
                            !finished &&
                            game.to_move === 2
                        }
                        isWinner={game.winner === 2}
                    />
                </div>

                <div
                    className="mx-auto w-full max-w-[590px]"
                    role="group"
                    aria-label="Bàn cờ Caro 9 nhân 9"
                >
                    <div className="grid grid-cols-[22px_repeat(9,minmax(0,1fr))] items-center text-center text-[11px] text-muted-foreground">
                        <div />

                        {Array.from(
                            { length: 9 },
                            (_, col) => (
                                <div
                                    key={col}
                                    className="pb-2"
                                >
                                    {col}
                                </div>
                            ),
                        )}

                        {game.board.map((row, rowIndex) => (
                            <div
                                key={rowIndex}
                                className="contents"
                            >
                                <div className="pr-1">
                                    {rowIndex}
                                </div>

                                {row.map((cell, colIndex) => (
                                    <GameCell
                                        key={colIndex}
                                        row={rowIndex}
                                        col={colIndex}
                                        value={cell}
                                        currentPlayer={game.to_move}
                                        disabled={boardDisabled}
                                        isLastMove={
                                            lastMove?.[0] === rowIndex &&
                                            lastMove?.[1] === colIndex
                                        }
                                        isWinningCell={winningCells.has(
                                            `${rowIndex},${colIndex}`,
                                        )}
                                        onMove={onMove}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Board legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-sm border bg-blue-50" />
                        Nước đi gần nhất
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-sm border bg-emerald-100" />
                        Chuỗi chiến thắng
                    </div>
                </div>

                {/* Match controls */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div
                        aria-live="polite"
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                        {renderMatchMessage()}
                    </div>

                    {started && !finished && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onTogglePause}
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
                            type="button"
                            className="ml-2 font-medium underline"
                            onClick={onRetry}
                        >
                            Thử lại
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
