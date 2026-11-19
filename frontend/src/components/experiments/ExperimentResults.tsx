import { useState } from 'react'

import {
    BarChart3,
    Download,
    List,
    Monitor,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from '@/components/ui/tabs'

import {
    ExperimentCharts,
} from './ExperimentCharts'

import {
    downloadExperimentJson,
    type CaseResult,
    type ExperimentResult,
    type GameRecord,
    type Side,
} from '@/lib/experimentApi'

import {
    competitorDescription,
    competitorName,
    downloadExperimentCsv,
    formatMeasuredTime,
    getCompetitor,
    winnerName,
} from '@/lib/experimentAnalysis'

import {
    formatNumber,
} from '@/lib/statistics'

const cellStyle =
    'whitespace-nowrap px-3 py-3 align-top tabular-nums'

function TableHeader({
                         headings,
                     }: {
    headings: string[]
}) {
    return (
        <thead className="bg-muted text-muted-foreground">
        <tr>
            {headings.map((heading) => (
                <th
                    key={heading}
                    scope="col"
                    className="whitespace-nowrap px-3 py-3 text-left font-medium"
                >
                    {heading}
                </th>
            ))}
        </tr>
        </thead>
    )
}

function SummaryTable({
                          result,
                      }: {
    result: ExperimentResult
}) {
    const sides: Side[] = ['A', 'B']

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
                <TableHeader
                    headings={[
                        'Cấu hình',
                        'Đối thủ',
                        'Số ván',
                        'Thắng',
                        'Hòa',
                        'Thua',
                        'Win Rate',
                        'Số quyết định',
                        'Tổng thời gian',
                        'Thời gian TB',
                    ]}
                />

                <tbody>
                {result.cases.flatMap(
                    (item, caseIndex) =>
                        sides.map((side) => {
                            const competitor =
                                getCompetitor(item, side)

                            const summary =
                                side === 'A'
                                    ? item.result.summary_a
                                    : item.result.summary_b

                            return (
                                <tr
                                    key={`${item.id}-${side}`}
                                    className="border-b hover:bg-muted/30"
                                >
                                    <td className={cellStyle}>
                                        <p className="font-semibold">
                                            C{caseIndex + 1}
                                        </p>

                                        <p className="mt-1 whitespace-normal text-muted-foreground">
                                            {item.label}
                                        </p>
                                    </td>

                                    <td className="min-w-[210px] px-3 py-3">
                                        <p className="font-semibold">
                                            {side}: {competitorName(competitor)}
                                        </p>

                                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                            {competitorDescription(
                                                competitor,
                                            )}
                                        </p>
                                    </td>

                                    <td className={cellStyle}>
                                        {summary.games}
                                    </td>

                                    <td className={`${cellStyle} text-emerald-700`}>
                                        {summary.wins}
                                    </td>

                                    <td className={cellStyle}>
                                        {summary.draws}
                                    </td>

                                    <td className={`${cellStyle} text-red-700`}>
                                        {summary.losses}
                                    </td>

                                    <td className={`${cellStyle} font-semibold`}>
                                        {summary.win_rate.toFixed(1)}%
                                    </td>

                                    <td className={cellStyle}>
                                        {formatNumber(summary.ai_moves)}
                                    </td>

                                    <td className={cellStyle}>
                                        {formatMeasuredTime(
                                            summary.total_time_ms,
                                        )}
                                    </td>

                                    <td className={cellStyle}>
                                        {formatMeasuredTime(
                                            summary.average_time_ms,
                                        )}
                                    </td>
                                </tr>
                            )
                        }),
                )}
                </tbody>
            </table>
        </div>
    )
}

type WinnerFilter =
    | 'all'
    | 'A'
    | 'B'
    | 'draw'

function GamesTable({
                        item,
                        selectedGame,
                        onSelect,
                    }: {
    item: CaseResult
    selectedGame: number | null
    onSelect: (gameNumber: number) => void
}) {
    const [filter, setFilter] =
        useState<WinnerFilter>('all')

    const games =
        item.result.games.filter((game) => {
            if (filter === 'all') {
                return true
            }

            if (filter === 'draw') {
                return game.winner === 0
            }

            return game.winner_side === filter
        })

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                    Danh sách ván đấu
                </p>

                <div className="w-full sm:w-[190px]">
                    <Select
                        label="Lọc kết quả ván đấu"
                        value={filter}
                        options={[
                            {
                                value: 'all',
                                label: 'Tất cả kết quả',
                            },
                            {
                                value: 'A',
                                label: 'A chiến thắng',
                            },
                            {
                                value: 'B',
                                label: 'B chiến thắng',
                            },
                            {
                                value: 'draw',
                                label: 'Hòa',
                            },
                        ]}
                        onValueChange={(value) =>
                            setFilter(value as WinnerFilter)
                        }
                    />
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                Hiển thị {games.length}
                {' / '}
                {item.result.games.length} ván.
            </p>

            <div className="max-h-[400px] overflow-auto rounded-md border">
                <table className="w-full min-w-[650px] text-left text-xs">
                    <TableHeader
                        headings={[
                            'Ván',
                            'Cặp',
                            'Quân X',
                            'Quân O',
                            'Kết quả',
                            'Số nước',
                            'Chi tiết',
                        ]}
                    />

                    <tbody>
                    {games.map((game) => (
                        <tr
                            key={game.game_number}
                            className={
                                selectedGame === game.game_number
                                    ? 'border-t bg-blue-50'
                                    : 'border-t hover:bg-muted/40'
                            }
                        >
                            <td className={cellStyle}>
                                {game.game_number}
                            </td>

                            <td className={cellStyle}>
                                {game.pair_number}
                            </td>

                            <td className={`${cellStyle} font-medium text-blue-700`}>
                                {game.x_side}
                            </td>

                            <td className={`${cellStyle} font-medium text-rose-700`}>
                                {game.x_side === 'A' ? 'B' : 'A'}
                            </td>

                            <td className={cellStyle}>
                                <Badge
                                    className={
                                        game.winner === 0
                                            ? 'bg-muted'
                                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    }
                                >
                                    {winnerName(game)}
                                </Badge>
                            </td>

                            <td className={cellStyle}>
                                {game.moves.length}
                            </td>

                            <td className="px-3 py-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        onSelect(game.game_number)
                                    }
                                >
                                    Xem
                                </Button>
                            </td>
                        </tr>
                    ))}

                    {games.length === 0 && (
                        <tr>
                            <td
                                colSpan={7}
                                className="p-8 text-center text-muted-foreground"
                            >
                                Không có ván phù hợp bộ lọc.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function GameDetails({
                         item,
                         game,
                     }: {
    item: CaseResult
    game: GameRecord
}) {
    return (
        <div className="space-y-4 rounded-lg border p-4">
            <div>
                <h3 className="text-sm font-semibold">
                    Chi tiết ván {game.game_number}
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                    Cặp {game.pair_number}
                    {' · '}
                    Kết quả: {winnerName(game)}
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="lab-stat">
                    <p className="text-xs text-muted-foreground">
                        Quân X — {game.x_side}
                    </p>

                    <p className="mt-1 text-sm font-medium">
                        {competitorName(
                            getCompetitor(item, game.x_side),
                        )}
                    </p>
                </div>

                <div className="lab-stat">
                    <p className="text-xs text-muted-foreground">
                        Quân O — {game.x_side === 'A' ? 'B' : 'A'}
                    </p>

                    <p className="mt-1 text-sm font-medium">
                        {competitorName(
                            getCompetitor(
                                item,
                                game.x_side === 'A' ? 'B' : 'A',
                            ),
                        )}
                    </p>
                </div>
            </div>

            <p className="break-all text-xs text-muted-foreground">
                Pair seed:
                {' '}
                <span className="font-mono">
          {game.pair_seed}
        </span>
            </p>

            <div className="max-h-[440px] overflow-auto">
                <table className="w-full min-w-[950px] text-left text-xs">
                    <TableHeader
                        headings={[
                            'Ply',
                            'Quân',
                            'Đối thủ',
                            'Tọa độ',
                            'Thời gian',
                            'Nodes',
                            'Cutoffs',
                            'Iterations',
                            'Depth',
                            'Evaluation',
                            'Seed',
                        ]}
                    />

                    <tbody>
                    {game.moves.map((move) => (
                        <tr
                            key={move.ply}
                            className="border-b hover:bg-muted/30"
                        >
                            <td className={cellStyle}>
                                {move.ply}
                            </td>

                            <td className={cellStyle}>
                                {move.player === 1 ? 'X' : 'O'}
                            </td>

                            <td className={cellStyle}>
                                {move.side}
                            </td>

                            <td className={cellStyle}>
                                ({move.result.move.join(', ')})
                            </td>

                            <td className={cellStyle}>
                                {formatMeasuredTime(
                                    move.elapsed_ms,
                                )}
                            </td>

                            <td className={cellStyle}>
                                {formatNumber(move.result.nodes)}
                            </td>

                            <td className={cellStyle}>
                                {formatNumber(move.result.cutoffs)}
                            </td>

                            <td className={cellStyle}>
                                {formatNumber(
                                    move.result.iterations,
                                )}
                            </td>

                            <td className={cellStyle}>
                                {formatNumber(move.result.depth)}
                            </td>

                            <td className={cellStyle}>
                                {formatNumber(move.result.value)}
                            </td>

                            <td className={`${cellStyle} font-mono`}>
                                {move.seed}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-muted-foreground">
                Các chỉ số không được thuật toán
                cung cấp hiển thị dấu —.
            </p>
        </div>
    )
}

function GameExplorer({
                          result,
                      }: {
    result: ExperimentResult
}) {
    const [caseId, setCaseId] =
        useState(
            result.cases[0]?.id ?? '',
        )

    const [gameNumber, setGameNumber] =
        useState<number | null>(null)

    const selectedCase =
        result.cases.find(
            (item) => item.id === caseId,
        )

    const selectedGame =
        selectedCase?.result.games.find(
            (game) => game.game_number === gameNumber,
        )

    if (!selectedCase) {
        return (
            <p className="text-sm text-muted-foreground">
                Không có cấu hình để hiển thị.
            </p>
        )
    }

    return (
        <div className="space-y-5">
            <div className="max-w-[460px] space-y-2">
                <p className="text-sm font-medium">
                    Chọn cấu hình thực nghiệm
                </p>

                <Select
                    label="Cấu hình thực nghiệm"
                    value={caseId}
                    options={result.cases.map(
                        (item, index) => ({
                            value: item.id,
                            label: `C${index + 1}: ${item.label}`,
                        }),
                    )}
                    onValueChange={(value) => {
                        setCaseId(value)
                        setGameNumber(null)
                    }}
                />
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
                <p>
                    <strong>A: </strong>

                    {competitorDescription(
                        selectedCase.result.competitor_a,
                    )}
                </p>

                <p>
                    <strong>B: </strong>

                    {competitorDescription(
                        selectedCase.result.competitor_b,
                    )}
                </p>
            </div>

            <GamesTable
                key={selectedCase.id}
                item={selectedCase}
                selectedGame={gameNumber}
                onSelect={setGameNumber}
            />

            {selectedGame ? (
                <GameDetails
                    item={selectedCase}
                    game={selectedGame}
                />
            ) : (
                <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Chọn một ván để xem
                        nhật ký suy luận chi tiết.
                    </p>
                </div>
            )}
        </div>
    )
}

function EnvironmentDetails({
                                result,
                            }: {
    result: ExperimentResult
}) {
    const environment =
        result.environment

    const entries = [
        {
            label: 'Python',
            value: environment.python_version,
        },
        {
            label: 'Hệ điều hành',
            value: environment.operating_system,
        },
        {
            label: 'Kiến trúc',
            value: environment.machine,
        },
        {
            label: 'CPU',
            value: environment.processor,
        },
        {
            label: 'Logical CPUs',
            value: environment.logical_cpu_count,
        },
        {
            label: 'Execution mode',
            value: environment.execution_mode,
        },
        {
            label: 'Timing method',
            value: environment.timing_method,
        },
        {
            label: 'Git revision (do người chạy cung cấp)',
            value: result.source_revision,
        },
        {
            label: 'Random seed',
            value: result.request.seed,
        },
        {
            label: 'Job ID',
            value: result.job_id,
        },
        {
            label: 'Bắt đầu (UTC)',
            value: result.started_at,
        },
        {
            label: 'Kết thúc (UTC)',
            value: result.finished_at,
        },
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Monitor size={17} />

                <h3 className="text-sm font-semibold">
                    Môi trường thực nghiệm
                </h3>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                    <div
                        key={entry.label}
                        className="lab-stat"
                    >
                        <dt className="text-xs text-muted-foreground">
                            {entry.label}
                        </dt>

                        <dd className="mt-2 break-all text-sm font-medium">
                            {entry.value ?? 'Chưa cung cấp'}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}

export function ExperimentResults({
                                      result,
                                  }: {
    result: ExperimentResult
}) {
    const totalMoves = result.cases.reduce(
        (sum, item) =>
            sum +
            item.result.summary_a.ai_moves +
            item.result.summary_b.ai_moves,
        0,
    )

    const overview = [
        {
            label: 'Số cấu hình',
            value: result.cases.length,
        },
        {
            label: 'Tổng số ván',
            value: result.total_games,
        },
        {
            label: 'Tổng quyết định AI',
            value: totalMoves,
        },
    ]

    return (
        <div className="space-y-5">
            {/* Result overview and export */}
            <Card className="lab-panel min-w-0">
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 size={19} />

                        Kết quả thực nghiệm
                    </CardTitle>

                    <p className="text-xs text-muted-foreground">
                        Dữ liệu tổng hợp từ Experiment Runner.
                    </p>
                </CardHeader>

                <CardContent className="space-y-5 pt-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                        {overview.map((item) => (
                            <div
                                key={item.label}
                                className="lab-stat"
                            >
                                <p className="text-xs text-muted-foreground">
                                    {item.label}
                                </p>

                                <p className="mt-2 text-2xl font-bold tabular-nums">
                                    {formatNumber(item.value)}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                downloadExperimentJson(result)
                            }
                        >
                            <Download size={14} />
                            JSON
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                downloadExperimentCsv(
                                    result,
                                    'summary',
                                )
                            }
                        >
                            <Download size={14} />
                            Summary CSV
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                downloadExperimentCsv(
                                    result,
                                    'games',
                                )
                            }
                        >
                            <Download size={14} />
                            Games CSV
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                downloadExperimentCsv(
                                    result,
                                    'moves',
                                )
                            }
                        >
                            <Download size={14} />
                            Moves CSV
                        </Button>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                        JSON chứa toàn bộ dữ liệu gốc.
                        Các file CSV phục vụ lập bảng
                        và phân tích kết quả.
                        Hãy lưu dữ liệu trước khi
                        chạy thực nghiệm mới hoặc
                        khởi động lại Backend.
                    </p>
                </CardContent>
            </Card>

            {/* Charts */}
            <ExperimentCharts result={result} />

            {/* Detailed result explorer */}
            <Card className="lab-panel min-w-0">
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <List size={18} />

                        Dữ liệu chi tiết
                    </CardTitle>

                    <p className="text-xs text-muted-foreground">
                        Kiểm tra kết quả, ván đấu
                        và môi trường xử lý.
                    </p>
                </CardHeader>

                <CardContent className="pt-5">
                    <Tabs defaultValue="summary">
                        <TabsList className="flex h-auto w-full flex-wrap sm:w-fit">
                            <TabsTrigger value="summary">
                                Tổng hợp
                            </TabsTrigger>

                            <TabsTrigger value="games">
                                Ván đấu
                            </TabsTrigger>

                            <TabsTrigger value="environment">
                                Môi trường
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="summary">
                            <SummaryTable result={result} />
                        </TabsContent>

                        <TabsContent value="games">
                            <GameExplorer result={result} />
                        </TabsContent>

                        <TabsContent value="environment">
                            <EnvironmentDetails result={result} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
