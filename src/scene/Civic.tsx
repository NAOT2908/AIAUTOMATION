import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CanvasTexture, DoubleSide, Group, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { CurvedRoof, signTexture2, stripeTexture } from './arch'
import { Box, Tree } from './Districts'
import { ChibiHuman } from './Human'
import { M, glow, tint } from './materials'
import { CarModel } from './Vehicles'
import { Interactive } from './interact'
import { useUI } from '../store'

const PI = Math.PI

/* ================================================================ football pitch */

export const PITCH_POS: [number, number, number] = [-18, 0, -28]
const PW = 22, PD = 13 // pitch size (x, z)

function pitchTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 608
  const g = c.getContext('2d')!
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#5DAE4E' : '#67B957'; g.fillRect(i * (1024 / 12), 0, 1024 / 12 + 1, 608) }
  g.strokeStyle = '#F5F8F2'
  g.lineWidth = 6
  g.strokeRect(24, 24, 976, 560)
  g.beginPath(); g.moveTo(512, 24); g.lineTo(512, 584); g.stroke()
  g.beginPath(); g.arc(512, 304, 80, 0, PI * 2); g.stroke()
  g.strokeRect(24, 164, 140, 280); g.strokeRect(860, 164, 140, 280)
  g.strokeRect(24, 234, 50, 140); g.strokeRect(950, 234, 50, 140)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

function Goal({ x, flip }: { x: number; flip: boolean }) {
  const white = M.white
  const net = useMemo(() => new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.3, side: DoubleSide }), [])
  return (
    <group position={[x, 0, 0]} rotation-y={flip ? PI : 0}>
      {[-1.2, 1.2].map(z => <mesh key={z} position={[0, 0.5, z]} material={white} castShadow><cylinderGeometry args={[0.05, 0.05, 1.0, 8]} /></mesh>)}
      <mesh position={[0, 1.0, 0]} rotation-x={PI / 2} material={white}><cylinderGeometry args={[0.05, 0.05, 2.45, 8]} /></mesh>
      <mesh position={[-0.45, 0.5, 0]} rotation-y={PI / 2} material={net}><planeGeometry args={[2.4, 1.0]} /></mesh>
    </group>
  )
}

/** players chase a ball that wanders round the pitch; keepers shadow it along their line */
function Match() {
  const ball = useRef<Group>(null)
  const players = useRef<(Group | null)[]>([])
  const roster = useMemo(() => [
    ...[[-5, -3], [-3, 2.5], [-1, -0.5]].map(([x, z]) => ({ home: [x, z], team: 0 })),
    ...[[5, 3], [3, -2.5], [1, 0.5]].map(([x, z]) => ({ home: [x, z], team: 1 })),
    { home: [-PW / 2 + 0.8, 0], team: 0, keeper: true },
    { home: [PW / 2 - 0.8, 0], team: 1, keeper: true },
  ] as { home: number[]; team: number; keeper?: boolean }[], [])
  const pos = useRef(roster.map(r => ({ x: r.home[0], z: r.home[1] })))
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const bx = Math.sin(t * 0.31) * 8 + Math.sin(t * 0.83) * 2, bz = Math.sin(t * 0.47 + 1) * 4.5
    if (ball.current) { ball.current.position.set(bx, 0.13 + Math.abs(Math.sin(t * 5)) * 0.08, bz); ball.current.rotation.x += dt * 6 }
    roster.forEach((r, i) => {
      const g = players.current[i]
      if (!g) return
      const p = pos.current[i]
      // keepers stay on their line; others mix their position with the ball's
      const tx = r.keeper ? r.home[0] : r.home[0] * 0.45 + bx * 0.55
      const tz = r.keeper ? Math.max(-1.1, Math.min(1.1, bz * 0.3)) : r.home[1] * 0.4 + bz * 0.6
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz)
      const step = Math.min(d, (r.keeper ? 1.5 : 3.2) * dt)
      if (d > 0.05) { p.x += (dx / d) * step; p.z += (dz / d) * step; g.rotation.y = Math.atan2(dx, dz) }
      else g.rotation.y = Math.atan2(bx - p.x, bz - p.z)
      g.position.set(p.x, 0, p.z)
    })
  })
  return (
    <group>
      <group ref={ball}>
        <mesh material={M.white} castShadow><icosahedronGeometry args={[0.13, 1]} /></mesh>
        <mesh material={M.black} scale={1.01}><icosahedronGeometry args={[0.13, 0]} /></mesh>
      </group>
      {roster.map((r, i) => (
        <group key={i} ref={el => { players.current[i] = el }}>
          <ChibiHuman pos={[0, 0, 0]} role="guest" action="walk" name={`cau-thu-${i}`} voice="player"
            shirtColor={r.keeper ? '#F59E0B' : r.team ? '#DC2626' : '#2563EB'} pantsColor="#F8FAFC" hair={i % 2 ? 'short' : 'bun'} />
        </group>
      ))}
    </group>
  )
}

export function FootballPitch() {
  const mat = useMemo(() => new MeshStandardMaterial({ map: pitchTexture(), roughness: 0.95 }), [])
  return (
    <group position={PITCH_POS}>
      <mesh position={[0, -0.07, 0]} rotation-x={-PI / 2} material={mat} receiveShadow><planeGeometry args={[PW + 1.2, PD + 1.2]} /></mesh>
      <Interactive name="Khung thành" hint="Bấm để chơi Sút phạt đền ⚽" onActivate={() => useUI.setState({ game: 'penalty' })}>
        <Goal x={-PW / 2} flip />
        <Goal x={PW / 2} flip={false} />
      </Interactive>
      <Match />
      {/* stand with supporters along the north side */}
      <group position={[0, 0, -PD / 2 - 2.2]}>
        {[0, 1, 2].map(k => <Box key={k} s={[14, 0.45, 0.9]} p={[0, 0.22 + k * 0.45, -k * 0.9]} c={k % 2 ? '#2563EB' : '#E5E7EB'} r={0.6} />)}
        {[-5, -2.5, 0.5, 3, 5.5].map((x, i) => (
          <ChibiHuman key={i} pos={[x, 0.45 + (i % 3) * 0.45, -(i % 3) * 0.9]} rot={0} role="guest" action={i % 2 ? 'dance' : 'sit'} seat={0.0}
            name={`co-dong-vien-${i}`} voice="fan" shirtColor={i % 2 ? '#2563EB' : '#DC2626'} />
        ))}
      </group>
    </group>
  )
}

/* ================================================================ school */

export const SCHOOL_POS: [number, number, number] = [3.5, 0, -30]

function Flag() {
  const ref = useRef<Group>(null)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 300
    c.height = 200
    const g = c.getContext('2d')!
    g.fillStyle = '#DA251D'
    g.fillRect(0, 0, 300, 200)
    g.fillStyle = '#FFCD00'
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 26 : 62, a = -PI / 2 + (i * PI) / 5
      g.lineTo(150 + Math.cos(a) * r, 100 + Math.sin(a) * r)
    }
    g.closePath()
    g.fill()
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
  const geo = useMemo(() => new PlaneGeometry(1.5, 1.0, 12, 1), [])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo])
  useFrame(state => {
    const pos = geo.attributes.position
    const t = state.clock.elapsedTime
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      pos.setZ(i, Math.sin(x * 3 - t * 4) * 0.12 * (x + 0.75))
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 3, 0]} material={M.metal} castShadow><cylinderGeometry args={[0.05, 0.06, 6, 10]} /></mesh>
      <mesh geometry={geo} position={[0.78, 5.4, 0]}>
        <meshStandardMaterial map={tex} side={DoubleSide} roughness={0.8} />
      </mesh>
    </group>
  )
}

/** kids playing tag in the schoolyard */
function Recess() {
  const kids = useRef<(Group | null)[]>([])
  const n = 5
  useFrame(state => {
    const t = state.clock.elapsedTime
    kids.current.forEach((g, i) => {
      if (!g) return
      const a = t * (0.5 + i * 0.07) + i * 1.3
      const x = Math.cos(a) * (2.2 + i * 0.3), z = Math.sin(a * 1.3) * 1.4
      const dx = -Math.sin(a) * (2.2 + i * 0.3), dz = Math.cos(a * 1.3) * 1.3 * 1.4
      g.position.set(x, 0, z)
      g.rotation.y = Math.atan2(dx, dz)
    })
  })
  return (
    <group position={[0, 0, 3.6]}>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} ref={el => { kids.current[i] = el }} scale={0.75}>
          <ChibiHuman pos={[0, 0, 0]} role="guest" action="walk" name={`hoc-sinh-${i}`} voice="kid"
            shirtColor="#F8FAFC" pantsColor={i % 2 ? '#1E3A8A' : '#B91C1C'} hair={(['short', 'bun', 'long'] as const)[i % 3]} />
        </group>
      ))}
    </group>
  )
}

export function School() {
  const sign = useMemo(() => new MeshBasicMaterial({ map: signTexture2('TRƯỜNG TIỂU HỌC ROBOCITY', '', '#1E3A8A', '#FFFFFF', 1024, 160), toneMapped: false }), [])
  const wall = '#F3DFA2'
  return (
    <group position={SCHOOL_POS}>
      <mesh position={[0, -0.07, 0]} rotation-x={-PI / 2} material={tint('#D8CFC0', 0.9)} receiveShadow><planeGeometry args={[15, 18]} /></mesh>
      {/* two-storey classroom block with a tiled roof and rows of windows */}
      <group position={[0, 0, -4.8]}>
        <Box s={[13, 5, 4.2]} p={[0, 2.5, 0]} c={wall} r={0.85} />
        <Box s={[13.2, 0.2, 1.2]} p={[0, 2.5, 2.6]} c="#E8E2D6" />
        {[-1, 1].flatMap(f => [-5, -3, -1, 1, 3, 5].map(x => (
          <Box key={`${f}${x}`} s={[1.1, 1.1, 0.06]} p={[x, f < 0 ? 1.35 : 3.75, 2.12]} c="#5B8BC9" r={0.2} />
        )))}
        <group position={[0, 5, 0]}><CurvedRoof w={14} d={5.4} h={1.4} curl={0.05} ridge color="#B4462F" /></group>
      </group>
      {/* gate and sign */}
      {[-2.4, 2.4].map(x => <Box key={x} s={[0.5, 2.6, 0.5]} p={[x, 1.3, 8.6]} c="#E8E2D6" />)}
      <Box s={[5.6, 0.7, 0.3]} p={[0, 2.9, 8.6]} c="#1E3A8A" r={0.5} />
      <mesh position={[0, 2.9, 8.76]} material={sign}><planeGeometry args={[5.4, 0.55]} /></mesh>
      <group position={[-5.5, 0, 2.5]}><Flag /></group>
      <Tree x={5.8} z={3.5} s={0.9} />
      <Tree x={-6.2} z={7.2} s={0.8} />
      <Recess />
      <ChibiHuman pos={[3.2, 0, 1.4]} rot={-0.8} role="guest" action="idle" name="co-giao" voice="teacher" shirtColor="#BE185D" hair="long" />
    </group>
  )
}

/* ================================================================ market */

export const MARKET_POS: [number, number, number] = [-38, 0, -28]

function Stall({ x, z, color, goods }: { x: number; z: number; color: string; goods: string[] }) {
  const awning = useMemo(() => new MeshStandardMaterial({ map: stripeTexture(color, '#FFF8EC'), roughness: 0.8, side: DoubleSide }), [color])
  return (
    <group position={[x, 0, z]}>
      {[[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]].map(([px, pz]) => (
        <mesh key={`${px}${pz}`} position={[px, 1.1, pz]} material={M.darkMetal}><cylinderGeometry args={[0.04, 0.04, 2.2, 6]} /></mesh>
      ))}
      <mesh position={[0, 2.25, 0]} rotation-x={0.12} material={awning} castShadow><boxGeometry args={[2.5, 0.04, 1.8]} /></mesh>
      <RoundedBox args={[2.1, 0.7, 1.1]} radius={0.04} position={[0, 0.35, 0.1]} material={tint('#A47148', 0.8)} castShadow />
      {goods.map((c, i) => (
        <group key={i} position={[-0.7 + i * 0.7, 0.72, 0.15]}>
          <mesh material={tint('#C79A5E', 0.85)}><cylinderGeometry args={[0.3, 0.24, 0.12, 14]} /></mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh key={k} position={[Math.cos(k) * 0.14, 0.1 + (k % 2) * 0.06, Math.sin(k) * 0.14]} material={tint(c, 0.55)}><sphereGeometry args={[0.09, 10, 8]} /></mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export function Market() {
  const sign = useMemo(() => new MeshBasicMaterial({ map: signTexture2('CHỢ ROBOCITY', 'Rau · Củ · Quả · Cá tươi', '#B45309', '#FFF7ED', 1024, 256), toneMapped: false }), [])
  const stalls: [number, number, string, string[]][] = [
    [-4, -3, '#16A34A', ['#4ADE80', '#22C55E', '#84CC16']],
    [0, -3, '#EA580C', ['#FB923C', '#F97316', '#FACC15']],
    [4, -3, '#DB2777', ['#EC4899', '#F43F5E', '#A3E635']],
    [-4, 2.5, '#2563EB', ['#60A5FA', '#E5E7EB', '#93C5FD']],
    [0, 2.5, '#CA8A04', ['#FDE047', '#F59E0B', '#FB7185']],
    [4, 2.5, '#7C3AED', ['#A855F7', '#C084FC', '#F472B6']],
  ]
  return (
    <group position={MARKET_POS}>
      <mesh position={[0, -0.07, 0]} rotation-x={-PI / 2} material={tint('#CFC6B6', 0.9)} receiveShadow><planeGeometry args={[14, 14]} /></mesh>
      {[-3.4, 3.4].map(x => <Box key={x} s={[0.35, 3.2, 0.35]} p={[x, 1.6, 6.6]} c="#92400E" />)}
      <Box s={[7.4, 0.9, 0.25]} p={[0, 3.3, 6.6]} c="#B45309" r={0.5} />
      <mesh position={[0, 3.3, 6.74]} material={sign}><planeGeometry args={[7.1, 0.8]} /></mesh>
      {stalls.map(([x, z, c, goods], i) => <Stall key={i} x={x} z={z} color={c} goods={goods} />)}
      {stalls.map(([x, z], i) => (
        <ChibiHuman key={i} pos={[x, 0, z - 0.95]} rot={0} role="guest" action="sit" seat={0.32} name={`ban-hang-${i}`} voice="seller"
          shirtColor={['#F472B6', '#FDE68A', '#86EFAC', '#93C5FD', '#FCA5A5', '#C4B5FD'][i]} hair={i % 2 ? 'bun' : 'long'} />
      ))}
      <MarketShoppers />
    </group>
  )
}

function MarketShoppers() {
  const refs = useRef<(Group | null)[]>([])
  useFrame(state => {
    const t = state.clock.elapsedTime
    refs.current.forEach((g, i) => {
      if (!g) return
      // stroll up and down the middle aisle, pausing at stalls
      const k = (Math.sin(t * 0.25 + i * 2.1) + 1) / 2
      const x = -5.5 + k * 11, z = -0.4 + (i - 1) * 0.6
      const vx = Math.cos(t * 0.25 + i * 2.1)
      g.position.set(x, 0, z)
      g.rotation.y = vx >= 0 ? PI / 2 : -PI / 2
    })
  })
  return (
    <group>
      {[0, 1, 2].map(i => (
        <group key={i} ref={el => { refs.current[i] = el }}>
          <ChibiHuman pos={[0, 0, 0]} role="guest" action="walk" name={`mua-hang-${i}`} voice="buyer"
            shirtColor={['#0EA5E9', '#F97316', '#10B981'][i]} hair={(['bun', 'short', 'long'] as const)[i]} />
        </group>
      ))}
    </group>
  )
}

/* ================================================================ EV charging station */

export const EV_POS: [number, number, number] = [41, 0, 2]

export function ChargingStation() {
  const sign = useMemo(() => new MeshBasicMaterial({ map: signTexture2('TRẠM SẠC', 'Xe điện · 24/7', '#047857', '#FFFFFF', 1024, 256), toneMapped: false }), [])
  const led = useMemo(() => glow('#34D399', 2.2), [])
  const pulse = useRef(0)
  useFrame(state => { pulse.current = state.clock.elapsedTime; led.emissiveIntensity = 1.4 + Math.sin(pulse.current * 3) * 0.8 })
  return (
    <group position={EV_POS}>
      <mesh position={[0, -0.07, 0]} rotation-x={-PI / 2} material={tint('#9CA3AF', 0.9)} receiveShadow><planeGeometry args={[9, 10]} /></mesh>
      {[-3.6, 3.6].flatMap(x => [-3.2, 3.2].map(z => <Box key={`${x}${z}`} s={[0.25, 3.2, 0.25]} p={[x, 1.6, z]} c="#E5E7EB" />))}
      <RoundedBox args={[8.4, 0.25, 7.6]} radius={0.08} position={[0, 3.3, 0]} material={tint('#F8FAFC', 0.5)} castShadow />
      <mesh position={[0, 3.18, 0]} material={tint('#10B981', 0.5)}><boxGeometry args={[8.5, 0.08, 7.7]} /></mesh>
      <mesh position={[0, 3.3, 3.83]} material={sign}><planeGeometry args={[3.6, 0.9]} /></mesh>
      {[-2.4, -0.8, 0.8, 2.4].map(x => (
        <group key={x} position={[x, 0, -1.6]}>
          <RoundedBox args={[0.45, 1.5, 0.35]} radius={0.06} position={[0, 0.75, 0]} material={M.white} castShadow />
          <mesh position={[0, 1.2, 0.18]} material={led}><boxGeometry args={[0.3, 0.12, 0.02]} /></mesh>
        </group>
      ))}
      <group position={[-1.6, -0.1, 0.6]}><CarModel kind="supercar" color="#0EA5E9" /></group>
      <group position={[1.6, -0.1, 0.6]}><CarModel kind="luxury" color="#F8FAFC" /></group>
    </group>
  )
}
