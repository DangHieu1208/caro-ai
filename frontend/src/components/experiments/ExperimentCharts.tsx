import type { ReactNode } from 'react'

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

import {
    ChartNoAxesCombined,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import type {
    ExperimentResult,
} from '@/lib/experimentApi'

import {
    competitorDescription,
    createOutcomeData,
    createTimingData,
    createSweepData,
    formatMeasuredTime,
} from '@/lib/experimentAnalysis'

const COLORS = {
    win: '#16a34a',
    draw: '#94a3b8',
    loss: '#dc2626',

    sideA: '#2563eb',
    sideB: '#e11d48',

    grid: '#e2e8f0',
    axis: '#64748b',
}

const axisStyle = {
    fontSize: 11,
    fill: COLORS.axis,
}

interface ChartPanelProps {
    title: string
    description: string
    children: ReactNode
}

function ChartPanel({
                        title,
                        description,
                        children,
                    }: ChartPanelProps) {
    return (
        <div className="min-w-0 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">
                {title}
            </h3>

            <p className="mt-1 min-h-8 text-xs leading-relaxed text-muted-foreground">
                {description}
            </p>

            <div className="mt-4 h-[290px] w-full min-w-0">
                {children}
            </div>
        </div>
    )
}

export function ExperimentCharts({
                                     result,
                                 }: {
    result: ExperimentResult
}) {
    const outcomes =
        createOutcomeData(result.cases)

    const timings =
        createTimingData(result.cases)

    const sweep =
        createSweepData(result)

    const parameterName =
        result.scenario === 'uct_c'
            ? 'Hệ số UCT (c)'
            : 'Iterations'

    return (
        <Card className="lab-panel min-w-0">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <ChartNoAxesCombined size={19} />

                    Phân tích trực quan
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                    Biểu đồ được tạo từ kết quả thực nghiệm.
                </p>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
                <div className="grid gap-4 xl:grid-cols-2">
                    {/* Win / Draw / Loss */}
                    <ChartPanel
                        title="Phân bố thắng, hòa và thua"
                        description="Số ván thắng, hòa và thua của mỗi đối thủ trong từng cấu hình."
                    >
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                        >
                            <BarChart
                                data={outcomes}
                                margin={{
                                    top: 10,
                                    right: 10,
                                    left: 0,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid
                                    stroke={COLORS.grid}
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="label"
                                    tick={axisStyle}
                                    interval={0}
                                    tickLine={false}
                                />

                                <YAxis
                                    tick={axisStyle}
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                />

                                <Tooltip />

                                <Legend
                                    wrapperStyle={{
                                        fontSize: 12,
                                    }}
                                />

                                <Bar
                                    dataKey="wins"
                                    name="Thắng"
                                    stackId="outcome"
                                    fill={COLORS.win}
                                    isAnimationActive={false}
                                />

                                <Bar
                                    dataKey="draws"
                                    name="Hòa"
                                    stackId="outcome"
                                    fill={COLORS.draw}
                                    isAnimationActive={false}
                                />

                                <Bar
                                    dataKey="losses"
                                    name="Thua"
                                    stackId="outcome"
                                    fill={COLORS.loss}
                                    radius={[3, 3, 0, 0]}
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartPanel>

                    {/* Average search time */}
                    <ChartPanel
                        title="Thời gian suy luận trung bình"
                        description="So sánh thời gian xử lý trung bình mỗi quyết định AI tại Backend."
                    >
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                        >
                            <BarChart
                                data={timings}
                                margin={{
                                    top: 10,
                                    right: 10,
                                    left: 0,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid
                                    stroke={COLORS.grid}
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="label"
                                    tick={axisStyle}
                                    tickLine={false}
                                />

                                <YAxis
                                    tick={axisStyle}
                                    tickLine={false}
                                    axisLine={false}
                                    unit=" ms"
                                />

                                <Tooltip
                                    formatter={(value) =>
                                        typeof value === 'number'
                                            ? formatMeasuredTime(value)
                                            : '—'
                                    }
                                />

                                <Legend
                                    wrapperStyle={{
                                        fontSize: 12,
                                    }}
                                />

                                <Bar
                                    dataKey="sideA"
                                    name="Đối thủ A"
                                    fill={COLORS.sideA}
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={45}
                                    isAnimationActive={false}
                                />

                                <Bar
                                    dataKey="sideB"
                                    name="Đối thủ B"
                                    fill={COLORS.sideB}
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={45}
                                    isAnimationActive={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartPanel>
                </div>

                {/* Parameter sweep charts */}
                {sweep.length > 0 && (
                    <div className="grid gap-4 xl:grid-cols-2">
                        <ChartPanel
                            title={`${parameterName} và tỷ lệ thắng`}
                            description="Tỷ lệ thắng của MCTS khi thay đổi tham số khảo sát và giữ nguyên đối thủ."
                        >
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                                minWidth={0}
                            >
                                <LineChart
                                    data={sweep}
                                    margin={{
                                        top: 10,
                                        right: 20,
                                        left: 0,
                                        bottom: 8,
                                    }}
                                >
                                    <CartesianGrid
                                        stroke={COLORS.grid}
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="parameter"
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                        ticks={sweep.map(
                                            (item) => item.parameter,
                                        )}
                                        tick={axisStyle}
                                    />

                                    <YAxis
                                        domain={[0, 100]}
                                        tick={axisStyle}
                                        unit="%"
                                    />

                                    <Tooltip
                                        formatter={(value) =>
                                            typeof value === 'number'
                                                ? `${value.toFixed(1)}%`
                                                : '—'
                                        }
                                    />

                                    <Line
                                        type="linear"
                                        dataKey="winRate"
                                        name="Win Rate MCTS"
                                        stroke={COLORS.sideA}
                                        strokeWidth={2.5}
                                        connectNulls={false}
                                        dot={{
                                            r: 4,
                                            fill: COLORS.sideA,
                                        }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartPanel>

                        <ChartPanel
                            title={`${parameterName} và chi phí tính toán`}
                            description="Thời gian suy luận trung bình của MCTS tại mỗi giá trị tham số."
                        >
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                                minWidth={0}
                            >
                                <LineChart
                                    data={sweep}
                                    margin={{
                                        top: 10,
                                        right: 20,
                                        left: 0,
                                        bottom: 8,
                                    }}
                                >
                                    <CartesianGrid
                                        stroke={COLORS.grid}
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="parameter"
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                        ticks={sweep.map(
                                            (item) => item.parameter,
                                        )}
                                        tick={axisStyle}
                                    />

                                    <YAxis
                                        tick={axisStyle}
                                        unit=" ms"
                                    />

                                    <Tooltip
                                        formatter={(value) =>
                                            typeof value === 'number'
                                                ? formatMeasuredTime(value)
                                                : '—'
                                        }
                                    />

                                    <Line
                                        type="linear"
                                        dataKey="averageTime"
                                        name="Thời gian trung bình"
                                        stroke="#7c3aed"
                                        strokeWidth={2.5}
                                        connectNulls={false}
                                        dot={{
                                            r: 4,
                                            fill: '#7c3aed',
                                        }}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartPanel>
                    </div>
                )}

                {/* Configuration reference */}
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-semibold">
                        Chú thích cấu hình
                    </p>

                    {result.cases.map((item, index) => (
                        <div
                            key={item.id}
                            className="space-y-1 border-t pt-3 text-xs"
                        >
                            <p className="font-semibold">
                                C{index + 1}: {item.label}
                            </p>

                            <p className="break-words text-blue-700">
                                A: {competitorDescription(
                                item.result.competitor_a,
                            )}
                            </p>

                            <p className="break-words text-rose-700">
                                B: {competitorDescription(
                                item.result.competitor_b,
                            )}
                            </p>
                        </div>
                    ))}
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                    Thời gian được tính trên toàn bộ
                    quyết định AI của từng đối thủ.
                    Các điểm trên biểu đồ đường là
                    những cấu hình đã thực nghiệm,
                    không phải giá trị dự đoán.
                </p>
            </CardContent>
        </Card>
    )
}
