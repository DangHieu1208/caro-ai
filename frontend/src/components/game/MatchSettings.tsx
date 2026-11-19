import {
    Bot,
    Circle,
    Play,
    RotateCcw,
    Settings2,
    UserRound,
    X,
} from 'lucide-react'

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from '@/components/ui/tabs'

import {
    names,
    type Algorithm,
    type AgentStatus,
    type Config,
} from '@/lib/api'

import {
    symbol,
    type Player,
} from '@/lib/game'

export type Mode = 'human' | 'ai'

export type Connection =
    | 'loading'
    | 'online'
    | 'offline'

export interface PlayerSettings {
    algorithm: Algorithm
    config: Config
}

export interface MatchSettingsValue {
    mode: Mode
    human: Player
    sides: Record<Player, PlayerSettings>
    delay: number
}

interface MatchSettingsProps {
    value: MatchSettingsValue
    agents: AgentStatus[]
    connection: Connection
    locked: boolean
    onChange: (value: MatchSettingsValue) => void
    onStart: () => void
    onReset: () => void
}

interface PlayerSettingsCardProps {
    player: Player
    settings: PlayerSettings
    isHuman: boolean
    agents: AgentStatus[]
    disabled: boolean
    onChange: (settings: PlayerSettings) => void
}

interface NumberSelectProps {
    label: string
    value: number
    values: number[]
    disabled?: boolean
    format?: (value: number) => string
    onChange: (value: number) => void
}

function NumberSelect({
                          label,
                          value,
                          values,
                          disabled,
                          format = String,
                          onChange,
                      }: NumberSelectProps) {
    return (
        <div className="space-y-2">
            <p className="text-xs font-medium">
                {label}
            </p>

            <Select
                label={label}
                value={String(value)}
                disabled={disabled}
                options={values.map((item) => ({
                    value: String(item),
                    label: format(item),
                }))}
                onValueChange={(item) =>
                    onChange(Number(item))
                }
            />
        </div>
    )
}

function PlayerSettingsCard({
                                player,
                                settings,
                                isHuman,
                                agents,
                                disabled,
                                onChange,
                            }: PlayerSettingsCardProps) {
    const { algorithm, config } = settings

    const ready = agents.some(
        (agent) =>
            agent.id === algorithm && agent.ready,
    )

    function updateConfig(
        changes: Partial<Config>,
    ) {
        onChange({
            ...settings,
            config: {
                ...config,
                ...changes,
            },
        })
    }

    const algorithmOptions = (
        Object.keys(names) as Algorithm[]
    ).map((id) => {
        const available = agents.some(
            (agent) => agent.id === id && agent.ready,
        )

        return {
            value: id,
            label: available
                ? names[id]
                : `${names[id]} (chưa tích hợp)`,
        }
    })

    return (
        <div className="space-y-4 rounded-lg border bg-card p-3">
            {/* Player heading */}
            <div className="flex items-center gap-2">
                <div
                    className={
                        player === 1
                            ? 'grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700'
                            : 'grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600'
                    }
                >
                    {player === 1 ? (
                        <X size={21} strokeWidth={2.8} />
                    ) : (
                        <Circle size={19} strokeWidth={2.8} />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                        Quân {symbol(player)}
                    </p>

                    <p className="text-[11px] text-muted-foreground">
                        {player === 1 ? 'Đi trước' : 'Đi sau'}
                    </p>
                </div>

                <Badge className="shrink-0 bg-muted">
                    {isHuman ? (
                        <UserRound size={12} />
                    ) : (
                        <Bot size={12} />
                    )}
                </Badge>
            </div>

            {isHuman ? (
                <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    <UserRound size={15} />

                    Điều khiển bởi người chơi
                </div>
            ) : (
                <>
                    {/* Algorithm selector */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium">
                            Thuật toán
                        </p>

                        <Select
                            label={`Thuật toán quân ${symbol(player)}`}
                            value={algorithm}
                            disabled={disabled}
                            options={algorithmOptions}
                            onValueChange={(value) =>
                                onChange({
                                    ...settings,
                                    algorithm: value as Algorithm,
                                })
                            }
                        />
                    </div>

                    {/* MiniMax settings */}
                    {algorithm === 'minimax' && (
                        <div className="space-y-4 border-t pt-3">
                            <NumberSelect
                                label="Độ sâu tìm kiếm"
                                value={config.depth}
                                values={[2, 3, 4, 5]}
                                disabled={disabled}
                                onChange={(depth) =>
                                    updateConfig({ depth })
                                }
                            />

                            <NumberSelect
                                label="Giới hạn ứng viên"
                                value={config.candidate_limit}
                                values={[5, 10, 15, 20, 0]}
                                disabled={disabled}
                                format={(value) =>
                                    value === 0
                                        ? 'Không giới hạn'
                                        : String(value)
                                }
                                onChange={(candidate_limit) =>
                                    updateConfig({ candidate_limit })
                                }
                            />

                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-medium">
                                        Alpha-Beta Pruning
                                    </p>

                                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                        {config.pruning
                                            ? 'Bật cắt tỉa'
                                            : 'MiniMax thuần'}
                                    </p>
                                </div>

                                <Switch
                                    aria-label={`Alpha-Beta quân ${symbol(player)}`}
                                    checked={config.pruning}
                                    disabled={disabled}
                                    onCheckedChange={(pruning) =>
                                        updateConfig({ pruning })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* MCTS settings */}
                    {algorithm === 'mcts' && (
                        <div className="space-y-4 border-t pt-3">
                            <NumberSelect
                                label="Số iterations"
                                value={config.iterations}
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

                            <NumberSelect
                                label="Hệ số khám phá UCT (c)"
                                value={config.c}
                                values={[0.5, 1, 1.4, 2]}
                                disabled={disabled}
                                format={(value) =>
                                    value.toFixed(1)
                                }
                                onChange={(c) =>
                                    updateConfig({ c })
                                }
                            />

                            <div className="rounded-md bg-muted p-2.5">
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    Rollout: Ngẫu nhiên
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Random settings */}
                    {algorithm === 'random' && (
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Chọn ngẫu nhiên một nước đi hợp lệ.
                            Không cần tham số tìm kiếm.
                        </p>
                    )}

                    {!ready && (
                        <p className="rounded-md bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-800">
                            Thuật toán chưa được tích hợp
                            hoặc backend chưa sẵn sàng.
                        </p>
                    )}
                </>
            )}
        </div>
    )
}

export function MatchSettings({
                                  value,
                                  agents,
                                  connection,
                                  locked,
                                  onChange,
                                  onStart,
                                  onReset,
                              }: MatchSettingsProps) {
    const players: Player[] = [1, 2]

    function isHuman(player: Player) {
        return (
            value.mode === 'human' &&
            value.human === player
        )
    }

    function updatePlayer(
        player: Player,
        settings: PlayerSettings,
    ) {
        onChange({
            ...value,
            sides: {
                ...value.sides,
                [player]: settings,
            },
        })
    }

    const pending = players.some(
        (player) =>
            !isHuman(player) &&
            !agents.some(
                (agent) =>
                    agent.id ===
                    value.sides[player].algorithm &&
                    agent.ready,
            ),
    )

    const canStart =
        !locked &&
        connection === 'online' &&
        !pending

    return (
        <Card className="lab-panel min-w-0">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <Settings2 size={18} />
                    Cấu hình trận đấu
                </CardTitle>

                <p className="text-xs text-muted-foreground">
                    Thiết lập riêng cho từng người chơi.
                </p>
            </CardHeader>

            <CardContent className="space-y-5 pt-5">
                {/* Match mode */}
                <div className="space-y-2">
                    <p className="text-sm font-medium">
                        Chế độ chơi
                    </p>

                    <Tabs
                        value={value.mode}
                        onValueChange={(mode) => {
                            if (
                                !locked &&
                                (mode === 'human' || mode === 'ai')
                            ) {
                                onChange({
                                    ...value,
                                    mode,
                                })
                            }
                        }}
                    >
                        <TabsList
                            aria-label="Chế độ chơi"
                            className="grid w-full grid-cols-2"
                        >
                            <TabsTrigger
                                value="human"
                                disabled={locked}
                                className="px-1 text-xs"
                            >
                                Người vs Máy
                            </TabsTrigger>

                            <TabsTrigger
                                value="ai"
                                disabled={locked}
                                className="px-1 text-xs"
                            >
                                Máy vs Máy
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="human">
                            <div className="space-y-2">
                                <p className="text-xs font-medium">
                                    Bạn chơi quân
                                </p>

                                <Select
                                    label="Quân của người chơi"
                                    value={String(value.human)}
                                    disabled={locked}
                                    options={[
                                        {
                                            value: '1',
                                            label: 'X — đi trước',
                                        },
                                        {
                                            value: '2',
                                            label: 'O — đi sau',
                                        },
                                    ]}
                                    onValueChange={(human) =>
                                        onChange({
                                            ...value,
                                            human: Number(human) as Player,
                                        })
                                    }
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="ai">
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Hai thuật toán tự động thi đấu
                                và luân phiên đặt quân.
                            </p>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Independent player configurations */}
                <div className="space-y-3">
                    {players.map((player) => (
                        <PlayerSettingsCard
                            key={player}
                            player={player}
                            settings={value.sides[player]}
                            isHuman={isHuman(player)}
                            agents={agents}
                            disabled={locked}
                            onChange={(settings) =>
                                updatePlayer(
                                    player,
                                    settings,
                                )
                            }
                        />
                    ))}
                </div>

                {/* AI speed */}
                <div className="space-y-2 border-t pt-4">
                    <p className="text-xs font-medium">
                        Khoảng nghỉ trước lượt máy
                    </p>

                    <Select
                        label="Tốc độ trận đấu"
                        value={String(value.delay)}
                        options={[
                            {
                                value: '0',
                                label: 'Không nghỉ',
                            },
                            {
                                value: '350',
                                label: '350 ms',
                            },
                            {
                                value: '800',
                                label: '800 ms',
                            },
                        ]}
                        onValueChange={(delay) =>
                            onChange({
                                ...value,
                                delay: Number(delay),
                            })
                        }
                    />
                </div>

                {/* Connection status */}
                {connection === 'offline' && (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800"
                    >
                        Không thể kết nối backend.
                        Hãy kiểm tra server FastAPI.
                    </div>
                )}

                {!locked &&
                    connection === 'online' &&
                    pending && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                            Hãy chọn thuật toán đã được
                            tích hợp để bắt đầu trận.
                        </div>
                    )}

                {locked && (
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Cấu hình thuật toán được khóa trong
                        trận đấu. Chọn Trận mới để thay đổi.
                    </p>
                )}

                {/* Actions */}
                <div className="space-y-2">
                    <Button
                        className="w-full"
                        disabled={!canStart}
                        onClick={onStart}
                    >
                        <Play size={15} />
                        Bắt đầu trận
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={onReset}
                    >
                        <RotateCcw size={15} />
                        Trận mới
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
