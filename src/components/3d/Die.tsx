'use client'

import { useRef, useEffect, useMemo } from 'react'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { DiceValue } from '@/types/game'

interface DieProps {
  value: DiceValue
  index: number
  isKept: boolean
  isRolling: boolean
  onClick?: (index: number) => void
  disabled?: boolean
}

/**
 * Creates a canvas texture for a die face with dots
 */
function createFaceTexture(value: number): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Background - white
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  // Dots - black
  ctx.fillStyle = '#000000'
  const dotRadius = size * 0.08
  const margin = size * 0.25

  // Dot positions based on value
  const positions: { x: number; y: number }[] = []

  switch (value) {
    case 1:
      positions.push({ x: size / 2, y: size / 2 })
      break
    case 2:
      positions.push({ x: margin, y: margin })
      positions.push({ x: size - margin, y: size - margin })
      break
    case 3:
      positions.push({ x: margin, y: margin })
      positions.push({ x: size / 2, y: size / 2 })
      positions.push({ x: size - margin, y: size - margin })
      break
    case 4:
      positions.push({ x: margin, y: margin })
      positions.push({ x: size - margin, y: margin })
      positions.push({ x: margin, y: size - margin })
      positions.push({ x: size - margin, y: size - margin })
      break
    case 5:
      positions.push({ x: margin, y: margin })
      positions.push({ x: size - margin, y: margin })
      positions.push({ x: size / 2, y: size / 2 })
      positions.push({ x: margin, y: size - margin })
      positions.push({ x: size - margin, y: size - margin })
      break
    case 6:
      positions.push({ x: margin, y: margin })
      positions.push({ x: size - margin, y: margin })
      positions.push({ x: margin, y: size / 2 })
      positions.push({ x: size - margin, y: size / 2 })
      positions.push({ x: margin, y: size - margin })
      positions.push({ x: size - margin, y: size - margin })
      break
  }

  // Draw dots
  positions.forEach((pos) => {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2)
    ctx.fill()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Get the rotation that shows a specific face upward
 * Standard die layout: 1 opposite 6, 2 opposite 5, 3 opposite 4
 */
function getRotationForValue(value: DiceValue): THREE.Euler {
  switch (value) {
    case 1:
      return new THREE.Euler(0, 0, 0)
    case 2:
      return new THREE.Euler(0, 0, -Math.PI / 2)
    case 3:
      return new THREE.Euler(0, 0, Math.PI)
    case 4:
      return new THREE.Euler(0, 0, Math.PI / 2)
    case 5:
      return new THREE.Euler(-Math.PI / 2, 0, 0)
    case 6:
      return new THREE.Euler(Math.PI / 2, 0, 0)
    default:
      return new THREE.Euler(0, 0, 0)
  }
}

/**
 * Individual 3D die with physics and face rendering
 */
export function Die({ value, index, isKept, isRolling, onClick, disabled }: DieProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const hasRolled = useRef(false)
  const settleTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Create face textures
  const materials = useMemo(() => {
    const textures = [1, 2, 3, 4, 5, 6].map((v) => createFaceTexture(v))
    return textures.map(
      (texture) =>
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.5,
          metalness: 0.1,
        })
    )
  }, [])

  // Apply rolling physics when isRolling changes
  useEffect(() => {
    if (isRolling && !hasRolled.current && rigidBodyRef.current) {
      hasRolled.current = true

      const rb = rigidBodyRef.current

      // Random starting position above table
      const startX = (index - 2) * 1.5 + (Math.random() - 0.5) * 0.5
      const startY = 3 + Math.random() * 1
      const startZ = Math.random() - 0.5

      rb.setTranslation({ x: startX, y: startY, z: startZ }, true)

      // Random rotation
      const randomQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        )
      )
      rb.setRotation(randomQuat, true)

      // Apply impulse for tumbling
      const impulseStrength = 2 + Math.random() * 2
      const impulse = {
        x: (Math.random() - 0.5) * impulseStrength,
        y: -impulseStrength * 0.5,
        z: (Math.random() - 0.5) * impulseStrength,
      }
      rb.applyImpulse(impulse, true)

      // Apply torque for spinning
      const torque = {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10,
      }
      rb.applyTorqueImpulse(torque, true)

      // Set timeout to snap to final value after 3 seconds
      settleTimeout.current = setTimeout(() => {
        if (rigidBodyRef.current) {
          const targetRotation = getRotationForValue(value)
          const targetQuat = new THREE.Quaternion().setFromEuler(targetRotation)
          rigidBodyRef.current.setRotation(targetQuat, true)
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
          rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        }
      }, 3000)
    } else if (!isRolling) {
      hasRolled.current = false
    }

    return () => {
      if (settleTimeout.current) {
        clearTimeout(settleTimeout.current)
      }
    }
  }, [isRolling, value, index])

  // Handle kept state
  useEffect(() => {
    if (isKept && rigidBodyRef.current) {
      // Elevate kept dice slightly
      const currentPos = rigidBodyRef.current.translation()
      rigidBodyRef.current.setTranslation(
        { x: currentPos.x, y: 0.6, z: currentPos.z },
        true
      )
    }
  }, [isKept])

  // Handle click
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(index)
    }
  }

  // Kept dice glow effect
  const emissive = isKept ? 'hsl(142, 70%, 45%)' : '#000000'
  const emissiveIntensity = isKept ? 0.3 : 0

  // Cleanup
  useEffect(() => {
    return () => {
      materials.forEach((mat) => {
        mat.map?.dispose()
        mat.dispose()
      })
    }
  }, [materials])

  return (
    <RigidBody
      ref={rigidBodyRef}
      type={isKept ? 'kinematicPosition' : 'dynamic'}
      position={[(index - 2) * 1.5, 0.5, 0]}
      rotation={getRotationForValue(value)}
      restitution={0.5}
      friction={0.8}
      canSleep={true}
      linearDamping={2}
      angularDamping={2}
    >
      <mesh
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => {
          if (!disabled) {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        {materials.map((mat, i) => (
          <meshStandardMaterial
            key={i}
            attach={`material-${i}`}
            map={mat.map}
            roughness={0.5}
            metalness={0.1}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        ))}
      </mesh>
    </RigidBody>
  )
}
