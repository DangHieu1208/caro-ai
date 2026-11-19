import { Circle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

import {
    symbol,
    type Cell,
    type Move,
    type Player,
} from '@/lib/game'

interface GameCellProps {
    row: number
    col: number
    value: Cell
    currentPlayer: Player
    disabled: boolean
    isLastMove: boolean
    isWinningCell: boolean
    onMove: (move: Move) => void
}

export function GameCell({
                             row,
                             col,
                             value,
                             currentPlayer,
                             disabled,
                             isLastMove,
                             isWinningCell,
                             onMove,
                         }: GameCellProps) {
    const canPlay = !disabled && value === 0

    return (
        <button
            type="button"
            disabled={!canPlay}
            aria-label={`Hàng ${row}, cột ${col}: ${
                value === 0 ? 'trống' : symbol(value)
            }`}
            onClick={() => {
                if (canPlay) {
                    onMove([row, col])
                }
            }}
            className={cn(
                'lab-cell group select-none',
                row === 0 && 'border-t',
                col === 0 && 'border-l',
                isLastMove && 'lab-cell-last',
                isWinningCell && 'lab-cell-win',
                canPlay && 'cursor-pointer',
            )}
        >
            {value === 1 && (
                <X
                    className="h-3/5 w-3/5 text-blue-700"
                    strokeWidth={2.6}
                    aria-hidden="true"
                />
            )}

            {value === 2 && (
                <Circle
                    className="h-[52%] w-[52%] text-rose-600"
                    strokeWidth={2.6}
                    aria-hidden="true"
                />
            )}

            {value === 0 && (
                <>
                    <span className="h-1 w-1 rounded-full bg-slate-200" />

                    {canPlay && (
                        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-40 group-focus-visible:opacity-40">
                            {currentPlayer === 1 ? (
                                <X
                                    className="h-3/5 w-3/5 text-blue-700"
                                    strokeWidth={2.6}
                                    aria-hidden="true"
                                />
                            ) : (
                                <Circle
                                    className="h-[52%] w-[52%] text-rose-600"
                                    strokeWidth={2.6}
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                    )}
                </>
            )}

            {isLastMove && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
            )}
        </button>
    )
}
