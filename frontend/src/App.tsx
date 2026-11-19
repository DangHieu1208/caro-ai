import { useState } from 'react'

import {
  FlaskConical,
  Gamepad2,
  Grid3X3,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

import {
  ExperimentsPage,
} from '@/pages/ExperimentsPage'

import { useAgents } from '@/hooks/useAgents'
import { useGame } from '@/hooks/useGame'

import {
  useExperiment,
  readStoredJobId,
} from '@/hooks/useExperiment'

import { cn } from '@/lib/utils'

type Page =
    | 'playground'
    | 'experiments'

function App() {
  const [page, setPage] =
      useState<Page>(
          () => readStoredJobId()
              ? 'experiments'
              : 'playground',
      )

  const {
    agents,
    connection,
    refresh,
  } = useAgents()

  const match = useGame({
    agents,
    connection,
  })

  const experiment =
      useExperiment()

  const matchActive =
      match.started &&
      !match.finished

  function navigate(
      next: Page,
  ) {
    if (
        next === 'experiments' &&
        matchActive
    ) {
      return
    }

    if (
        next === 'playground' &&
        experiment.busy
    ) {
      return
    }

    setPage(next)
  }

  function startPlayground() {
    if (experiment.busy) {
      return
    }

    match.startMatch()
  }

  return (
      <div className="min-h-screen bg-background">
        {/* Application header */}
        <header className="border-b bg-card">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
            {/* Brand and connection */}
            <div className="flex items-center justify-between gap-4 py-4">
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

            {/* Navigation */}
            <nav
                aria-label="Điều hướng chính"
                className="flex gap-5"
            >
              <button
                  type="button"
                  disabled={
                      page !== 'playground' &&
                      experiment.busy
                  }

                  aria-current={
                    page === 'playground'
                        ? 'page'
                        : undefined
                  }

                  onClick={() =>
                      navigate('playground')
                  }

                  className={cn(
                      'flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition-colors disabled:opacity-40',

                      page === 'playground'
                          ? 'border-primary text-foreground'

                          : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
              >
                <Gamepad2 size={17} />

                Playground
              </button>

              <button
                  type="button"

                  disabled={
                      page !== 'experiments' &&
                      matchActive
                  }

                  aria-current={
                    page === 'experiments'
                        ? 'page'
                        : undefined
                  }

                  onClick={() =>
                      navigate('experiments')
                  }

                  className={cn(
                      'flex items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-sm font-medium transition-colors disabled:opacity-40',

                      page === 'experiments'
                          ? 'border-primary text-foreground'

                          : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
              >
                <FlaskConical size={17} />

                Experiments
              </button>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Playground page */}
          {page === 'playground' && (
              <>
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

                {matchActive && (
                    <p className="mb-5 rounded-md border bg-card p-3 text-xs text-muted-foreground">
                      Hãy hoàn thành hoặc reset ván đấu
                      trước khi chuyển sang Experiments.
                    </p>
                )}

                {experiment.busy && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-800">
                        Có thực nghiệm đang được xử lý.
                        Chưa thể bắt đầu ván đấu mới.
                      </p>

                      <Button
                          size="sm"
                          variant="outline"

                          onClick={() =>
                              navigate('experiments')
                          }
                      >
                        Xem thực nghiệm
                      </Button>
                    </div>
                )}

                <div className="grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_310px]">
                  <MatchSettings
                      value={match.settings}

                      agents={agents}

                      connection={connection}

                      locked={
                          match.started ||
                          experiment.busy
                      }

                      onChange={
                        match.updateSettings
                      }

                      onStart={
                        startPlayground
                      }

                      onReset={
                        match.reset
                      }
                  />

                  <GameBoard
                      game={match.game}

                      playerNames={
                        match.playerNames
                      }

                      lastMove={match.lastMove}

                      started={match.started}
                      paused={match.paused}
                      aiTurn={match.aiTurn}

                      activity={match.activity}
                      canStep={match.canStep}

                      stepRequested={
                        match.stepRequested
                      }

                      error={match.error}

                      onMove={
                        match.humanMove
                      }

                      onTogglePause={
                        match.togglePause
                      }

                      onStep={
                        match.step
                      }

                      onRetry={
                        match.retry
                      }
                  />

                  <div className="grid min-w-0 gap-5 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
                    <GameStatistics
                        logs={match.logs}

                        playerNames={
                          match.playerNames
                        }
                    />

                    <MoveHistory
                        logs={match.logs}

                        winner={
                          match.game.winner
                        }
                    />
                  </div>
                </div>
              </>
          )}

          {/* Experiments page */}
          {page === 'experiments' && (
              <>
                {experiment.busy && (
                    <p className="mb-5 rounded-md border bg-card p-3 text-xs text-muted-foreground">
                      Playground được khóa tạm thời
                      trong lúc thực nghiệm đang xử lý
                      để hạn chế tranh chấp tài nguyên.
                    </p>
                )}

                <ExperimentsPage
                    agents={agents}

                    connection={connection}

                    experiment={experiment}
                />
              </>
          )}

          <footer className="mt-8 border-t py-5 text-center text-xs text-muted-foreground">
            Caro AI Lab · UET Artificial Intelligence Project
          </footer>
        </main>
      </div>
  )
}

export default App
