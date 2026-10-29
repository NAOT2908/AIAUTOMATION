import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three'
import { FLOOR } from './layout'
import { M, blobTexture, brandTexture } from './materials'
import { GATE_X, GROUND_Y } from './World'
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
  const dockZ = FLOOR.maxZ - 1.6
  const farZ = 34
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
    const ease = (k: number) => 1 - (1 - k) ** 3
    let z: number
    if (s.t < 2.4) z = farZ + (dockZ - farZ) * ease(s.t / 2.4)
    else if (s.t < 3.8) z = dockZ
    else if (s.t < 6) z = dockZ + (farZ - dockZ) * ((s.t - 3.8) / 2.2) ** 2
    else { s.t = -1; z = farZ }
    g.position.set(GATE_X, z > FLOOR.maxZ ? GROUND_Y : 0, z)
  })
  return (
    <group ref={ref} visible={false}>
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
    </group>
  )
}

/** Ambient occlusion + bloom + neutral tone mapping: the soft, bright "product shot" look */
export function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={1.1} distanceFalloff={0.9} intensity={2.4} quality="medium" halfRes />
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.25} intensity={0.55} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <SMAA />
    </EffectComposer>
  )
}

