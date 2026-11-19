import { useState } from 'react'

import {
    FlaskConical,
    Play,
    Repeat,
    Settings2,
    SlidersHorizontal,
    Swords,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import type {
    Connection,
} from '@/components/game/MatchSettings'

import {
    names,
    type Algorithm,
    type AgentStatus,
} from '@/lib/api'

import {
    createCompetitor,
    scenarioNames,
    scenarioCaseCounts,

    type Competitor,
    type ExperimentConfig,
    type ExperimentScenario,
    type ExperimentRequest,
} from '@/lib/experimentApi'

import { cn } from '@/lib/utils'

interface ExperimentSettingsProps {
    agents: AgentStatus[]
    connection: Connection

    locked: boolean

    onStart: (
        request: ExperimentRequest,
    ) => Promise<void>
}

const scenarios = [
    {
        id: 'custom',
        description: 'Hai đối thủ tùy chỉnh',
        icon: Settings2,
    },
    {
        id: 'comparison',
        description: 'Ba cặp đối sánh',
        icon: Swords,
    },
    {
        id: 'uct_c',
        description: 'c = 0.5, 1.0, 1.4, 2.0',
        icon: SlidersHorizontal,
    },
    {
        id: 'iterations',
        description: '100, 300, 500 iterations',
        icon: Repeat,
    },
] as const

interface NumberFieldProps {
    label: string
    value: number
    values: number[]
    disabled: boolean

    onChange: (
        value: number,
    ) => void

    format?: (
        value: number,
    ) => string
}

function NumberField({
                         label,
                         value,
                         values,
                         disabled,
                         onChange,
                         format = String,
                     }: NumberFieldProps) {
    return (
        <div className="space-y-2">
            <p className="text-xs font-medium">
                {label}
            </p>

            <Select
                label={label}
                value={String(value)}
                disabled={disabled}

                options={values.map(
                    (item) => ({
                        value: String(item),
                        label: format(item),
                    }),
                )}

                onValueChange={(item) =>
                    onChange(Number(item))
                }
            />
        </div>
    )
}

interface CompetitorEditorProps {
    title: string

    value: Competitor

    agents: AgentStatus[]

    disabled: boolean

    onChange: (
        value: Competitor,
    ) => void
}

function CompetitorEditor({
                              title,
                              value,
                              agents,
                              disabled,
                              onChange,
                          }: CompetitorEditorProps) {
    const ready = agents.some(
        (agent) =>
            agent.id === value.algorithm &&
            agent.ready,
    )

    function updateConfig(
        changes: Partial<ExperimentConfig>,
    ) {
        onChange({
            ...value,

            config: {
                ...value.config,
                ...changes,
            },
        })
    }

    return (
        <div className="min-w-0 space-y-4 rounded-lg border p-4">
            <div>
                <h3 className="text-sm font-semibold">
                    {title}
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                    Tham số thuật toán
                </p>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-medium">
                    Thuật toán
                </p>

                <Select
                    label={`Thuật toán ${title}`}
                    value={value.algorithm}
                    disabled={disabled}

                    options={(
                        Object.keys(names) as Algorithm[]
                    ).map((algorithm) => ({
                        value: algorithm,

                        label: agents.some(
                            (agent) =>
                                agent.id === algorithm &&
                                agent.ready,
                        )
                            ? names[algorithm]
                            : `${names[algorithm]} (chưa sẵn sàng)`,
                    }))}

                    onValueChange={(algorithm) =>
                        onChange({
                            ...value,

                            algorithm:
                                algorithm as Algorithm,
                        })
                    }
                />
            </div>

            {value.algorithm === 'minimax' && (
                <div className="space-y-4 border-t pt-4">
                    <NumberField
                        label="Độ sâu"
                        value={value.config.depth}
                        values={[2, 3, 4, 5]}
                        disabled={disabled}

                        onChange={(depth) =>
                            updateConfig({ depth })
                        }
                    />

                    <NumberField
                        label="Giới hạn ứng viên"
                        value={value.config.candidate_limit}
                        values={[5, 10, 15, 20, 0]}
                        disabled={disabled}

                        format={(item) =>
                            item === 0
                                ? 'Không giới hạn'
                                : String(item)
                        }

                        onChange={(candidate_limit) =>
                            updateConfig({
                                candidate_limit,
                            })
                        }
                    />

                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium">
                                Alpha-Beta Pruning
                            </p>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                                {value.config.pruning
                                    ? 'Có cắt tỉa'
                                    : 'MiniMax thuần'}
                            </p>
                        </div>

                        <Switch
                            aria-label={`Alpha-Beta ${title}`}
                            checked={value.config.pruning}
                            disabled={disabled}

                            onCheckedChange={(pruning) =>
                                updateConfig({ pruning })
                            }
                        />
                    </div>
                </div>
            )}

            {value.algorithm === 'mcts' && (
                <div className="space-y-4 border-t pt-4">
                    <NumberField
                        label="Iterations"
                        value={value.config.iterations}
                        values={[
                            100,
                            300,
                            500,
                            1000,
                            3000,
                        ]}
                        disabled={disabled}

                        onChange={(iterations) =>
                            updateConfig({ iterations })
                        }
                    />

                    <NumberField
                        label="Hệ số UCT (c)"
                        value={value.config.c}
                        values={[0.5, 1, 1.4, 2]}
                        disabled={disabled}

                        format={(item) =>
                            item.toFixed(1)
                        }

                        onChange={(c) =>
                            updateConfig({ c })
                        }
                    />

                    <p className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
                        Rollout: Ngẫu nhiên
                    </p>
                </div>
            )}

            {value.algorithm === 'random' && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                    Chọn nước đi ngẫu nhiên,
                    không có tham số tìm kiếm.
                </p>
            )}

            {!ready && (
                <p className="rounded-md bg-amber-50 p-2.5 text-xs text-amber-800">
                    Thuật toán chưa sẵn sàng.
                </p>
            )}
        </div>
    )
}

function ScenarioDescription({
                                 scenario,
                             }: {
    scenario: ExperimentScenario
}) {
    if (scenario === 'custom') {
        return null
    }

    return (
        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-semibold">
                Cấu hình cố định
            </p>

            {scenario === 'comparison' && (
                <div className="space-y-2 text-xs leading-relaxed">
                    <p>1. Random vs MiniMax + Alpha-Beta</p>

                    <p>2. Random vs MCTS + UCT</p>

                    <p>3. MiniMax + Alpha-Beta vs MCTS + UCT</p>

                    <p className="border-t pt-3 text-muted-foreground">
                        MiniMax: depth 2, giới hạn 10 ứng viên,
                        có Alpha-Beta.
                    </p>

                    <p className="text-muted-foreground">
                        MCTS: 300 iterations, c = 1.4,
                        random rollout.
                    </p>
                </div>
            )}

            {scenario === 'uct_c' && (
                <div className="space-y-2 text-xs leading-relaxed">
                    <p>
                        Tham số khảo sát:
                        c = 0.5, 1.0, 1.4, 2.0.
                    </p>

                    <p>
                        Cố định 300 iterations,
                        random rollout và cùng đối thủ.
                    </p>
                </div>
            )}

            {scenario === 'iterations' && (
                <div className="space-y-2 text-xs leading-relaxed">
                    <p>
                        Tham số khảo sát:
                        100, 300, 500 iterations.
                    </p>

                    <p>
                        Cố định c = 1.4,
                        random rollout và cùng đối thủ.
                    </p>
                </div>
            )}
        </div>
    )
}

export function ExperimentSettings({
                                       agents,
                                       connection,
                                       locked,
                                       onStart,
                                   }: ExperimentSettingsProps) {
    const [scenario, setScenario] =
        useState<ExperimentScenario>(
            'custom',
        )

    const [competitorA, setCompetitorA] =
        useState<Competitor>(
            () => createCompetitor('random'),
        )

    const [competitorB, setCompetitorB] =
        useState<Competitor>(
            () => createCompetitor('random'),
        )

    const [opponent, setOpponent] =
        useState<Competitor>(
            () => createCompetitor('minimax'),
        )

    const [pairsInput, setPairsInput] =
        useState('10')

    const [seedInput, setSeedInput] =
        useState('42')

    const [revision, setRevision] =
        useState('')

    const pairs = Number(pairsInput)

    const seed = Number(seedInput)

    const minPairs =
        scenario === 'custom' ? 1 : 10

    const validPairs =
        pairsInput.trim() !== '' &&
        Number.isInteger(pairs) &&
        pairs >= minPairs &&
        pairs <= 30

    const validSeed =
        seedInput.trim() !== '' &&
        Number.isSafeInteger(seed) &&
        seed >= 0

    const requiredAlgorithms: Algorithm[] =
        scenario === 'custom'
            ? [
                competitorA.algorithm,
                competitorB.algorithm,
            ]
            : scenario === 'comparison'
                ? [
                    'random',
                    'minimax',
                    'mcts',
                ]
                : [
                    'mcts',
                    opponent.algorithm,
                ]

    const unavailable = [
        ...new Set(requiredAlgorithms),
    ].filter(
        (algorithm) =>
            !agents.some(
                (agent) =>
                    agent.id === algorithm &&
                    agent.ready,
            ),
    )

    const caseCount =
        scenarioCaseCounts[scenario]

    const totalGames =
        validPairs
            ? pairs * 2 * caseCount
            : 0

    const canStart =
        !locked &&
        connection === 'online' &&
        validPairs &&
        validSeed &&
        unavailable.length === 0

    function changeScenario(
        next: ExperimentScenario,
    ) {
        setScenario(next)

        if (
            next !== 'custom' &&
            (
                !Number.isInteger(pairs) ||
                pairs < 10
            )
        ) {
            setPairsInput('10')
        }
    }

    async function startExperiment() {
        if (!canStart) {
            return
        }

        const request: ExperimentRequest = {
            scenario,
            pairs,
            seed,

            source_revision:
                revision.trim() || null,
        }

        if (scenario === 'custom') {
            request.competitor_a = competitorA
            request.competitor_b = competitorB
        }

        if (
            scenario === 'uct_c' ||
            scenario === 'iterations'
        ) {
            request.opponent = opponent
        }

        await onStart(request)
    }

    return (
        <Card className="lab-panel min-w-0">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <FlaskConical size={19} />

                    Cấu hình thực nghiệm
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                    Chọn kịch bản, tham số và số lượng ván đấu.
                </p>
            </CardHeader>

            <CardContent className="pt-5">
                <form
                    className="space-y-6"

                    onSubmit={(event) => {
                        event.preventDefault()

                        void startExperiment()
                    }}
                >
                    {/* Scenario selection */}
                    <div className="space-y-3">
                        <p className="text-sm font-semibold">
                            Kịch bản thực nghiệm
                        </p>

                        <div className="grid gap-2 sm:grid-cols-2">
                            {scenarios.map((item) => {
                                const Icon = item.icon

                                const selected =
                                    scenario === item.id

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={locked}

                                        aria-pressed={selected}

                                        onClick={() =>
                                            changeScenario(item.id)
                                        }

                                        className={cn(
                                            'space-y-2 rounded-lg border p-3 text-left transition-colors',

                                            selected
                                                ? 'border-slate-500 bg-slate-50'
                                                : 'hover:bg-muted',

                                            locked && 'opacity-60',
                                        )}
                                    >
                                        <Icon
                                            size={19}
                                            className="text-muted-foreground"
                                        />

                                        <p className="text-sm font-medium">
                                            {scenarioNames[item.id]}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {item.description}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Custom competitors */}
                    {scenario === 'custom' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <CompetitorEditor
                                title="Đối thủ A"
                                value={competitorA}
                                agents={agents}
                                disabled={locked}
                                onChange={setCompetitorA}
                            />

                            <CompetitorEditor
                                title="Đối thủ B"
                                value={competitorB}
                                agents={agents}
                                disabled={locked}
                                onChange={setCompetitorB}
                            />
                        </div>
                    )}

                    <ScenarioDescription
                        scenario={scenario}
                    />

                    {/* Sweep opponent */}
                    {(
                        scenario === 'uct_c' ||
                        scenario === 'iterations'
                    ) && (
                        <CompetitorEditor
                            title="Đối thủ cố định"
                            value={opponent}
                            agents={agents}
                            disabled={locked}
                            onChange={setOpponent}
                        />
                    )}

                    {/* Common configuration */}
                    <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                        <label className="block space-y-2">
              <span className="text-sm font-medium">
                Số cặp trên mỗi cấu hình
              </span>

                            <input
                                type="number"
                                className="lab-control"
                                min={minPairs}
                                max={30}
                                step={1}
                                required
                                disabled={locked}
                                value={pairsInput}

                                onChange={(event) =>
                                    setPairsInput(
                                        event.target.value,
                                    )
                                }
                            />

                            <p className="text-xs text-muted-foreground">
                                Mỗi cặp gồm hai ván đổi lượt.
                            </p>
                        </label>

                        <label className="block space-y-2">
              <span className="text-sm font-medium">
                Random seed
              </span>

                            <input
                                type="number"
                                className="lab-control"
                                min={0}
                                max={Number.MAX_SAFE_INTEGER}
                                step={1}
                                required
                                disabled={locked}
                                value={seedInput}

                                onChange={(event) =>
                                    setSeedInput(
                                        event.target.value,
                                    )
                                }
                            />

                            <p className="text-xs text-muted-foreground">
                                Dùng để tái lập thực nghiệm.
                            </p>
                        </label>
                    </div>

                    {/* Optional source revision */}
                    <label className="block space-y-2">
            <span className="text-sm font-medium">
              Git commit (không bắt buộc)
            </span>

                        <input
                            type="text"
                            className="lab-control font-mono"
                            maxLength={80}
                            disabled={locked}
                            placeholder="Nhập commit SHA"
                            value={revision}

                            onChange={(event) =>
                                setRevision(
                                    event.target.value,
                                )
                            }
                        />
                    </label>

                    {/* Estimated workload */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="lab-stat">
                            <p className="text-xs text-muted-foreground">
                                Số cấu hình
                            </p>

                            <p className="mt-1 text-2xl font-semibold tabular-nums">
                                {caseCount}
                            </p>
                        </div>

                        <div className="lab-stat">
                            <p className="text-xs text-muted-foreground">
                                Tổng số ván
                            </p>

                            <p className="mt-1 text-2xl font-semibold tabular-nums">
                                {validPairs
                                    ? totalGames
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Validation and readiness */}
                    {scenario === 'custom' &&
                        validPairs &&
                        pairs < 10 && (
                            <p className="rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                                Dưới 10 cặp chỉ phù hợp để kiểm thử
                                nhanh, chưa đủ số ván theo yêu cầu
                                thực nghiệm chính thức.
                            </p>
                        )}

                    {!validPairs && (
                        <p className="text-xs text-red-700">
                            Số cặp phải là số nguyên từ
                            {' '}{minPairs} đến 30.
                        </p>
                    )}

                    {!validSeed && (
                        <p className="text-xs text-red-700">
                            Seed phải là số nguyên không âm
                            trong phạm vi an toàn của JavaScript.
                        </p>
                    )}

                    {connection !== 'online' && (
                        <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                            Backend chưa kết nối.
                        </p>
                    )}

                    {connection === 'online' &&
                        unavailable.length > 0 && (
                            <div className="rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                                Thuật toán chưa sẵn sàng:
                                {' '}
                                {unavailable.map(
                                    (algorithm) => names[algorithm],
                                ).join(', ')}
                            </div>
                        )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={!canStart}
                    >
                        <Play size={16} />

                        Chạy thực nghiệm
                    </Button>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Các ván được chạy tuần tự tại Backend.
                        Tránh chạy ứng dụng nặng đồng thời
                        để hạn chế ảnh hưởng đến phép đo.
                    </p>
                </form>
            </CardContent>
        </Card>
    )
}
