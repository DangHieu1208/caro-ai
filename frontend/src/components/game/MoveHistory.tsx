import { useState } from 'react'

import {
    Download,
    History,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from '@/components/ui/tabs'

import {
    downloadMatchCsv,
    formatTime,
    type MoveLog,
} from '@/lib/statistics'

import {
    symbol,
    type Winner,
} from '@/lib/game'

import { cn } from '@/lib/utils'

type HistoryFilter =
    | 'all'
    | 'x'
    | 'o'

interface MoveHistoryProps {
    logs: readonly MoveLog[]
    winner: Winner
}

interface HistoryTableProps {
    logs: readonly MoveLog[]
    filter: HistoryFilter
}

function HistoryTable({
                          logs,
                          filter,
                      }: HistoryTableProps) {
    const visibleLogs = logs
        .map((log, index) => ({
            ...log,
            moveNumber: index + 1,
        }))
        .filter((log) => {
            if (filter === 'x') {
                return log.player === 1
            }

            if (filter === 'o') {
                return log.player === 2
            }

            return true
        })
        .reverse()

    if (visibleLogs.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-8 text-center">
                <History
                    size={24}
                    className="text-slate-400"
                />

                <p className="text-xs font-medium">
                    Chưa có nước đi
                </p>

                <p className="text-[11px] text-muted-foreground">
                    Nhật ký sẽ xuất hiện khi
                    người chơi đặt quân.
                </p>
            </div>
        )
    }

    return (
        <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-card text-muted-foreground">
                <tr>
                    <th className="pb-3 pr-2 font-medium">
                        #
                    </th>

                    <th className="pb-3 pr-2 font-medium">
                        Quân
                    </th>

                    <th className="pb-3 pr-2 font-medium">
                        Ô (r, c)
                    </th>

                    <th className="pb-3 text-right font-medium">
                        Thời gian
                    </th>
                </tr>
                </thead>

                <tbody>
                {visibleLogs.map((log) => {
                    const isLatest =
                        log.moveNumber === logs.length

                    return (
                        <tr
                            key={log.moveNumber}
                            className={cn(
                                'border-t transition-colors hover:bg-muted',

                                isLatest && 'bg-blue-50/60',
                            )}
                        >
                            <td className="py-3 pr-2 text-muted-foreground">
                                {log.moveNumber}
                            </td>

                            <td className="py-3 pr-2">
                  <span
                      title={log.algorithm}
                      className={cn(
                          'font-bold',

                          log.player === 1
                              ? 'text-blue-700'
                              : 'text-rose-600',
                      )}
                  >
                    {symbol(log.player)}
                  </span>
                            </td>

                            <td className="whitespace-nowrap py-3 pr-2">
                                ({log.move.join(', ')})
                            </td>

                            <td
                                title={log.algorithm}
                                className="whitespace-nowrap py-3 text-right tabular-nums"
                            >
                                {formatTime(
                                    log.metrics?.elapsed_ms,
                                )}
                            </td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}

export function MoveHistory({
                                logs,
                                winner,
                            }: MoveHistoryProps) {
    const [filter, setFilter] =
        useState<HistoryFilter>('all')

    const xCount = logs.filter(
        (log) => log.player === 1,
    ).length

    const oCount = logs.filter(
        (log) => log.player === 2,
    ).length

    return (
        <Card className="lab-panel min-w-0">
            <CardHeader className="border-b">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                        <History size={18} />
                        Nhật ký nước đi
                    </CardTitle>

                    <Badge className="bg-muted">
                        {logs.length}
                    </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                    Theo dõi từng quyết định trong ván.
                </p>
            </CardHeader>

            <CardContent className="space-y-4 pt-5">
                <Tabs
                    value={filter}
                    onValueChange={(value) => {
                        if (
                            value === 'all' ||
                            value === 'x' ||
                            value === 'o'
                        ) {
                            setFilter(value)
                        }
                    }}
                >
                    <TabsList
                        aria-label="Lọc lịch sử nước đi"
                        className="grid w-full grid-cols-3"
                    >
                        <TabsTrigger
                            value="all"
                            className="px-1 text-xs"
                        >
                            Tất cả
                        </TabsTrigger>

                        <TabsTrigger
                            value="x"
                            className="px-1 text-xs"
                        >
                            X ({xCount})
                        </TabsTrigger>

                        <TabsTrigger
                            value="o"
                            className="px-1 text-xs"
                        >
                            O ({oCount})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                        <HistoryTable
                            logs={logs}
                            filter="all"
                        />
                    </TabsContent>

                    <TabsContent value="x">
                        <HistoryTable
                            logs={logs}
                            filter="x"
                        />
                    </TabsContent>

                    <TabsContent value="o">
                        <HistoryTable
                            logs={logs}
                            filter="o"
                        />
                    </TabsContent>
                </Tabs>

                <p className="text-[11px] text-muted-foreground">
                    Nước đi mới nhất được hiển thị
                    ở đầu danh sách.
                </p>

                <div className="space-y-2 border-t pt-4">
                    <Button
                        variant="outline"
                        className="w-full"
                        disabled={logs.length === 0}
                        onClick={() =>
                            downloadMatchCsv(
                                logs,
                                winner,
                            )
                        }
                    >
                        <Download size={15} />
                        Xuất CSV
                    </Button>

                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Xuất toàn bộ nước đi, tham số
                        thuật toán và số liệu suy luận
                        của ván hiện tại, không phụ
                        thuộc bộ lọc.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
