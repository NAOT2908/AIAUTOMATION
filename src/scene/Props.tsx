import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import type { Material } from 'three'
import { M, glow, tint } from './materials'

type XZ = { x: number; z: number; rot?: number; s?: number }

/** desk whose monitor faces -z (toward the robot sitting behind it) */
export function Desk({ x, z, color, wide = false }: { x: number; z: number; color: string; wide?: boolean }) {
  const w = wide ? 1.9 : 1.45
  const screen = useMemo(() => glow(color, 0.9), [color])
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI}>
      <RoundedBox args={[w, 0.06, 0.78]} radius={0.025} position={[0, 0.74, 0]} material={wide ? M.woodDark : M.white} castShadow receiveShadow />
      <mesh position={[-w / 2 + 0.06, 0.37, 0]} material={M.metal} castShadow><boxGeometry args={[0.05, 0.72, 0.68]} /></mesh>
      <mesh position={[w / 2 - 0.06, 0.37, 0]} material={M.metal} castShadow><boxGeometry args={[0.05, 0.72, 0.68]} /></mesh>
      {/* monitor */}
      <mesh position={[0, 0.86, -0.2]} material={M.darkMetal}><cylinderGeometry args={[0.025, 0.025, 0.2, 8]} /></mesh>
      <mesh position={[0, 0.77, -0.2]} material={M.darkMetal}><boxGeometry args={[0.24, 0.02, 0.16]} /></mesh>
      <RoundedBox args={[0.82, 0.5, 0.05]} radius={0.02} position={[0, 1.15, -0.22]} material={M.screenFrame} castShadow />
      <mesh position={[0, 1.15, -0.193]} material={screen}><planeGeometry args={[0.74, 0.42]} /></mesh>
      {/* keyboard + mug */}
      <mesh position={[0, 0.78, 0.12]} material={M.offWhite}><boxGeometry args={[0.5, 0.02, 0.16]} /></mesh>
      <mesh position={[w / 2 - 0.22, 0.82, 0.1]} material={tint(color)} castShadow><cylinderGeometry args={[0.05, 0.045, 0.1, 12]} /></mesh>
    </group>
  )
}

export function Plant({ x, z, s = 1 }: XZ) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.2, 0]} material={M.pot} castShadow receiveShadow><cylinderGeometry args={[0.2, 0.16, 0.4, 16]} /></mesh>
      <mesh position={[0, 0.62, 0]} material={M.leaf} castShadow><sphereGeometry args={[0.3, 16, 12]} /></mesh>
      <mesh position={[0.12, 0.85, 0.05]} material={M.leafLight} castShadow><sphereGeometry args={[0.2, 14, 10]} /></mesh>
      <mesh position={[-0.12, 0.8, -0.06]} material={M.leafDark} castShadow><sphereGeometry args={[0.18, 14, 10]} /></mesh>
    </group>
  )
}

export function Tree({ x, z, s = 1, variant = 0 }: XZ & { variant?: number }) {
  const leaf = [M.leaf, M.leafDark, M.leafLight][variant % 3]
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.6, 0]} material={M.trunk} castShadow><cylinderGeometry args={[0.08, 0.11, 1.2, 8]} /></mesh>
      <mesh position={[0, 1.6, 0]} scale={[1, 1.25, 1]} material={leaf} castShadow><sphereGeometry args={[0.6, 18, 14]} /></mesh>
    </group>
  )
}

export function Bush({ x, z, s = 1 }: XZ) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.22, 0]} material={M.leafDark} castShadow><sphereGeometry args={[0.32, 14, 10]} /></mesh>
      <mesh position={[0.3, 0.17, 0.08]} material={M.leaf} castShadow><sphereGeometry args={[0.24, 12, 10]} /></mesh>
    </group>
  )
}

export function Bookshelf({ x, z, rot = 0 }: XZ) {
  const books = [M.brand, M.yellow, M.red, M.leafDark, M.brandSoft, M.woodDark]
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <RoundedBox args={[1.2, 1.7, 0.38]} radius={0.03} position={[0, 0.85, 0]} material={M.white} castShadow receiveShadow />
      {[0.45, 0.95, 1.42].map((y, row) => (
        <group key={y} position={[0, y, 0.05]}>
          {books.map((m, i) => (
            <mesh key={i} position={[-0.45 + i * 0.16 + (row % 2) * 0.05, 0.13, 0]} material={m} castShadow>
              <boxGeometry args={[0.1, 0.28 - ((i + row) % 3) * 0.04, 0.26]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export function Cabinet({ x, z, rot = 0 }: XZ) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <RoundedBox args={[0.6, 1.2, 0.55]} radius={0.03} position={[0, 0.6, 0]} material={M.offWhite} castShadow receiveShadow />
      {[0.3, 0.65, 1.0].map(y => (
        <mesh key={y} position={[0, y, 0.28]} material={M.brand}><boxGeometry args={[0.22, 0.04, 0.02]} /></mesh>
      ))}
    </group>
  )
}

export function Sofa({ x, z, rot = 0 }: XZ) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <RoundedBox args={[1.6, 0.36, 0.7]} radius={0.1} position={[0, 0.24, 0]} material={M.fabric} castShadow receiveShadow />
      <RoundedBox args={[1.6, 0.5, 0.2]} radius={0.08} position={[0, 0.55, -0.27]} material={M.fabric} castShadow />
      <RoundedBox args={[0.2, 0.42, 0.7]} radius={0.08} position={[-0.78, 0.4, 0]} material={M.fabric} castShadow />
      <RoundedBox args={[0.2, 0.42, 0.7]} radius={0.08} position={[0.78, 0.4, 0]} material={M.fabric} castShadow />
    </group>
  )
}

export function Whiteboard({ x, z, rot = 0, color }: XZ & { color: string }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh position={[-0.7, 0.75, 0]} material={M.metal}><cylinderGeometry args={[0.03, 0.03, 1.5, 8]} /></mesh>
      <mesh position={[0.7, 0.75, 0]} material={M.metal}><cylinderGeometry args={[0.03, 0.03, 1.5, 8]} /></mesh>
      <RoundedBox args={[1.5, 0.9, 0.05]} radius={0.02} position={[0, 1.15, 0]} material={M.white} castShadow />
      {/* a little bar chart drawn on the board */}
      {[0.25, 0.4, 0.32, 0.55].map((h, i) => (
        <mesh key={i} position={[-0.45 + i * 0.3, 0.85 + h / 2, 0.03]} material={tint(color)}><boxGeometry args={[0.16, h, 0.01]} /></mesh>
      ))}
    </group>
  )
}

export function Rug({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  return <RoundedBox args={[w, 0.02, d]} radius={0.01} position={[x, 0.045, z]} material={tint(color, 0.95)} receiveShadow />
}

export function Pallet({ x, z, rot = 0, boxes = 4, mat }: XZ & { boxes?: number; mat?: Material }) {
  const spots = [[-0.24, 0, -0.24], [0.24, 0, -0.24], [-0.24, 0, 0.24], [0.24, 0, 0.24], [-0.24, 1, 0], [0.24, 1, 0]]
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh position={[0, 0.07, 0]} material={M.palletBlue} castShadow receiveShadow><boxGeometry args={[1, 0.12, 1]} /></mesh>
      {spots.slice(0, boxes).map(([bx, level, bz], i) => (
        <RoundedBox key={i} args={[0.46, 0.42, 0.46]} radius={0.02} position={[bx, 0.34 + level * 0.43, bz]} material={mat ?? (i % 2 ? M.cardboardDark : M.cardboard)} castShadow />
      ))}
    </group>
  )
}

export function Forklift({ x, z, rot = 0 }: XZ) {
  return (
    <group position={[x, 0, z]} rotation-y={rot} scale={0.8}>
      <RoundedBox args={[0.9, 0.55, 1.2]} radius={0.08} position={[0, 0.45, 0]} material={M.yellow} castShadow />
      {/* driver cage */}
      <mesh position={[0, 1.32, -0.15]} material={M.black} castShadow><boxGeometry args={[0.8, 0.05, 0.85]} /></mesh>
      {[[-0.38, 0.25], [0.38, 0.25], [-0.38, -0.55], [0.38, -0.55]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 1.02, pz]} material={M.black}><boxGeometry args={[0.05, 0.6, 0.05]} /></mesh>
      ))}
      <mesh position={[0, 0.9, 0.75]} material={M.darkMetal}><boxGeometry args={[0.7, 1.5, 0.08]} /></mesh>
      <mesh position={[-0.2, 0.12, 1.05]} material={M.darkMetal}><boxGeometry args={[0.1, 0.05, 0.6]} /></mesh>
      <mesh position={[0.2, 0.12, 1.05]} material={M.darkMetal}><boxGeometry args={[0.1, 0.05, 0.6]} /></mesh>
      {[[-0.45, 0.4], [0.45, 0.4], [-0.45, -0.4], [0.45, -0.4]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.18, pz]} rotation-z={Math.PI / 2} material={M.tyre}><cylinderGeometry args={[0.18, 0.18, 0.14, 14]} /></mesh>
      ))}
    </group>
  )
}

export function Car({ x, z, rot = 0, color }: XZ & { color: string }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <RoundedBox args={[0.95, 0.42, 1.9]} radius={0.14} position={[0, 0.36, 0]} material={tint(color, 0.35)} castShadow />
      <RoundedBox args={[0.82, 0.36, 1.0]} radius={0.12} position={[0, 0.68, -0.08]} material={M.window} castShadow />
      {[[-0.44, 0.6], [0.44, 0.6], [-0.44, -0.6], [0.44, -0.6]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.18, pz]} rotation-z={Math.PI / 2} material={M.tyre}><cylinderGeometry args={[0.17, 0.17, 0.12, 14]} /></mesh>
      ))}
    </group>
  )
}

export function Bollard({ x, z }: XZ) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.35, 0]} material={M.yellow} castShadow><cylinderGeometry args={[0.08, 0.08, 0.7, 12]} /></mesh>
      <mesh position={[0, 0.55, 0]} material={M.black}><cylinderGeometry args={[0.085, 0.085, 0.1, 12]} /></mesh>
    </group>
  )
}

export function CoinStacks({ x, z }: XZ) {
  return (
    <group position={[x, 0, z]}>
      {[0.25, 0.4, 0.55, 0.3].map((h, i) => (
        <mesh key={i} position={[(i % 2) * 0.32, h / 2 + 0.04, Math.floor(i / 2) * 0.32]} material={M.gold} castShadow>
          <cylinderGeometry args={[0.13, 0.13, h, 18]} />
        </mesh>
      ))}
    </group>
  )
}
