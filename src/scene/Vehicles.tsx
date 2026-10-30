import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { ExtrudeGeometry, Group, MeshStandardMaterial, Shape } from 'three'
import { M, glow, tint } from './materials'

/**
 * Car shapes inspired by familiar silhouettes (wedge supercar, rear-engine sports coupé,
 * boxy off-roader, long luxury saloon…) — no brand names or logos.
 */
export type CarKind = 'sedan' | 'suv' | 'taxi' | 'van' | 'supercar' | 'coupe' | 'offroad' | 'luxury' | 'bus'

interface Spec {
  L: number; W: number
  /** heights: shoulder line, roof, bonnet tip, boot tip */
  belt: number; roof: number; hood: number; tail: number
  /** cabin start/end along the length and how much the screens lean */
  cabF: number; cabR: number; slopeF: number; slopeR: number
  wheel: number; axle: number
  /** rim colour */
  rim?: string
}
const SPECS: Record<CarKind, Spec> = {
  sedan: { L: 2.9, W: 1.3, belt: 0.72, roof: 1.08, hood: 0.66, tail: 0.68, cabF: 0.62, cabR: -0.78, slopeF: 0.42, slopeR: 0.42, wheel: 0.27, axle: 0.92 },
  taxi: { L: 2.9, W: 1.3, belt: 0.72, roof: 1.08, hood: 0.66, tail: 0.68, cabF: 0.62, cabR: -0.78, slopeF: 0.42, slopeR: 0.42, wheel: 0.27, axle: 0.92 },
  luxury: { L: 3.3, W: 1.38, belt: 0.74, roof: 1.12, hood: 0.7, tail: 0.72, cabF: 0.62, cabR: -1.02, slopeF: 0.46, slopeR: 0.5, wheel: 0.3, axle: 1.08, rim: '#DADFE6' },
  suv: { L: 3.0, W: 1.42, belt: 0.86, roof: 1.32, hood: 0.84, tail: 0.86, cabF: 0.75, cabR: -1.2, slopeF: 0.42, slopeR: 0.12, wheel: 0.32, axle: 0.98 },
  offroad: { L: 2.9, W: 1.5, belt: 0.95, roof: 1.62, hood: 0.92, tail: 0.95, cabF: 0.62, cabR: -1.15, slopeF: 0.14, slopeR: 0.02, wheel: 0.36, axle: 0.96, rim: '#3B3F46' },
  van: { L: 3.3, W: 1.45, belt: 0.9, roof: 1.6, hood: 0.86, tail: 0.9, cabF: 1.15, cabR: -1.38, slopeF: 0.25, slopeR: 0.05, wheel: 0.3, axle: 1.1 },
  // low wedge: long raked screen, engine behind the seats, flat deck
  supercar: { L: 3.2, W: 1.5, belt: 0.58, roof: 0.88, hood: 0.4, tail: 0.64, cabF: 0.42, cabR: -0.85, slopeF: 0.62, slopeR: 0.55, wheel: 0.3, axle: 1.02, rim: '#1E2126' },
  // rounded fastback: roof sweeps all the way down to the tail
  coupe: { L: 2.85, W: 1.38, belt: 0.64, roof: 0.98, hood: 0.56, tail: 0.6, cabF: 0.5, cabR: -1.15, slopeF: 0.44, slopeR: 0.7, wheel: 0.29, axle: 0.95, rim: '#C9CED6' },
  bus: { L: 5.4, W: 1.75, belt: 1.1, roof: 2.15, hood: 1.1, tail: 1.1, cabF: 2.35, cabR: -2.4, slopeF: 0.1, slopeR: 0.02, wheel: 0.36, axle: 1.8 },
}

const geoCache = new Map<CarKind, { body: ExtrudeGeometry; cabin: ExtrudeGeometry }>()

/** side silhouette (x = length, y = height) extruded across the width, with wheel arches cut in */
function carGeometry(kind: CarKind) {
  if (geoCache.has(kind)) return geoCache.get(kind)!
  const s = SPECS[kind]
  const h = s.L / 2, r = s.wheel + 0.05, a = s.axle, y0 = 0.2
  const body = new Shape()
  body.moveTo(-h, y0)
  body.lineTo(-h - 0.02, s.tail - 0.1)
  body.quadraticCurveTo(-h, s.tail, -h + 0.25, s.tail)
  body.lineTo(s.cabR, s.belt)
  body.lineTo(s.cabF, s.belt)
  body.lineTo(h - 0.3, s.hood)
  body.quadraticCurveTo(h, s.hood - 0.02, h + 0.02, Math.max(y0 + 0.08, s.hood - 0.2))
  body.lineTo(h, y0)
  body.lineTo(a + r, y0)
  body.absarc(a, s.wheel, r, 0, Math.PI, false)
  body.lineTo(-a + r, y0)
  body.absarc(-a, s.wheel, r, 0, Math.PI, false)
  body.lineTo(-h, y0)
  const W = s.W - 0.12
  const bodyGeo = new ExtrudeGeometry(body, { depth: W, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 14 })
  bodyGeo.translate(0, 0, -W / 2)
  bodyGeo.rotateY(-Math.PI / 2)

  const cab = new Shape()
  cab.moveTo(s.cabR, s.belt - 0.02)
  cab.lineTo(s.cabR + s.slopeR, s.roof)
  cab.lineTo(s.cabF - s.slopeF, s.roof)
  cab.lineTo(s.cabF, s.belt - 0.02)
  cab.lineTo(s.cabR, s.belt - 0.02)
  const CW = s.W - 0.3
  const cabGeo = new ExtrudeGeometry(cab, { depth: CW, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 })
  cabGeo.translate(0, 0, -CW / 2)
  cabGeo.rotateY(-Math.PI / 2)
  const out = { body: bodyGeo, cabin: cabGeo }
  geoCache.set(kind, out)
  return out
}

const glass = new MeshStandardMaterial({ color: '#1C2733', roughness: 0.08, metalness: 0.5 })

/** a car facing +z */
export function CarModel({ kind = 'sedan', color }: { kind?: CarKind; color: string }) {
  const s = SPECS[kind]
  const g = carGeometry(kind)
  const paint = useMemo(() => new MeshStandardMaterial({ color, roughness: kind === 'offroad' ? 0.5 : 0.22, metalness: kind === 'offroad' ? 0.15 : 0.45 }), [color, kind])
  const rim = useMemo(() => new MeshStandardMaterial({ color: s.rim ?? '#C9CED6', roughness: 0.3, metalness: 0.8 }), [s.rim])
  const head = useMemo(() => glow('#FFF4D6', 1.6), [])
  const tail = useMemo(() => glow('#FF3B3B', 1.4), [])
  const roofF = s.cabF - s.slopeF, roofR = s.cabR + s.slopeR
  const roofLen = Math.max(0.1, roofF - roofR)
  const sport = kind === 'supercar' || kind === 'coupe'
  return (
    <group>
      <mesh geometry={g.body} material={paint} castShadow receiveShadow />
      <mesh geometry={g.cabin} material={glass} castShadow />
      {kind !== 'bus' && (
        <mesh position={[0, s.roof + 0.03, (roofF + roofR) / 2]} material={paint} castShadow>
          <boxGeometry args={[s.W - 0.26, 0.06, roofLen + 0.06]} />
        </mesh>
      )}
      {/* wheels with coloured rims */}
      {[-1, 1].flatMap(sx => [-1, 1].map(sz => (
        <group key={`${sx}${sz}`} position={[sx * (s.W / 2 - 0.12), s.wheel, sz * s.axle]}>
          <mesh rotation-z={Math.PI / 2} material={M.tyre} castShadow><cylinderGeometry args={[s.wheel, s.wheel, sport ? 0.26 : 0.22, 22]} /></mesh>
          <mesh position={[sx * (sport ? 0.132 : 0.112), 0, 0]} rotation-z={Math.PI / 2} material={rim}><cylinderGeometry args={[s.wheel * 0.68, s.wheel * 0.68, 0.01, 18]} /></mesh>
          {sport && [0, 1, 2, 3, 4].map(k => (
            <mesh key={k} position={[sx * 0.14, 0, 0]} rotation={[(k / 5) * Math.PI * 2, 0, Math.PI / 2]} material={M.metal}><boxGeometry args={[0.012, s.wheel * 1.2, 0.035]} /></mesh>
          ))}
        </group>
      )))}
      {/* lights: thin slits on sports cars, round lamps on the coupé, blocks elsewhere */}
      {[-1, 1].map(sx => (
        <group key={sx}>
          {kind === 'coupe'
            ? <mesh position={[sx * (s.W / 2 - 0.25), s.hood - 0.04, s.L / 2 - 0.12]} rotation-x={Math.PI / 2 - 0.5} material={head}><cylinderGeometry args={[0.09, 0.09, 0.04, 16]} /></mesh>
            : <mesh position={[sx * (s.W / 2 - 0.24), s.hood - (sport ? 0.08 : 0.12), s.L / 2 + 0.03]} material={head}><boxGeometry args={[sport ? 0.34 : 0.26, sport ? 0.04 : 0.09, 0.04]} /></mesh>}
          <mesh position={[sx * (s.W / 2 - 0.22), s.tail - 0.12, -s.L / 2 - 0.04]} material={tail}><boxGeometry args={[sport ? 0.4 : 0.28, sport ? 0.05 : 0.08, 0.04]} /></mesh>
        </group>
      ))}
      {kind === 'supercar' && (
        <>
          {/* rear wing, side intakes */}
          {[-0.45, 0.45].map(x => <mesh key={x} position={[x, s.tail + 0.08, -s.L / 2 + 0.25]} material={M.black}><boxGeometry args={[0.05, 0.16, 0.08]} /></mesh>)}
          <mesh position={[0, s.tail + 0.17, -s.L / 2 + 0.22]} rotation-x={-0.12} material={paint} castShadow><boxGeometry args={[s.W - 0.1, 0.035, 0.32]} /></mesh>
          {[-1, 1].map(sx => <mesh key={sx} position={[sx * (s.W / 2 - 0.02), 0.44, -0.55]} rotation-y={sx * 0.15} material={M.black}><boxGeometry args={[0.04, 0.16, 0.5]} /></mesh>)}
        </>
      )}
      {kind === 'offroad' && (
        <>
          <mesh position={[0, s.tail - 0.05, -s.L / 2 - 0.16]} rotation-x={Math.PI / 2} material={M.tyre} castShadow><cylinderGeometry args={[0.3, 0.3, 0.18, 20]} /></mesh>
          <mesh position={[0, s.roof + 0.1, (roofF + roofR) / 2]} material={M.darkMetal}><boxGeometry args={[s.W - 0.4, 0.05, roofLen - 0.2]} /></mesh>
        </>
      )}
      {kind === 'luxury' && <mesh position={[0, s.hood + 0.02, s.L / 2 - 0.12]} material={M.metal}><boxGeometry args={[0.44, 0.08, 0.05]} /></mesh>}
      {kind === 'taxi' && (
        <>
          <mesh position={[0, s.roof + 0.14, -0.1]} material={tint('#F8FAFC', 0.3)}><boxGeometry args={[0.5, 0.14, 0.2]} /></mesh>
          {[-1, 1].map(sx => <mesh key={sx} position={[sx * (s.W / 2 - 0.01), s.belt - 0.18, 0]} material={tint('#0E7490', 0.4)}><boxGeometry args={[0.02, 0.12, 2.0]} /></mesh>)}
        </>
      )}
      {kind === 'bus' && (
        <>
          <mesh position={[0, s.roof + 0.05, 0]} material={paint} castShadow><boxGeometry args={[s.W - 0.2, 0.1, s.L - 0.3]} /></mesh>
          {[-1, 1].map(sx => <mesh key={sx} position={[sx * (s.W / 2 - 0.005), 0.75, 0]} material={tint('#F8FAFC', 0.5)}><boxGeometry args={[0.02, 0.14, s.L - 0.4]} /></mesh>)}
        </>
      )}
    </group>
  )
}

/* ---------------------------------------------------------------- traffic */

interface Lane { axis: 'x' | 'z'; fixed: number; dir: 1 | -1; from: number; to: number }

const PARADE: { kind: CarKind; color: string }[] = [
  { kind: 'supercar', color: '#9BD12C' },
  { kind: 'taxi', color: '#06B6D4' },
  { kind: 'coupe', color: '#C0392B' },
  { kind: 'bus', color: '#F2B705' },
  { kind: 'luxury', color: '#1B1E24' },
  { kind: 'offroad', color: '#2F3A2F' },
  { kind: 'supercar', color: '#F97316' },
  { kind: 'coupe', color: '#E5E7EB' },
  { kind: 'van', color: '#F8FAFC' },
  { kind: 'luxury', color: '#A9B2BD' },
  { kind: 'supercar', color: '#FACC15' },
  { kind: 'sedan', color: '#2563EB' },
]

/** cars driving both ways on the boulevard (z = 14) and the avenue (x = 13.4) */
export function Traffic({ boulevardZ = 14, avenueX = 13.4 }: { boulevardZ?: number; avenueX?: number }) {
  const lanes: Lane[] = useMemo(() => [
    { axis: 'x', fixed: boulevardZ + 0.9, dir: 1, from: -45, to: 60 },
    { axis: 'x', fixed: boulevardZ - 0.9, dir: -1, from: -45, to: 60 },
    { axis: 'z', fixed: avenueX - 0.9, dir: 1, from: -35, to: 60 },
    { axis: 'z', fixed: avenueX + 0.9, dir: -1, from: -35, to: 60 },
  ], [boulevardZ, avenueX])
  // each lane keeps one speed so cars never drive through each other
  const cars = useMemo(() => PARADE.map((c, i) => {
    const lane = i % 4
    const laneSpeed = [8.5, 7.5, 8, 7][lane]
    return { ...c, lane: lanes[lane], offset: Math.floor(i / 4) * 33 + lane * 9, speed: laneSpeed }
  }), [lanes])
  const refs = useRef<(Group | null)[]>([])
  useFrame(state => {
    const t = state.clock.elapsedTime
    cars.forEach((c, i) => {
      const g = refs.current[i]
      if (!g) return
      const span = c.lane.to - c.lane.from
      const d = ((t * c.speed + c.offset * span / 100) % span)
      const p = c.lane.dir === 1 ? c.lane.from + d : c.lane.to - d
      if (c.lane.axis === 'x') { g.position.set(p, -0.1, c.lane.fixed); g.rotation.y = c.lane.dir === 1 ? Math.PI / 2 : -Math.PI / 2 }
      else { g.position.set(c.lane.fixed, -0.1, p); g.rotation.y = c.lane.dir === 1 ? 0 : Math.PI }
    })
  })
  return (
    <group>
      {cars.map((c, i) => (
        <group key={i} ref={el => { refs.current[i] = el }}>
          <CarModel kind={c.kind} color={c.color} />
        </group>
      ))}
    </group>
  )
}
