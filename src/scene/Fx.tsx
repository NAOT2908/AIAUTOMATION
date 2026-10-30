import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three'
import { sound } from '../audio/sound'
import { Interactive } from './interact'
import { FLOOR } from './layout'
import { M, blobTexture, brandTexture } from './materials'
import { BOULEVARD_Z, GATE_X, GROUND_Y } from './World'
import { fx } from './vis'

const MAX_PACKETS = 48

/** glowing parcels arcing between departments when work is handed over */
export function Packets() {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useEffect(() => {
    const m = ref.current!
    const white = new Color('#fff')
    for (let i = 0; i < MAX_PACKETS; i++) m.setColorAt(i, white)
    m.count = 0
  }, [])
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    const list = fx.packets
    for (let i = list.length - 1; i >= 0; i--) {
      list[i].t += dt / 0.9
      if (list[i].t >= 1) list.splice(i, 1)
    }
    m.count = list.length
    list.forEach((p, i) => {
      const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - (-2 * p.t + 2) ** 2 / 2
      dummy.position.lerpVectors(p.from, p.to, e)
      dummy.position.y += Math.sin(e * Math.PI) * 2.2
      dummy.rotation.set(p.t * 6, p.t * 9, 0)
      dummy.scale.setScalar(Math.min(1, p.t * 6, (1 - p.t) * 6))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      m.setColorAt(i, p.color)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_PACKETS]} frustumCulled={false}>
      <octahedronGeometry args={[0.17]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

/** branded truck that drives up to the loading dock for every shipment or delivery */
export function Truck() {
  const ref = useRef<Group>(null)
  const state = useRef({ t: -1 })
  const decal = useMemo(() => new MeshStandardMaterial({ map: brandTexture(), roughness: 0.55 }), [])
  const blob = useMemo(() => new MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false }), [])
  // route: along the boulevard from the east, turn into the bay, unload, back out, drive on east
  const route = useMemo(() => {
    const dock = FLOOR.maxZ - 1.6, west = BOULEVARD_Z - 0.9, east = BOULEVARD_Z + 0.9
    return [
      { from: [40, west], to: [GATE_X, west], dur: 2.6, yaw: Math.PI / 2, ease: 'out' },
      { from: [GATE_X, west], to: [GATE_X, dock], dur: 1.4, yaw: 0, ease: 'inout' },
      { from: [GATE_X, dock], to: [GATE_X, dock], dur: 1.4, yaw: 0, ease: 'none' },
      { from: [GATE_X, dock], to: [GATE_X, east], dur: 1.6, yaw: 0, ease: 'inout' },
      { from: [GATE_X, east], to: [45, east], dur: 2.8, yaw: -Math.PI / 2, ease: 'in' },
    ] as { from: [number, number]; to: [number, number]; dur: number; yaw: number; ease: 'in' | 'out' | 'inout' | 'none' }[]
  }, [])
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const s = state.current
    if (s.t < 0 && fx.trucks > 0) {
      fx.trucks--
      s.t = 0
    }
    if (s.t < 0) { g.visible = false; return }
    s.t += dt
    g.visible = true
    let t = s.t, seg = route[0]
    for (seg of route) { if (t <= seg.dur) break; t -= seg.dur }
    if (s.t > route.reduce((a, r) => a + r.dur, 0)) { s.t = -1; g.visible = false; return }
    const k = Math.min(1, t / seg.dur)
    const e = seg.ease === 'out' ? 1 - (1 - k) ** 3 : seg.ease === 'in' ? k * k : seg.ease === 'inout' ? k * k * (3 - 2 * k) : k
    const x = seg.from[0] + (seg.to[0] - seg.from[0]) * e, z = seg.from[1] + (seg.to[1] - seg.from[1]) * e
    g.position.set(x, z > FLOOR.maxZ ? GROUND_Y : 0, z)
    g.rotation.y = seg.yaw
  })
  return (
    <group ref={ref} visible={false}>
      <Interactive id="truck" name="Xe tải RoboCorp" hint="Đơn chờ hàng và hàng đang về" onActivate={() => sound.playTruck()}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} material={blob}><planeGeometry args={[2.2, 4.6]} /></mesh>
      {/* cab faces -z, towards the dock */}
      <RoundedBox args={[1.32, 1.15, 0.95]} radius={0.12} position={[0, 0.85, -1.55]} material={M.brand} castShadow />
      <mesh position={[0, 1.05, -2.03]} material={M.screenFrame}><planeGeometry args={[1.1, 0.42]} /></mesh>
      <RoundedBox args={[1.4, 1.5, 2.7]} radius={0.06} position={[0, 1.08, 0.35]} material={M.white} castShadow />
      <mesh position={[0.705, 1.1, 0.35]} rotation-y={Math.PI / 2} material={decal}><planeGeometry args={[2.5, 1.25]} /></mesh>
      <mesh position={[-0.705, 1.1, 0.35]} rotation-y={-Math.PI / 2} material={decal}><planeGeometry args={[2.5, 1.25]} /></mesh>
      {[-1.5, -0.2, 1.1].flatMap(z => [-0.62, 0.62].map(x => (
        <mesh key={`${x}${z}`} position={[x, 0.24, z]} rotation-z={Math.PI / 2} material={M.tyre}><cylinderGeometry args={[0.24, 0.24, 0.18, 16]} /></mesh>
      )))}
      </Interactive>
    </group>
  )
}

/** Ambient occlusion + bloom + ACES tone mapping: the warm, soft "studio" look of my-office */
export function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={1.1} distanceFalloff={0.9} intensity={2.2} quality="medium" halfRes />
      <Bloom mipmapBlur luminanceThreshold={0.92} luminanceSmoothing={0.3} intensity={0.45} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  )
}

