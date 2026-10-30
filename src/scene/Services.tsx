import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, SphereGeometry } from 'three'
import { sound } from '../audio/sound'
import { world } from './Atmosphere'
import { signTexture2 } from './arch'
import { speak } from './chatter'
import { Box } from './Districts'
import { M, glow, tint } from './materials'

/* ================================================================ shared incident state */

/** a fire somewhere along the food street, and the night's fireworks */
export const incidents = {
  fire: null as null | { x: number; z: number; started: number; phase: 'burning' | 'truck' | 'spraying' | 'out'; t: number },
  fireworksUntil: 0,
  lastAutoFire: 0,
}
/** shophouses on the food street that can catch fire (roof centre) */
const FIRE_SITES: [number, number][] = [[20.8, -3.6], [26, -3.6], [31.2, -3.6]]
export function startFire() {
  if (incidents.fire) return
  const [x, z] = FIRE_SITES[Math.floor(Math.random() * FIRE_SITES.length)]
  incidents.fire = { x, z, started: performance.now(), phase: 'burning', t: 0 }
  sound.playWarning()
  speak('an--2.6-2.2-0', 'Cháy! Cháy rồi! 🔥')
  setTimeout(() => speak('dau-bep', 'Gọi 114 ngay! 🚒'), 900)
}
export function startFireworks(seconds = 20) { incidents.fireworksUntil = performance.now() + seconds * 1000 }

// ?event=fire or ?event=fireworks starts one right away (for demos and sharing)
{
  const ev = new URLSearchParams(location.search).get('event')
  if (ev === 'fire') setTimeout(startFire, 1500)
  if (ev === 'fireworks') setTimeout(() => startFireworks(60), 1000)
}

/* ================================================================ buildings */

export const FIRE_STATION: [number, number, number] = [51, 0, 3]
export const POLICE: [number, number, number] = [50, 0, -13]
export const HOSPITAL: [number, number, number] = [48, 0, -31]

function Sign({ text, sub, bg, w, y, z }: { text: string; sub: string; bg: string; w: number; y: number; z: number }) {
  const mat = useMemo(() => new MeshBasicMaterial({ map: signTexture2(text, sub, bg, '#FFFFFF', 1024, 220), toneMapped: false }), [text, sub, bg])
  return <mesh position={[0, y, z]} material={mat}><planeGeometry args={[w, w * 220 / 1024]} /></mesh>
}

export function FireStation() {
  return (
    <group position={FIRE_STATION}>
      <mesh position={[0, -0.07, 3]} rotation-x={-Math.PI / 2} material={tint('#9CA3AF', 0.9)} receiveShadow><planeGeometry args={[10, 9]} /></mesh>
      <Box s={[9, 5, 6]} p={[0, 2.5, -1]} c="#C0392B" r={0.6} />
      {[-2.6, 0, 2.6].map(x => <Box key={x} s={[2.2, 2.8, 0.06]} p={[x, 1.4, 2.02]} c="#E5E7EB" r={0.4} />)}
      <Box s={[2, 7, 2]} p={[3.6, 3.5, -2.2]} c="#A93226" r={0.6} />
      <Sign text="CỨU HỎA 114" sub="Trạm PCCC RoboCity" bg="#7F1D1D" w={5} y={4.1} z={2.05} />
    </group>
  )
}

export function PoliceStation() {
  const beacon = useMemo(() => glow('#3B82F6', 2), [])
  useFrame(s => { beacon.emissiveIntensity = Math.sin(s.clock.elapsedTime * 6) > 0 ? 3 : 0.4 })
  return (
    <group position={POLICE}>
      <Box s={[8, 6, 6]} p={[0, 3, 0]} c="#E8D9B5" r={0.8} />
      <Box s={[8.4, 0.4, 6.4]} p={[0, 6.2, 0]} c="#9B2C2C" r={0.6} />
      <Box s={[2.2, 2.6, 0.06]} p={[0, 1.3, 3.02]} c="#334155" r={0.4} />
      <Sign text="CÔNG AN PHƯỜNG" sub="RoboCity · 113" bg="#1E3A8A" w={5} y={4.3} z={3.05} />
      <group position={[2.6, 0, 5]}>
        <RoundedBox args={[1.4, 0.7, 2.8]} radius={0.15} position={[0, 0.45, 0]} material={M.white} castShadow />
        <mesh position={[0, 0.38, 0]} material={tint('#1D4ED8', 0.4)}><boxGeometry args={[1.42, 0.16, 2.6]} /></mesh>
        <mesh position={[0, 0.88, 0]} material={beacon}><boxGeometry args={[0.6, 0.12, 0.2]} /></mesh>
      </group>
    </group>
  )
}

export function Hospital() {
  const cross = useMemo(() => glow('#EF4444', 1.6), [])
  return (
    <group position={HOSPITAL}>
      <Box s={[12, 9, 8]} p={[0, 4.5, 0]} c="#F8FAFC" r={0.6} />
      {[1.5, 3.5, 5.5, 7.5].flatMap(y => [-4.5, -2.25, 0, 2.25, 4.5].map(x => <Box key={`${x}${y}`} s={[1.4, 1.0, 0.05]} p={[x, y, 4.02]} c="#7FB2DA" r={0.2} />))}
      <group position={[0, 7.6, 4.1]}>
        <mesh material={cross}><boxGeometry args={[1.6, 0.5, 0.1]} /></mesh>
        <mesh material={cross}><boxGeometry args={[0.5, 1.6, 0.1]} /></mesh>
      </group>
      <Sign text="BỆNH VIỆN ĐA KHOA" sub="Cấp cứu 115 · 24/7" bg="#0F766E" w={6} y={0.9} z={4.06} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 9.06, 0]} material={tint('#334155', 0.7)}><circleGeometry args={[3, 32]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 9.08, 0]} material={M.white}><ringGeometry args={[2.4, 2.65, 32]} /></mesh>
      <group position={[-4, 0, 6]}>
        <RoundedBox args={[1.5, 1.2, 3.2]} radius={0.15} position={[0, 0.8, 0]} material={M.white} castShadow />
        <mesh position={[0.76, 0.9, 0]} material={tint('#DC2626', 0.5)}><boxGeometry args={[0.02, 0.18, 2.8]} /></mesh>
      </group>
    </group>
  )
}

/* ================================================================ fire + engine */

const flameGeo = new SphereGeometry(0.5, 10, 8)

/** flames and smoke on the burning roof; the engine drives over and hoses it down */
export function FireIncident() {
  const flames = useRef<Group>(null)
  const truck = useRef<Group>(null)
  const water = useRef<Group>(null)
  const flameMats = useMemo(() => Array.from({ length: 7 }, (_, i) => glow(i % 2 ? '#FF8A00' : '#FF3D00', 2.6)), [])
  const smokeMats = useMemo(() => Array.from({ length: 6 }, () => new MeshBasicMaterial({ color: '#3A3A3A', transparent: true, opacity: 0, depthWrite: false })), [])
  const waterMat = useMemo(() => new MeshBasicMaterial({ color: new Color(0.6, 0.85, 1.6), transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }), [])
  const sirenAt = useRef(0)

  useFrame((state, dt) => {
    const f = incidents.fire
    const T = state.clock.elapsedTime
    // a fire breaks out now and then (at most every 4 minutes)
    if (!f && performance.now() - incidents.lastAutoFire > 240000 && Math.random() < dt / 90) { incidents.lastAutoFire = performance.now(); startFire() }
    const fg = flames.current, tg = truck.current, wg = water.current
    if (!fg || !tg || !wg) return
    if (!f) { fg.visible = tg.visible = wg.visible = false; return }
    f.t += dt
    fg.visible = f.phase !== 'out' || f.t < 1.5
    fg.position.set(f.x, 6.2, f.z)
    const strength = f.phase === 'spraying' ? Math.max(0, 1 - f.t / 7) : f.phase === 'out' ? 0 : 1
    fg.children.forEach((m, i) => {
      const mesh = m as Mesh
      if (i < 7) {
        mesh.position.set(Math.sin(i * 1.7) * 1.4, 0.3 + Math.abs(Math.sin(T * 9 + i)) * 0.6, Math.cos(i * 2.3) * 1.0)
        mesh.scale.set(0.7 * strength, (1.2 + Math.sin(T * 12 + i) * 0.4) * strength + 0.001, 0.7 * strength)
      } else {
        const k = (T * 0.4 + (i - 7) / 6) % 1
        mesh.position.set(Math.sin(T + i) * 0.6, 1 + k * 6, Math.cos(T * 0.7 + i) * 0.6)
        mesh.scale.setScalar(0.8 + k * 2.5)
        smokeMats[i - 7].opacity = (f.phase === 'out' ? 0.15 : 0.45) * (1 - k)
      }
    })

    // the engine: out of the station, along the boulevard, park in front of the shop
    const lane = 13.1, stationX = FIRE_STATION[0], stopX = f.x
    if (f.phase === 'burning' && f.t > 3) { f.phase = 'truck'; f.t = 0; sound.playSiren(4); speak('dau-bep', 'Xe cứu hỏa tới rồi! 🚒') }
    tg.visible = f.phase === 'truck' || f.phase === 'spraying' || (f.phase === 'out' && f.t < 6)
    if (f.phase === 'truck') {
      const k1 = Math.min(1, f.t / 1.5), k2 = Math.min(1, Math.max(0, (f.t - 1.5) / 4))
      if (f.t < 1.5) { tg.position.set(stationX, -0.1, 6 + (lane - 6) * k1); tg.rotation.y = 0 }
      else { tg.position.set(stationX + (stopX - stationX) * (1 - (1 - k2) ** 2), -0.1, lane); tg.rotation.y = -Math.PI / 2 }
      if (performance.now() - sirenAt.current > 4000) { sirenAt.current = performance.now(); sound.playSiren(4) }
      if (f.t > 5.6) { f.phase = 'spraying'; f.t = 0 }
    }
    wg.visible = f.phase === 'spraying'
    if (f.phase === 'spraying') {
      wg.children.forEach((m, i) => {
        const k = (T * 1.8 + i / 10) % 1
        // an arc from the truck's ladder to the roof
        m.position.set(stopX + Math.sin(i) * 0.15, 2.4 + Math.sin(k * Math.PI) * 4 + k * 3.8, lane - 1 + (f.z - lane + 1) * k)
      })
      if (f.t > 7) {
        f.phase = 'out'; f.t = 0
        sound.playResult(true)
        speak('an--2.6-2.2-0', 'Cảm ơn lính cứu hỏa! 👏🚒')
      }
    }
    if (f.phase === 'out' && f.t > 6) incidents.fire = null
  })

  return (
    <group>
      <group ref={flames} visible={false}>
        {flameMats.map((m, i) => <mesh key={i} geometry={flameGeo} material={m} />)}
        {smokeMats.map((m, i) => <mesh key={`s${i}`} geometry={flameGeo} material={m} />)}
      </group>
      <group ref={truck} visible={false}>
        <RoundedBox args={[1.6, 1.5, 4.4]} radius={0.15} position={[0, 1.0, 0]} material={tint('#D62828', 0.4)} castShadow />
        <mesh position={[0, 1.55, 1.6]} material={M.screenFrame}><boxGeometry args={[1.62, 0.5, 0.9]} /></mesh>
        <mesh position={[0, 1.95, -0.6]} rotation-x={0.3} material={M.metal}><boxGeometry args={[0.5, 0.1, 3.4]} /></mesh>
        <mesh position={[0, 1.9, 1.3]} material={glow('#3B82F6', 3)}><boxGeometry args={[0.8, 0.12, 0.2]} /></mesh>
        {[-0.7, 0.7].flatMap(x => [-1.4, 1.4].map(z => <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation-z={Math.PI / 2} material={M.tyre}><cylinderGeometry args={[0.32, 0.32, 0.22, 14]} /></mesh>))}
      </group>
      <group ref={water} visible={false}>
        {Array.from({ length: 10 }, (_, i) => <mesh key={i} material={waterMat}><sphereGeometry args={[0.16, 8, 6]} /></mesh>)}
      </group>
    </group>
  )
}

/* ================================================================ fireworks */

const SPARKS = 360
const SHELL = 60
interface Spark { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; color: Color }

/** night fireworks over the lake and downtown; at midnight on their own, or on demand */
export function Fireworks() {
  const ref = useRef<InstancedMesh>(null)
  const sparks = useMemo<Spark[]>(() => Array.from({ length: SPARKS }, () => ({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, color: new Color() })), [])
  const next = useRef(0)
  const lastPhase = useRef(0)
  const o = useMemo(() => new Object3D(), [])
  useEffect(() => {
    const m = ref.current!
    for (let i = 0; i < SPARKS; i++) m.setColorAt(i, new Color('#fff'))
  }, [])
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    // midnight of the visual day starts a show
    if (lastPhase.current < 0.76 && world.phase >= 0.76) startFireworks(25)
    lastPhase.current = world.phase
    const on = performance.now() < incidents.fireworksUntil
    next.current -= dt
    if (on && next.current <= 0) {
      next.current = 0.5 + Math.random() * 0.7
      const spots: [number, number][] = [[-30, 29], [2, -60], [-12, 46], [30, -60]]
      const [cx, cz] = spots[Math.floor(Math.random() * spots.length)]
      const base = Math.floor(Math.random() * (SPARKS / SHELL)) * SHELL
      const col = new Color().setHSL(Math.random(), 0.9, 0.6)
      const hy = 22 + Math.random() * 10
      for (let k = 0; k < SHELL; k++) {
        const s = sparks[base + k]
        const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), sp = 7 + Math.random() * 3
        Object.assign(s, { x: cx + (Math.random() - 0.5) * 6, y: hy, z: cz + (Math.random() - 0.5) * 6, vx: Math.sin(b) * Math.cos(a) * sp, vy: Math.cos(b) * sp, vz: Math.sin(b) * Math.sin(a) * sp, life: 1.6 })
        s.color.copy(col).multiplyScalar(2.5)
      }
      sound.playBoom(0.6)
    }
    let alive = false
    sparks.forEach((s, i) => {
      if (s.life > 0) {
        alive = true
        s.life -= dt
        s.vy -= 6 * dt
        s.vx *= 0.985; s.vz *= 0.985
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt
      }
      o.position.set(s.x, s.life > 0 ? s.y : -100, s.z)
      o.scale.setScalar(Math.max(0.01, s.life) * 0.35)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, s.color)
    })
    m.visible = alive
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, SPARKS]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 6, 4]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
