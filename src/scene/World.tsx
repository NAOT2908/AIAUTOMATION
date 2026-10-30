import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { MeshBasicMaterial } from 'three'
import { DEPTS } from '../sim/data'
import { FLOOR, ROOM_D, ROOM_W } from './layout'
import { M, tint } from './materials'
import { Bush, Car, Tree } from './Props'
import type { SceneTheme } from './theme'

const W = FLOOR.maxX - FLOOR.minX
const D = FLOOR.maxZ - FLOOR.minZ
const CX = (FLOOR.maxX + FLOOR.minX) / 2
const CZ = (FLOOR.maxZ + FLOOR.minZ) / 2
const GROUND_Y = -0.12
const FRONT_ROAD_Z = 14
const SIDE_ROAD_X = 13.4
const GATE_X = DEPTS.gate.pos[0]

/** glass partition: white base, glass panel, blue top rail */
function Partition({ x, z, len, alongX }: { x: number; z: number; len: number; alongX: boolean }) {
  const size = (w: number, h: number, d: number): [number, number, number] => (alongX ? [w, h, d] : [d, h, w])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.07, 0]} material={M.white} castShadow receiveShadow><boxGeometry args={size(len, 0.14, 0.12)} /></mesh>
      <mesh position={[0, 0.68, 0]} material={M.glass}><boxGeometry args={size(len, 1.08, 0.04)} /></mesh>
      <mesh position={[0, 1.24, 0]} material={M.brand} castShadow><boxGeometry args={size(len, 0.05, 0.08)} /></mesh>
      {[-len / 2, len / 2].map(o => (
        <mesh key={o} position={alongX ? [o, 0.62, 0] : [0, 0.62, o]} material={M.white} castShadow><boxGeometry args={[0.07, 1.24, 0.07]} /></mesh>
      ))}
    </group>
  )
}

function ExteriorWall({ alongX, theme }: { alongX: boolean; theme: SceneTheme }) {
  const len = alongX ? W : D
  const h = 2.5
  const pos: [number, number, number] = alongX ? [CX, h / 2, FLOOR.minZ + 0.12] : [FLOOR.minX + 0.12, h / 2, CZ]
  const size = (l: number, hh: number, t: number): [number, number, number] => (alongX ? [l, hh, t] : [t, hh, l])
  const windows = useMemo(() => {
    const out: number[] = []
    for (let o = -len / 2 + 1.6; o < len / 2 - 1; o += 2.4) out.push(o)
    return out
  }, [len])
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow><boxGeometry args={size(len, h, 0.24)} /><meshStandardMaterial color={theme.wall} roughness={0.8} /></mesh>
      {windows.map(o => (
        <mesh key={o} position={alongX ? [o, 0.2, 0.13] : [0.13, 0.2, o]} material={M.window}>
          <boxGeometry args={size(1.7, 1.1, 0.03)} />
        </mesh>
      ))}
      <mesh position={[0, h / 2 + 0.04, 0]} material={M.brand}><boxGeometry args={size(len, 0.08, 0.28)} /></mesh>
    </group>
  )
}

function Roads({ theme }: { theme: SceneTheme }) {
  const dashes = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = []
    for (let x = -40; x <= 65; x += 2.2) {
      if (Math.abs(x - GATE_X) > 2.2 && Math.abs(x - SIDE_ROAD_X) > 2.5) {
        out.push({ p: [x, GROUND_Y + 0.012, FRONT_ROAD_Z], r: 0 })
      }
    }
    for (let z = -35; z <= 65; z += 2.2) {
      if (Math.abs(z - FRONT_ROAD_Z) > 2.5) {
        out.push({ p: [SIDE_ROAD_X, GROUND_Y + 0.012, z], r: Math.PI / 2 })
      }
    }
    return out
  }, [])
  const road = <meshStandardMaterial color={theme.road} roughness={0.95} />
  const dash = useMemo(() => new MeshBasicMaterial(), [])
  dash.color.set(theme.line)

  // Crosswalk zebra stripes at the 4-way intersection [SIDE_ROAD_X, FRONT_ROAD_Z]
  const crosswalks = useMemo(() => {
    const stripes: { p: [number, number, number]; size: [number, number] }[] = []
    // North crosswalk
    for (let dx = -1.4; dx <= 1.4; dx += 0.5) {
      stripes.push({ p: [SIDE_ROAD_X + dx, GROUND_Y + 0.014, FRONT_ROAD_Z - 2.6], size: [0.25, 1.2] })
    }
    // South crosswalk
    for (let dx = -1.4; dx <= 1.4; dx += 0.5) {
      stripes.push({ p: [SIDE_ROAD_X + dx, GROUND_Y + 0.014, FRONT_ROAD_Z + 2.6], size: [0.25, 1.2] })
    }
    // East crosswalk
    for (let dz = -1.4; dz <= 1.4; dz += 0.5) {
      stripes.push({ p: [SIDE_ROAD_X + 2.6, GROUND_Y + 0.014, FRONT_ROAD_Z + dz], size: [1.2, 0.25] })
    }
    // West crosswalk
    for (let dz = -1.4; dz <= 1.4; dz += 0.5) {
      stripes.push({ p: [SIDE_ROAD_X - 2.6, GROUND_Y + 0.014, FRONT_ROAD_Z + dz], size: [1.2, 0.25] })
    }
    return stripes
  }, [])

  return (
    <group>
      {/* Main East-West Boulevard */}
      <mesh rotation-x={-Math.PI / 2} position={[12, GROUND_Y + 0.006, FRONT_ROAD_Z]} receiveShadow>
        <planeGeometry args={[120, 3.8]} />
        {road}
      </mesh>
      {/* Main North-South Avenue */}
      <mesh rotation-x={-Math.PI / 2} position={[SIDE_ROAD_X, GROUND_Y + 0.005, 14]} receiveShadow>
        <planeGeometry args={[3.8, 120]} />
        {road}
      </mesh>
      {/* Delivery Bay Road into RoboCorp */}
      {/* the delivery bay road only joins the boulevard: it must not cut through the pagoda south of it */}
      <mesh rotation-x={-Math.PI / 2} position={[GATE_X, GROUND_Y + 0.007, (FLOOR.maxZ + FRONT_ROAD_Z) / 2]} receiveShadow>
        <planeGeometry args={[2.8, FRONT_ROAD_Z - FLOOR.maxZ]} />
        {road}
      </mesh>
      {/* Road Dashes */}
      {dashes.map((d, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} rotation-z={d.r} position={d.p} material={dash}>
          <planeGeometry args={[1.0, 0.1]} />
        </mesh>
      ))}
      {/* Zebra Crosswalk Stripes */}
      {crosswalks.map((c, i) => (
        <mesh key={`cw-${i}`} rotation-x={-Math.PI / 2} position={c.p} material={dash}>
          <planeGeometry args={c.size} />
        </mesh>
      ))}
    </group>
  )
}

function Parking({ theme }: { theme: SceneTheme }) {
  const z = 11.1
  const slots = [-8, -6.2, -4.4, -2.6, -0.8, 1.0, 2.8]
  const cars: [number, string][] = [[-8, '#E05252'], [-6.2, '#2E6BF0'], [-2.6, '#F7F9FC'], [-0.8, '#F6B826'], [2.8, '#4FAF92']]
  return (
    <group>
      {[...slots, 3.7].map(x => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x - 0.9, GROUND_Y + 0.01, z]}>
          <planeGeometry args={[0.08, 2.4]} />
          <meshBasicMaterial color={theme.line} />
        </mesh>
      ))}
      {cars.map(([x, color]) => <Car key={x} x={x} z={z} color={color} rot={Math.PI} />)}
    </group>
  )
}

function Greenery() {
  const trees: [number, number, number][] = [
    // RoboCorp perimeter
    [-11.4, -7, 1.1], [-11.6, -3.4, 0.9], [-11.3, 0.4, 1.2], [-11.7, 4, 1], [-11.2, 7.6, 0.95],
    [-7, -10.2, 1], [-2.6, -10.6, 1.2], [1.8, -10.1, 0.9], [6.2, -10.5, 1.1], [10.4, -10.2, 1],
    [10.9, -6, 1.1], [10.6, -1.8, 0.9], [11, 2.2, 1], [-10.6, 11.2, 1], [9.9, 11.4, 1.1],
    // RoboBistro side
    [16.5, -8.0, 1.0], [16.5, -3.5, 0.9], [16.5, 2.0, 1.1], [35.0, -8.0, 1.0], [35.0, 0, 1.1], [35.0, 7.0, 0.95],
    // RoboStudio side
    [-11.5, 22.0, 1.0], [-11.5, 34.0, 1.1], [7.0, 36.0, 1.0],
    // RoboFashion side
    [16.5, 22.0, 1.0], [16.5, 34.0, 0.95], [35.0, 22.0, 1.1], [35.0, 34.0, 1.0],
    // Central intersection greenery
    [10.0, 17.5, 1.2], [17.0, 17.5, 1.2], [10.0, 10.5, 1.1], [17.0, 10.5, 1.1]
  ]
  const bushes: [number, number][] = [
    [-10.2, -8.9], [-9.9, 9.6], [9.8, 9.4], [10.3, -8.8], [-4.9, -9.1], [3.4, -9.2], [4.6, 9.6], [-10.3, 1.9],
    [18.0, -7.5], [33.5, -7.5], [18.0, 6.5], [33.5, 6.5],
    [-10.0, 21.0], [-10.0, 35.0], [6.0, 35.0],
    [18.0, 21.0], [33.5, 21.0], [18.0, 35.0], [33.5, 35.0]
  ]
  return (
    <group>
      {trees.map(([x, z, s], i) => <Tree key={i} x={x} z={z} s={s} variant={i} />)}
      {bushes.map(([x, z], i) => <Bush key={i} x={x} z={z} s={0.9 + (i % 3) * 0.15} />)}
    </group>
  )
}

export function World({ theme }: { theme: SceneTheme }) {
  const depts = Object.values(DEPTS)
  // interior partitions: back wall for rooms not on the back row, left wall for rooms not on the left column
  const backs = depts.filter(d => d.pos[1] > -5)
  const lefts = depts.filter(d => d.pos[0] > -6)
  const corridor = useMemo(() => tint('#F2B705', 0.7), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, GROUND_Y, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={theme.ground} roughness={1} />
      </mesh>
      <Roads theme={theme} />
      <Parking theme={theme} />
      <Greenery />

      <RoundedBox args={[W, 0.24, D]} radius={0.08} position={[CX, -0.12, CZ]} receiveShadow castShadow>
        <meshStandardMaterial color={theme.slab} roughness={0.75} />
      </RoundedBox>
      {/* dashed walkway guides in the two main corridors */}
      {[-2.7, 2.7].flatMap(z => Array.from({ length: 14 }, (_, i) => (
        <mesh key={`${z}-${i}`} rotation-x={-Math.PI / 2} position={[-8.4 + i * 1.3, 0.005, z]} material={corridor}>
          <planeGeometry args={[0.55, 0.06]} />
        </mesh>
      )))}

      <ExteriorWall alongX theme={theme} />
      <ExteriorWall alongX={false} theme={theme} />
      {backs.map(d => <Partition key={'b' + d.id} x={d.pos[0]} z={d.pos[1] - ROOM_D / 2} len={ROOM_W} alongX />)}
      {lefts.map(d => <Partition key={'l' + d.id} x={d.pos[0] - ROOM_W / 2} z={d.pos[1]} len={ROOM_D} alongX={false} />)}
    </group>
  )
}

export { GROUND_Y, GATE_X, FRONT_ROAD_Z as BOULEVARD_Z }
