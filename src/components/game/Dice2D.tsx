'use client'

import { useEffect, useRef, useState } from 'react'
import type { DiceValue } from '@/types/game'

interface Dice2DProps {
  dice: DiceValue[]
  keptDice: boolean[]
  isRolling: boolean
  onDieClick?: (index: number) => void
  onRollComplete?: () => void
  disabled?: boolean
  canKeep?: boolean
}

const dotPositions: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
}

function DieFace({ value, isKept, isRolling, onClick, disabled, canKeep, index }: {
  value: DiceValue
  isKept: boolean
  isRolling: boolean
  onClick?: (index: number) => void
  disabled?: boolean
  canKeep?: boolean
  index: number
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (isRolling && !isKept) {
      intervalRef.current = setInterval(() => {
        setDisplayValue((Math.floor(Math.random() * 6) + 1) as DiceValue)
      }, 80)
    } else {
      setDisplayValue(value)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRolling, isKept, value])

  // When rolling stops, snap to actual value
  useEffect(() => {
    if (!isRolling) {
      setDisplayValue(value)
    }
  }, [isRolling, value])

  const dots = dotPositions[displayValue] || []
  const clickable = canKeep && !disabled

  return (
    <button
      type="button"
      onClick={() => clickable && onClick?.(index)}
      disabled={!clickable}
      className={`
        relative h-20 w-20 sm:h-24 sm:w-24 rounded-xl border-2 transition-all duration-150
        ${isKept
          ? 'border-green-400 bg-green-900/40 shadow-lg shadow-green-500/20 scale-105'
          : 'border-zinc-600 bg-zinc-800'
        }
        ${clickable ? 'cursor-pointer hover:border-zinc-400 active:scale-95' : 'cursor-default'}
        ${isRolling && !isKept ? 'animate-pulse' : ''}
      `}
    >
      {dots.map(([x, y], i) => (
        <div
          key={i}
          className={`absolute h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full ${
            isKept ? 'bg-green-300' : 'bg-white'
          }`}
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      {isKept && (
        <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
          &#10003;
        </div>
      )}
    </button>
  )
}

export function Dice2D({
  dice,
  keptDice,
  isRolling,
  onDieClick,
  onRollComplete,
  disabled,
  canKeep,
}: Dice2DProps) {
  const hasCalledComplete = useRef(false)

  useEffect(() => {
    if (isRolling) {
      hasCalledComplete.current = false
      const timer = setTimeout(() => {
        if (!hasCalledComplete.current && onRollComplete) {
          hasCalledComplete.current = true
          onRollComplete()
        }
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [isRolling, onRollComplete])

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {dice.map((value, index) => (
          <DieFace
            key={index}
            value={value}
            index={index}
            isKept={keptDice[index] || false}
            isRolling={isRolling}
            onClick={onDieClick}
            disabled={disabled}
            canKeep={canKeep}
          />
        ))}
      </div>
    </div>
  )
}
