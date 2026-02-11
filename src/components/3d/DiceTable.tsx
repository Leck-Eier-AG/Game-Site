'use client'

import { RigidBody } from '@react-three/rapier'

/**
 * Green felt table surface for dice to land on
 * Includes edge bumpers to keep dice from falling off
 */
export function DiceTable() {
  return (
    <>
      {/* Main table surface - green felt */}
      <RigidBody type="fixed" position={[0, 0, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 8]} />
          <meshStandardMaterial
            color="hsl(142, 70%, 45%)"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      </RigidBody>

      {/* Edge bumpers to keep dice on table */}
      {/* Front bumper */}
      <RigidBody type="fixed" position={[0, 0.5, 4]}>
        <mesh>
          <boxGeometry args={[12, 1, 0.2]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>

      {/* Back bumper */}
      <RigidBody type="fixed" position={[0, 0.5, -4]}>
        <mesh>
          <boxGeometry args={[12, 1, 0.2]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>

      {/* Left bumper */}
      <RigidBody type="fixed" position={[-6, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.2, 1, 8]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>

      {/* Right bumper */}
      <RigidBody type="fixed" position={[6, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.2, 1, 8]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>
    </>
  )
}
