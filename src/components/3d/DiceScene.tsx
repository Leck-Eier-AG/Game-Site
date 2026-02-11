'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { AdaptiveDpr } from '@react-three/drei'
import { Die } from './Die'
import { DiceTable } from './DiceTable'
import type { DiceValue } from '@/types/game'

interface DiceSceneProps {
  dice: DiceValue[]
  keptDice: boolean[]
  isRolling: boolean
  onDieClick?: (index: number) => void
  onRollComplete?: () => void
  disabled?: boolean
  canKeep?: boolean
}

/**
 * Loading fallback for the 3D scene
 */
function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-green-500" />
        <p className="text-sm text-gray-400">Loading 3D scene...</p>
      </div>
    </div>
  )
}

/**
 * Inner scene component with physics and dice
 */
function DiceSceneInner({
  dice,
  keptDice,
  isRolling,
  onDieClick,
  onRollComplete,
  disabled,
  canKeep,
}: DiceSceneProps) {
  const [settledCount, setSettledCount] = useState(0)
  const hasCalledComplete = useRef(false)
  const rollCompleteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Track when dice have settled
  useEffect(() => {
    if (isRolling) {
      setSettledCount(0)
      hasCalledComplete.current = false

      // Auto-complete after 3 seconds
      rollCompleteTimer.current = setTimeout(() => {
        if (!hasCalledComplete.current && onRollComplete) {
          hasCalledComplete.current = true
          onRollComplete()
        }
      }, 3000)
    }

    return () => {
      if (rollCompleteTimer.current) {
        clearTimeout(rollCompleteTimer.current)
      }
    }
  }, [isRolling, onRollComplete])

  // Handle die clicks
  const handleDieClick = (index: number) => {
    if (canKeep && !disabled && onDieClick) {
      onDieClick(index)
    }
  }

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />

      {/* Directional light with shadows */}
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Physics world */}
      <Physics gravity={[0, -30, 0]}>
        {/* Table surface */}
        <DiceTable />

        {/* Five dice */}
        {dice.map((value, index) => (
          <Die
            key={index}
            value={value}
            index={index}
            isKept={keptDice[index] || false}
            isRolling={isRolling}
            onClick={handleDieClick}
            disabled={disabled || !canKeep}
          />
        ))}
      </Physics>
    </>
  )
}

/**
 * 3D Dice Scene with React Three Fiber and Rapier physics
 *
 * Renders five dice on a green felt table with realistic physics simulation.
 * Supports rolling animations, keeping dice, and click interactions.
 *
 * @example
 * ```tsx
 * <DiceScene
 *   dice={[1, 2, 3, 4, 5]}
 *   keptDice={[false, true, false, false, false]}
 *   isRolling={false}
 *   onDieClick={(index) => toggleKeep(index)}
 *   onRollComplete={() => console.log('Roll complete')}
 *   canKeep={true}
 * />
 * ```
 */
export function DiceScene(props: DiceSceneProps) {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          shadows
          camera={{ position: [0, 8, 6], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <AdaptiveDpr pixelated />
          <DiceSceneInner {...props} />
        </Canvas>
      </Suspense>
    </div>
  )
}
