import {
    Activity,
    Circle,
    Clock3,
    X,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import {
    calculateStatistics,
    formatNumber,
    formatTime,
    type MoveLog,
} from '@/lib/statistics'

import {
    symbol,
    type Player,
} from '@/lib/game'

import { cn } from '@/lib/utils'

interface GameStatisticsProps {
    logs: readonly MoveLog[]
    playerNames: Record<Player, string>
}

interface StatItemProps {
    label: string
    value: string | number
}

interface PlayerStatisticsProps {
    player: Player
    name: string
    logs: readonly MoveLog[]
}

function StatItem({
                      label,
                      value,
                  }: StatItemProps) {
    return (
        <div className="lab-stat">
            <p className="text-[11px] text-muted-foreground">
                {label}
            </p>

            <p className="mt-1 break-words text-lg font-semibold tabular-nums">
                {value}
            </p>
        </div>
    )
}

function MetricRow({
                       label,
                       value,
                   }: StatItemProps) {
    return (
        <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>

            <span className="text-right text-xs font-semibold tabular-nums">
        {value}
      </span>
        </div>
    )
}

function PlayerStatistics({
                              player,
                              name,
                              logs,
                          }: PlayerStatisticsProps) {
    const stats =
        calculateStatistics(logs, player)

    const last =
        stats.lastMetrics

    return (
        <div className="space-y-3 rounded-lg border p-3">
            {/* Player information */}
            <div className="flex items-center gap-2">
                <div
                    className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-lg',

                        player === 1
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-600',
                    )}
                >
                    {player === 1 ? (
                        <X size={21} strokeWidth={2.8} />
                    ) : (
                        <Circle
                            size={19}
                            strokeWidth={2.8}
                        />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                        Quân {symbol(player)}
                    </p>

                    <p
                        className="truncate text-[11px] text-muted-foreground"
                        title={name}
                    >
                        {name}
                    </p>
                </div>

                <span className="shrink-0 text-[11px] text-muted-foreground">
          {stats.totalMoves} nước
        </span>
            </div>

            {/* Player timing */}
            <div className="space-y-2 border-t pt-3">
                <MetricRow
                    label="Số quyết định AI"
                    value={stats.aiMoves}
                />

                <MetricRow
                    label="Thời gian trung bình"
                    value={formatTime(
                        stats.averageTime,
                    )}
                />

                <MetricRow
                    label="Tổng thời gian"
                    value={formatTime(
                        stats.totalTime,
                    )}
                />

                <MetricRow
                    label="Nhanh nhất"
                    value={formatTime(
                        stats.minTime,
                    )}
                />

                <MetricRow
                    label="Chậm nhất"
                    value={formatTime(
                        stats.maxTime,
                    )}
                />
            </div>

            {/* Latest search metrics */}
            <div className="space-y-2 border-t pt-3">
                <p className="text-[11px] font-medium text-muted-foreground">
                    Quyết định AI gần nhất
                </p>

                <MetricRow
                    label="Thời gian"
                    value={formatTime(
                        last?.elapsed_ms,
                    )}
                />

                <MetricRow
                    label="Số nút duyệt"
                    value={formatNumber(
                        last?.nodes,
                    )}
                />

                <MetricRow
                    label="Số lần cắt"
                    value={formatNumber(
                        last?.cutoffs,
                    )}
                />

                <MetricRow
                    label="Iterations"
                    value={formatNumber(
                        last?.iterations,
                    )}
                />

                <MetricRow
                    label="Độ sâu"
                    value={formatNumber(
                        last?.depth,
                    )}
                />

                <MetricRow
                    label="Giá trị đánh giá"
                    value={formatNumber(
                        last?.value,
                    )}
                />
            </div>
        </div>
    )
}

export function GameStatistics({
                                   logs,
                                   playerNames,
                               }: GameStatisticsProps) {
    const stats =
        calculateStatistics(logs)

    return (
        <Card className="lab-panel min-w-0">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <Activity size={18} />
                    Thống kê trực tiếp
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                    Theo dõi hiệu năng của từng phía.
                </p>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
                {/* Overall statistics */}
                <div className="grid grid-cols-2 gap-2">
                    <StatItem
                        label="Tổng số nước"
                        value={stats.totalMoves}
                    />

                    <StatItem
                        label="Số nước AI"
                        value={stats.aiMoves}
                    />

                    <StatItem
                        label="Thời gian AI TB"
                        value={formatTime(
                            stats.averageTime,
                        )}
                    />

                    <StatItem
                        label="Tổng thời gian AI"
                        value={formatTime(
                            stats.totalTime,
                        )}
                    />
                </div>

                {/* Per-player statistics */}
                <PlayerStatistics
                    player={1}
                    name={playerNames[1]}
                    logs={logs}
                />

                <PlayerStatistics
                    player={2}
                    name={playerNames[2]}
                    logs={logs}
                />

                <div className="flex items-start gap-2 rounded-md bg-muted p-3">
                    <Clock3
                        size={15}
                        className="mt-0.5 shrink-0 text-muted-foreground"
                    />

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Thời gian được đo tại backend,
                        không bao gồm độ trễ mạng và
                        khoảng nghỉ giữa các lượt.
                        Chỉ số không được cung cấp
                        hiển thị dấu —.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
