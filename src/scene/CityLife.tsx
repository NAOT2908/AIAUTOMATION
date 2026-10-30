import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, DoubleSide, Group, MeshStandardMaterial, SphereGeometry } from 'three'
import { ChibiHuman, type HumanRole } from './Human'
import { FLOOR } from './layout'
import { M, glow, tint } from './materials'

/* ---------------------------------------------------------------- pedestrians */

/** raised platforms (district plazas, the office slab): everything else is street level */
const PLATFORMS: [number, number, number, number][] = [
  [FLOOR.minX, FLOOR.maxX, FLOOR.minZ, FLOOR.maxZ],
  [18, 34, -7, 7],            // food street
  [-10.5, 6.5, 24, 38],       // pagoda
  [18, 34, 24, 38],           // club
  [19, 37, -29.5, -14.5],     // MyOffice
]
const groundY = (x: number, z: number) => (PLATFORMS.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1) ? 0 : -0.1)

interface Route {
  /** world [x, z] points along sidewalks; the last point is a door */
  pts: [number, number][]
  arrive: number
  leave: number
  role?: HumanRole
  speed?: number
  /** loops (joggers) never vanish into a door */
  loop?: boolean
  /** street vendor with a shoulder pole */
  vendor?: boolean
}

const ROUTES: Route[] = [
  // food street: from the boulevard into the middle shophouse
  { pts: [[16.2, 11.3], [25.0, 11.3], [25.0, 7.6], [25.0, -0.7]], arrive: 3, leave: 2 },
  // pagoda: round to the south gate, between the lotus pond and the incense urn, up to the hall steps
  { pts: [[-12, 16.6], [-12, 39.6], [-1.7, 39.6], [-1.7, 37.2], [-4.6, 35.4], [-4.0, 31.7]], arrive: 2, leave: 1, role: 'buddhist', speed: 1.1 },
  // club: along the avenue, round the queue rope to the door
  { pts: [[16.2, 19], [16.2, 39.4], [31.4, 39.4], [31.4, 31.3], [30.3, 30.9]], arrive: 3, leave: 0 },
  // MyOffice: to the lift
  { pts: [[16.2, -3.5], [16.2, -13.2], [20.8, -13.2], [20.8, -16.0]], arrive: 2, leave: 1 },
  // RoboCorp visitors: over the zebra crossing to the loading bay
  { pts: [[16.2, 11.4], [9.0, 11.4], [8.2, 10.6], [8.2, 6.6]], arrive: 2, leave: 1 },
  // street vendors (gánh hàng rong) strolling the sidewalks
  { pts: [[-40, 11.5], [44, 11.5]], arrive: 1, leave: 1, speed: 0.75, loop: true, vendor: true },
  { pts: [[15.9, -40], [15.9, 60]], arrive: 1, leave: 0, speed: 0.7, loop: true, vendor: true },
  // joggers on the boulevard's south sidewalk
  { pts: [[-30, 16.7], [46, 16.7]], arrive: 2, leave: 1, speed: 2.4, loop: true },
]

const SHIRTS = ['#F97316', '#0EA5E9', '#22C55E', '#E11D48', '#8B5CF6', '#F59E0B', '#14B8A6', '#64748B']
const PANTS = ['#334155', '#1E3A8A', '#3F3F46', '#1F2937', '#78350F']

function Walker({ route, reverse, delay, idx }: { route: Route; reverse: boolean; delay: number; idx: number }) {
  const ref = useRef<Group>(null)
  const path = useMemo(() => {
    const pts = reverse ? [...route.pts].reverse() : route.pts
    const cum = [0]
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    return { pts, cum, len: cum[cum.length - 1] }
  }, [route, reverse])
  const speed = route.speed ?? 1.3
  // time spent inside (or off the map) before the next trip
  const cycle = path.len / speed + (route.loop ? 2 : 9 + (idx % 3) * 4)
  useFrame(state => {
    const g = ref.current
    if (!g) return
    const d = ((state.clock.elapsedTime + delay) % cycle) * speed
    if (d > path.len) { g.visible = false; return }
    g.visible = true
    let i = 1
    while (i < path.cum.length - 1 && path.cum[i] < d) i++
    const [ax, az] = path.pts[i - 1], [bx, bz] = path.pts[i]
    const k = (d - path.cum[i - 1]) / Math.max(1e-6, path.cum[i] - path.cum[i - 1])
    const x = ax + (bx - ax) * k, z = az + (bz - az) * k
    g.position.set(x, groundY(x, z), z)
    g.rotation.y = Math.atan2(bx - ax, bz - az)
    // step out of / into a doorway: grow from and shrink into the door
    const edge = Math.min(d, path.len - d)
    g.scale.setScalar(Math.min(1, 0.15 + edge / 0.7))
  })
  return (
    <group ref={ref} visible={false}>
      <ChibiHuman pos={[0, 0, 0]} role={route.role ?? 'guest'} action="walk" name={`walker-${idx}-${reverse ? 'r' : 'a'}`}
        outfit={route.vendor || idx % 5 === 0 ? 'aodai' : undefined} hair={route.vendor || idx % 5 === 0 || idx % 7 === 3 ? 'nonla' : undefined}
        carryPole={route.vendor} voice={route.vendor ? 'vendor' : route.role === 'buddhist' ? 'buddhist' : 'walker'}
        shirtColor={SHIRTS[idx % SHIRTS.length]} pantsColor={PANTS[idx % PANTS.length]} />
    </group>
  )
}

export function Pedestrians() {
  const walkers = useMemo(() => {
    const out: { route: Route; reverse: boolean; delay: number; idx: number }[] = []
    let idx = 0
    ROUTES.forEach((route, r) => {
      for (let i = 0; i < route.arrive; i++) out.push({ route, reverse: false, delay: i * 7.3 + r * 2.1, idx: idx++ })
      for (let i = 0; i < route.leave; i++) out.push({ route, reverse: true, delay: i * 9.1 + r * 3.7 + 4, idx: idx++ })
    })
    return out
  }, [])
  return <group>{walkers.map((w, i) => <Walker key={i} {...w} />)}</group>
}

/* ---------------------------------------------------------------- sky */

/** an airliner crossing the city every ~50 s, nav lights blinking */
function Airplane() {
  const ref = useRef<Group>(null)
  const red = useMemo(() => glow('#FF3030', 2.5), [])
  const green = useMemo(() => glow('#30FF60', 2.5), [])
  const strobe = useMemo(() => glow('#FFFFFF', 3), [])
  const livery = useMemo(() => tint('#2E6BF0', 0.4), [])
  const from = useMemo(() => ({ x: -90, z: 70 }), [])
  const to = useMemo(() => ({ x: 110, z: -70 }), [])
  useFrame(state => {
    const g = ref.current
    if (!g) return
    const period = 50, dur = 22
    const t = (state.clock.elapsedTime + 12) % period
    g.visible = t < dur
    if (!g.visible) return
    const k = t / dur
    g.position.set(from.x + (to.x - from.x) * k, 26 + Math.sin(k * Math.PI) * 2, from.z + (to.z - from.z) * k)
    g.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
    const blink = Math.floor(state.clock.elapsedTime * 1.5) % 2 === 0
    strobe.emissiveIntensity = blink ? 4 : 0
  })
  return (
    <group ref={ref} visible={false} scale={1.4}>
      {/* fuselage, nose, tail cone */}
      <mesh rotation-x={Math.PI / 2} material={M.white} castShadow><cylinderGeometry args={[0.42, 0.42, 5.2, 18]} /></mesh>
      <mesh position={[0, 0, 2.6]} material={M.white} scale={[1, 1, 1.6]}><sphereGeometry args={[0.42, 18, 12]} /></mesh>
      <mesh position={[0, 0.1, -3.1]} rotation-x={-Math.PI / 2 - 0.15} material={M.white}><coneGeometry args={[0.42, 1.4, 18]} /></mesh>
      <mesh position={[0, 0.12, 2.95]} material={M.screenFrame}><boxGeometry args={[0.5, 0.14, 0.3]} /></mesh>
      <mesh position={[0, -0.1, 0]} rotation-x={Math.PI / 2} material={livery}><cylinderGeometry args={[0.425, 0.425, 4.6, 18, 1, true, Math.PI * 0.6, Math.PI * 0.8]} /></mesh>
      {/* wings with engines, tailplane, fin */}
      <mesh position={[0, -0.15, 0.2]} rotation-y={0} material={M.white} castShadow><boxGeometry args={[7.2, 0.1, 1.3]} /></mesh>
      {[-1.6, 1.6].map(x => <mesh key={x} position={[x, -0.5, 0.6]} rotation-x={Math.PI / 2} material={M.metal}><cylinderGeometry args={[0.24, 0.2, 0.9, 14]} /></mesh>)}
      <mesh position={[0, 0.15, -3.0]} material={M.white}><boxGeometry args={[2.6, 0.08, 0.7]} /></mesh>
      <mesh position={[0, 0.85, -3.05]} material={livery}><boxGeometry args={[0.08, 1.3, 0.9]} /></mesh>
      <mesh position={[-3.6, -0.15, 0.2]} material={red}><sphereGeometry args={[0.09, 8, 6]} /></mesh>
      <mesh position={[3.6, -0.15, 0.2]} material={green}><sphereGeometry args={[0.09, 8, 6]} /></mesh>
      <mesh position={[0, 0.45, 0]} material={strobe}><sphereGeometry args={[0.08, 8, 6]} /></mesh>
    </group>
  )
}

/** a striped hot-air balloon drifting slowly around the city */
function Balloon() {
  const ref = useRef<Group>(null)
  const gores = useMemo(() => {
    const colors = ['#E63946', '#F4A261', '#FFD166', '#2A9D8F', '#457B9D', '#F1FAEE']
    return Array.from({ length: 12 }, (_, i) => ({
      geo: new SphereGeometry(2.2, 6, 20, (i / 12) * Math.PI * 2, Math.PI * 2 / 12, 0, Math.PI * 0.78),
      mat: new MeshStandardMaterial({ color: new Color(colors[i % colors.length]), roughness: 0.65, side: DoubleSide }),
    }))
  }, [])
  useFrame(state => {
    const g = ref.current
    if (!g) return
    const t = state.clock.elapsedTime / 260 * Math.PI * 2
    g.position.set(10 + Math.cos(t) * 34, 17 + Math.sin(state.clock.elapsedTime * 0.4) * 0.6, 8 + Math.sin(t) * 26)
    g.rotation.y = t * 0.5
  })
  return (
    <group ref={ref}>
      <group scale={[1, 1.18, 1]}>{gores.map((p, i) => <mesh key={i} geometry={p.geo} material={p.mat} castShadow />)}</group>
      <mesh position={[0, -1.85, 0]} material={tint('#7A4A2A', 0.8)}><cylinderGeometry args={[0.95, 0.55, 0.6, 16, 1, true]} /></mesh>
      {[0, 1, 2, 3].map(i => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return <mesh key={i} position={[Math.cos(a) * 0.5, -2.7, Math.sin(a) * 0.5]} material={M.darkMetal}><cylinderGeometry args={[0.015, 0.015, 1.0, 4]} /></mesh>
      })}
      <mesh position={[0, -3.35, 0]} material={tint('#9B6B3E', 0.85)} castShadow><boxGeometry args={[0.8, 0.55, 0.8]} /></mesh>
      <mesh position={[0, -2.5, 0]} material={glow('#FFB347', 2.2)}><sphereGeometry args={[0.14, 10, 8]} /></mesh>
    </group>
  )
}

export function Sky() {
  return (
    <group>
      <Airplane />
      <Balloon />
    </group>
  )
}
