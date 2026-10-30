import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CatmullRomCurve3, Group, InstancedMesh, MeshBasicMaterial, Object3D, Vector3 } from 'three'
import { signTexture2 } from './arch'
import { Box } from './Districts'
import { M, tint } from './materials'

/**
 * Elevated metro: a rounded-rectangle viaduct around the city, two stations, and a three-car
 * train that slows into each station, waits, and pulls away.
 */
const DECK_Y = 4.4
/** north edge (z) and west edge (x) of the line, far behind every building */
const LINE = { north: -48, west: -50, east: 58, south: 52, r: 8 }
const ROADS = { avenueX: 13.4, boulevardZ: 14 }
const STATIONS = [
  { name: 'GA PHỐ ĐÔNG', at: new Vector3(44, DECK_Y, LINE.north) },
  { name: 'GA TRƯỜNG HỌC', at: new Vector3(3.5, DECK_Y, LINE.north) },
  { name: 'GA CÔNG VIÊN', at: new Vector3(LINE.west, DECK_Y, 29.5) },
  { name: 'GA HỒ TÂY', at: new Vector3(LINE.west, DECK_Y, 46) },
]
const CAR_LEN = 4.2, CAR_GAP = 0.35, CARS = 3
const SPEED = 11, DWELL = 4

/** east terminus → west along the north edge → round the corner → south to the far terminus */
function lineCurve() {
  const { north, west, east, south, r } = LINE
  const pts: Vector3[] = []
  for (let x = east; x > west + r; x -= 6) pts.push(new Vector3(x, DECK_Y, north))
  for (let k = 0; k <= 6; k++) {
    const a = -Math.PI / 2 - (k / 6) * (Math.PI / 2)
    pts.push(new Vector3(west + r + Math.cos(a) * r, DECK_Y, north + r + Math.sin(a) * r))
  }
  for (let z = north + r + 6; z <= south; z += 6) pts.push(new Vector3(west, DECK_Y, z))
  return new CatmullRomCurve3(pts, false, 'centripetal')
}

function Viaduct({ curve }: { curve: CatmullRomCurve3 }) {
  const deck = useRef<InstancedMesh>(null)
  const pillars = useRef<InstancedMesh>(null)
  const len = curve.getLength()
  const segs = Math.ceil(len / 2)
  const pillarSpots = useMemo(() => {
    const out: Vector3[] = []
    for (let d = 0; d < len; d += 8) {
      const p = curve.getPointAt(d / len)
      // never stand a pillar in the middle of a road
      if (Math.abs(p.x - ROADS.avenueX) < 2.8 || Math.abs(p.z - ROADS.boulevardZ) < 2.8) continue
      out.push(p)
    }
    return out
  }, [curve, len])
  useEffect(() => {
    const o = new Object3D(), t = new Vector3()
    for (let i = 0; i < segs; i++) {
      const u = (i + 0.5) / segs
      o.position.copy(curve.getPointAt(u)).setY(DECK_Y - 0.25)
      curve.getTangentAt(u, t)
      o.rotation.set(0, Math.atan2(t.x, t.z), 0)
      o.updateMatrix()
      deck.current!.setMatrixAt(i, o.matrix)
    }
    deck.current!.instanceMatrix.needsUpdate = true
    pillarSpots.forEach((p, i) => {
      o.position.set(p.x, (DECK_Y - 0.5) / 2, p.z)
      o.rotation.set(0, 0, 0)
      o.updateMatrix()
      pillars.current!.setMatrixAt(i, o.matrix)
    })
    pillars.current!.instanceMatrix.needsUpdate = true
  }, [curve, segs, pillarSpots])
  return (
    <group>
      <instancedMesh ref={deck} args={[undefined, undefined, segs]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.5, 2.15]} />
        <meshStandardMaterial color="#D7DBE0" roughness={0.75} />
      </instancedMesh>
      <instancedMesh ref={pillars} args={[undefined, undefined, pillarSpots.length]} castShadow>
        <cylinderGeometry args={[0.38, 0.48, DECK_Y - 0.5, 14]} />
        <meshStandardMaterial color="#C9CED4" roughness={0.8} />
      </instancedMesh>
    </group>
  )
}

function Station({ name, at, inward }: { name: string; at: Vector3; inward: Vector3 }) {
  const sign = useMemo(() => new MeshBasicMaterial({ map: signTexture2(name, 'METRO ROBOCITY', '#1D4ED8', '#FFFFFF', 1024, 256), toneMapped: false }), [name])
  const yaw = Math.atan2(inward.x, inward.z)
  // stairs go down on the side facing away from the city centre
  const out = Math.cos(yaw) * (at.x - 0) - Math.sin(yaw) * (at.z - 17) > 0 ? 1 : -1
  return (
    <group position={[at.x, 0, at.z]} rotation-y={yaw}>
      {/* platforms either side of the track, roof, stairs down to the street */}
      {[-1, 1].map(s => <Box key={s} s={[2.0, 0.3, 9]} p={[s * 2.55, DECK_Y - 0.15, 0]} c="#E5E7EB" r={0.8} />)}
      {[-1, 1].flatMap(s => [-3.6, 0, 3.6].map(z => <Box key={`${s}${z}`} s={[0.12, 2.4, 0.12]} p={[s * 3.4, DECK_Y + 1.2, z]} c="#94A3B8" r={0.4} />))}
      <RoundedBox args={[7.6, 0.18, 9.6]} radius={0.06} position={[0, DECK_Y + 2.45, 0]} material={tint('#2563EB', 0.4)} castShadow />
      {[-1, 1].map(s => <mesh key={s} position={[s * 3.4, DECK_Y + 2.0, 0]} rotation-y={s * Math.PI / 2} material={sign}><planeGeometry args={[3.4, 0.85]} /></mesh>)}
      {[out].map(s => (
        <group key={s} position={[s * 4.1, 0, 2.8]}>
          {Array.from({ length: 9 }, (_, k) => <Box key={k} s={[1.2, 0.18, 0.5]} p={[0, 0.25 + k * 0.48, -k * 0.5]} c="#CBD5E1" r={0.8} />)}
        </group>
      ))}
      {[-1, 1].map(s => <Box key={s} s={[0.5, DECK_Y - 0.3, 0.5]} p={[s * 2.55, (DECK_Y - 0.3) / 2, -3.5]} c="#C9CED4" r={0.8} />)}
    </group>
  )
}

function Train({ curve }: { curve: CatmullRomCurve3 }) {
  const cars = useRef<(Group | null)[]>([])
  const len = curve.getLength()
  // stops as distances along the line; the train runs out along them and back again
  const stops = useMemo(() => {
    const samples = 800
    const at = STATIONS.map(s => {
      let best = 0, bd = Infinity
      for (let i = 0; i <= samples; i++) { const d = curve.getPointAt(i / samples).distanceToSquared(s.at); if (d < bd) { bd = d; best = i / samples } }
      return best * len
    })
    const ends = [CARS * (CAR_LEN + CAR_GAP), len - 1]
    return [...new Set([...at, ...ends].map(v => Math.min(len - 1, Math.max(CARS * (CAR_LEN + CAR_GAP), v))))].sort((a, b) => a - b)
  }, [curve, len])
  const legs = useMemo(() => {
    const out: { from: number; to: number; time: number }[] = []
    for (let i = 0; i < stops.length - 1; i++) out.push({ from: stops[i], to: stops[i + 1], time: 0 })
    for (let i = stops.length - 1; i > 0; i--) out.push({ from: stops[i], to: stops[i - 1], time: 0 })
    out.forEach(l => { l.time = Math.abs(l.to - l.from) / SPEED * 1.25 + DWELL })
    return out
  }, [stops])
  const cycle = legs.reduce((a, l) => a + l.time, 0)
  const t3 = useMemo(() => new Vector3(), [])
  useFrame(state => {
    let t = state.clock.elapsedTime % cycle
    let leg = legs[0]
    for (leg of legs) { if (t <= leg.time) break; t -= leg.time }
    const k = Math.min(1, t / (leg.time - DWELL))
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2 // ease in-out: slows into the station
    const head = leg.from + (leg.to - leg.from) * e
    const dir = leg.to >= leg.from ? 1 : -1
    cars.current.forEach((g, i) => {
      if (!g) return
      const d = Math.min(len, Math.max(0, head - dir * i * (CAR_LEN + CAR_GAP)))
      const u = d / len
      g.position.copy(curve.getPointAt(u))
      curve.getTangentAt(u, t3)
      g.rotation.y = Math.atan2(t3.x * dir, t3.z * dir)
    })
  })
  const white = tint('#F8FAFC', 0.3), stripe = tint('#2563EB', 0.4)
  return (
    <group>
      {Array.from({ length: CARS }, (_, i) => (
        <group key={i} ref={el => { cars.current[i] = el }}>
          <RoundedBox args={[1.6, 1.7, CAR_LEN]} radius={i === 0 ? 0.35 : 0.18} position={[0, 1.05, 0]} material={white} castShadow />
          <mesh position={[0, 1.35, 0]} material={M.screenFrame}><boxGeometry args={[1.62, 0.5, CAR_LEN - 0.7]} /></mesh>
          <mesh position={[0, 0.55, 0]} material={stripe}><boxGeometry args={[1.62, 0.16, CAR_LEN - 0.3]} /></mesh>
          {i === 0 && <mesh position={[0, 1.4, CAR_LEN / 2 - 0.05]} material={M.screenFrame}><boxGeometry args={[1.2, 0.5, 0.1]} /></mesh>}
        </group>
      ))}
    </group>
  )
}

export function Metro() {
  const curve = useMemo(lineCurve, [])
  const stationDirs = useMemo(() => STATIONS.map(s => {
    // the track's tangent at the station: platforms line up with it
    const samples = 400
    let best = 0, bd = Infinity
    for (let i = 0; i < samples; i++) { const d = curve.getPointAt(i / samples).distanceToSquared(s.at); if (d < bd) { bd = d; best = i / samples } }
    return curve.getTangentAt(best)
  }), [curve])
  return (
    <group>
      <Viaduct curve={curve} />
      {STATIONS.map((s, i) => <Station key={s.name} name={s.name} at={s.at} inward={stationDirs[i]} />)}
      <Train curve={curve} />
    </group>
  )
}
