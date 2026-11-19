import { Grid3X3 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import {
  GameBoard,
} from '@/components/game/GameBoard'

import {
  MatchSettings,
} from '@/components/game/MatchSettings'

import {
  GameStatistics,
} from '@/components/game/GameStatistics'

import {
  MoveHistory,
} from '@/components/game/MoveHistory'

import { useAgents } from '@/hooks/useAgents'
import { useGame } from '@/hooks/useGame'

import { cn } from '@/lib/utils'

function App() {
  const {
    agents,
    connection,
    refresh,
  } = useAgents()

  const match = useGame({
    agents,
    connection,
  })

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
                  onClick={() => void refresh()}
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

          {/* Match workspace */}
          <div className="grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_310px]">
            {/* Left panel */}
            <MatchSettings
                value={match.settings}
                agents={agents}
                connection={connection}
                locked={match.started}

                onChange={match.updateSettings}
                onStart={match.startMatch}
                onReset={match.reset}
            />

            {/* Center panel */}
            <GameBoard
                game={match.game}
                playerNames={match.playerNames}
                lastMove={match.lastMove}

                started={match.started}
                paused={match.paused}
                aiTurn={match.aiTurn}

                activity={match.activity}
                canStep={match.canStep}
                stepRequested={match.stepRequested}
                error={match.error}

                onMove={match.humanMove}
                onTogglePause={match.togglePause}
                onStep={match.step}
                onRetry={match.retry}
            />

            {/* Right panel */}
            <div className="grid min-w-0 gap-5 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
              <GameStatistics
                  logs={match.logs}
                  playerNames={match.playerNames}
              />

              <MoveHistory
                  logs={match.logs}
                  winner={match.game.winner}
              />
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
