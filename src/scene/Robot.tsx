import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CapsuleGeometry, Color, Group, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three'
import { DEPTS } from '../sim/data'
import { company, viewStatus } from '../sim/engine'
import { useUI } from '../store'
import { M, blobTexture, glow, tint } from './materials'
import { fx, robots } from './vis'

const shell = new MeshPhysicalMaterial({ color: '#F8FAFD', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.25 })
const visor = new MeshPhysicalMaterial({ color: '#111923', roughness: 0.12, metalness: 0.2, clearcoat: 1 })
const blob = new MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false })
// egg-shaped body with a coloured collar cap, paddle arms, round eyes (style: friendly assistant bot)
const bodyGeo = new SphereGeometry(0.36, 40, 28)
const collarGeo = new SphereGeometry(0.372, 40, 16, 0, Math.PI * 2, 0, 0.95)
const armGeo = new CapsuleGeometry(0.085, 0.24, 8, 16)
const eyeGeo = new SphereGeometry(0.09, 24, 16)
const leafGeo = new SphereGeometry(0.1, 16, 12)
const tmp = new Vector3()
const EYE = new Color('#5BE3FF'), EYE_ERR = new Color('#FF4D4D'), EYE_SLEEP = new Color('#2C7C8C')
const RED = new Color('#FF3B3B'), GREEN = new Color('#3DFF9E')
const angleTo = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from))

export function Robot({ id }: { id: string }) {
  const color = DEPTS[company.bot(id).dept].color
  const vis = robots.get(id)!
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const ring = useRef<Group>(null)
  const mats = useMemo(() => ({
    eye: glow('#5BE3FF', 2.4) as MeshStandardMaterial,
    antenna: glow(color, 1) as MeshStandardMaterial,
    chest: glow(color, 1.4),
    band: tint(color, 0.4),
    ring: glow('#2E6BF0', 1.2),
    base: new Color(color),
  }), [color])
  const phase = useMemo(() => Math.random() * 10, [])
  const selected = useUI(s => s.selected === id)
  const select = useUI(s => s.select)

  useFrame((state, dt) => {
    const g = root.current, b = body.current
    if (!g || !b) return
    const T = state.clock.elapsedTime
    const bot = company.bot(id)
    const speed = useUI.getState().speed
    const pace = Math.min(2.5, Math.max(1, speed))

    // --- movement along the corridor route
    let walking = false
    let yawTarget = vis.path.length ? vis.yaw : 0
    const seg = vis.path[0]
    if (seg && speed > 0) {
      tmp.copy(seg.p).sub(vis.pos).setY(0)
      const dist = tmp.length()
      if (dist > 0.02) {
        walking = true
        vis.waited = 0
        vis.pos.addScaledVector(tmp.normalize(), Math.min(dist, 2.4 * dt * pace))
        yawTarget = Math.atan2(tmp.x, tmp.z)
      } else {
        vis.pos.copy(seg.p)
        vis.waited += dt * pace
        if (seg.wait !== Infinity && vis.waited >= seg.wait) {
          vis.path.shift()
          vis.waited = 0
        }
      }
    }
    const party = performance.now() < fx.partyUntil
    if (party) vis.yaw += dt * 5
    else vis.yaw += angleTo(vis.yaw, yawTarget) * Math.min(1, dt * 9)
    g.position.set(vis.pos.x, 0, vis.pos.z)
    g.rotation.y = vis.yaw

    // --- body language
    const st = viewStatus(bot, company.t, walking)
    const busy = !walking && (st === 'working' || st === 'thinking')
    let y = Math.sin(T * 2.2 + phase) * 0.05
    if (party) y += Math.abs(Math.sin(T * 7 + phase)) * 0.45
    b.position.y = y
    vis.bob = y
    b.rotation.x += ((walking ? 0.14 : 0) - b.rotation.x) * 0.1
    b.rotation.z = st === 'error' ? Math.sin(T * 40) * 0.03 : 0

    const swing = Math.sin(T * 9 + phase) * 0.55
    const typeL = -0.95 + Math.sin(T * 18 + phase) * 0.16
    const typeR = -0.95 + Math.sin(T * 18 + phase + 1.6) * 0.16
    const l = party ? -2.8 : walking ? swing : busy ? typeL : st === 'error' ? -1.5 + Math.sin(T * 14) * 0.6 : 0
    const r = party ? -2.8 : walking ? -swing : busy ? typeR : st === 'error' ? -1.5 - Math.sin(T * 14) * 0.6 : 0
    armL.current!.rotation.x += (l - armL.current!.rotation.x) * 0.3
    armR.current!.rotation.x += (r - armR.current!.rotation.x) * 0.3

    const h = head.current!
    h.rotation.z = st === 'thinking' ? Math.sin(T * 2.5) * 0.14 : 0
    h.rotation.x = st === 'thinking' ? -0.12 : busy ? 0.12 : 0

    // --- face + status light
    const blink = (T + phase) % 3.7 < 0.12
    eyes.current!.scale.y = st === 'charging' ? 0.25 : blink ? 0.12 : 1
    mats.eye.emissive.copy(st === 'error' ? EYE_ERR : st === 'charging' ? EYE_SLEEP : EYE)
    const pulse = 0.5 + 0.5 * Math.sin(T * 8)
    if (st === 'error') { mats.antenna.emissive.copy(RED); mats.antenna.emissiveIntensity = pulse * 3 }
    else if (st === 'charging') { mats.antenna.emissive.copy(GREEN); mats.antenna.emissiveIntensity = 0.6 + pulse * 1.6 }
    else { mats.antenna.emissive.copy(mats.base); mats.antenna.emissiveIntensity = st === 'thinking' ? 1 + pulse * 2.5 : 0.8 }

    if (ring.current) ring.current.rotation.y += dt * 1.5
  })

  return (
    <group
      ref={root}
      onClick={e => { e.stopPropagation(); select(id) }}
      onPointerOver={e => { e.stopPropagation(); vis.hover = true; document.body.classList.add('hover-prop') }}
      onPointerOut={() => { vis.hover = false; document.body.classList.remove('hover-prop') }}
    >
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} material={blob}><planeGeometry args={[1.1, 1.1]} /></mesh>
      {selected && (
        <group ref={ring}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} material={mats.ring}><ringGeometry args={[0.52, 0.6, 40, 1, 0, Math.PI * 1.6]} /></mesh>
        </group>
      )}

      <group ref={body}>
        <mesh geometry={bodyGeo} material={shell} position={[0, 0.72, 0]} scale={[1, 1.15, 1]} />
        <mesh geometry={collarGeo} material={mats.band} position={[0, 0.72, 0]} scale={[1, 1.15, 1]} />
        <group position={[0, 1.0, 0.285]} rotation-x={-0.62}>
          <mesh material={shell}><circleGeometry args={[0.095, 28]} /></mesh>
          <mesh position={[0, 0, 0.004]} material={mats.chest}><circleGeometry args={[0.07, 28]} /></mesh>
        </group>

        {/* floating paddle arms */}
        <group ref={armL} position={[-0.47, 1.0, 0]}>
          <group rotation-z={-0.22}>
            <mesh geometry={armGeo} material={shell} position={[0, -0.2, 0]} />
            <mesh position={[0, -0.07, 0]} material={mats.band} scale={[1, 0.8, 1]}><sphereGeometry args={[0.092, 18, 12, 0, Math.PI * 2, 0, 1.6]} /></mesh>
          </group>
        </group>
        <group ref={armR} position={[0.47, 1.0, 0]}>
          <group rotation-z={0.22}>
            <mesh geometry={armGeo} material={shell} position={[0, -0.2, 0]} />
            <mesh position={[0, -0.07, 0]} material={mats.band} scale={[1, 0.8, 1]}><sphereGeometry args={[0.092, 18, 12, 0, Math.PI * 2, 0, 1.6]} /></mesh>
          </group>
        </group>

        <group ref={head} position={[0, 1.5, 0]}>
          <RoundedBox args={[0.9, 0.68, 0.64]} radius={0.24} smoothness={5} material={shell} />
          <RoundedBox args={[0.72, 0.46, 0.08]} radius={0.16} smoothness={4} position={[0, -0.01, 0.29]} material={visor} />
          <group ref={eyes} position={[0, 0, 0.33]}>
            <mesh geometry={eyeGeo} material={mats.eye} position={[-0.14, 0, 0]} scale={[1, 1.05, 0.3]} />
            <mesh geometry={eyeGeo} material={mats.eye} position={[0.14, 0, 0]} scale={[1, 1.05, 0.3]} />
          </group>
          {/* little viewfinder brackets in the visor corners */}
          {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => (
            <group key={`${sx}${sy}`} position={[sx * 0.27, sy * 0.15 - 0.01, 0.332]}>
              <mesh position={[-sx * 0.025, 0, 0]} material={mats.eye}><boxGeometry args={[0.06, 0.012, 0.004]} /></mesh>
              <mesh position={[0, -sy * 0.025, 0]} material={mats.eye}><boxGeometry args={[0.012, 0.06, 0.004]} /></mesh>
            </group>
          ))}
          {/* headphone ears with a glowing status disc, plus leaf antennas */}
          {[-1, 1].map(sx => (
            <group key={sx}>
              <mesh position={[sx * 0.45, 0, 0]} rotation-z={Math.PI / 2} material={mats.band}><cylinderGeometry args={[0.15, 0.15, 0.1, 28]} /></mesh>
              <mesh position={[sx * 0.502, 0, 0]} rotation-y={sx * Math.PI / 2} material={mats.antenna}><circleGeometry args={[0.07, 24]} /></mesh>
              {id !== 'ceo' && (
                <mesh geometry={leafGeo} material={mats.band} position={[sx * 0.43, 0.36, -0.02]} rotation-z={-sx * 0.42} scale={[0.55, 1.7, 0.55]} />
              )}
            </group>
          ))}
          {id === 'ceo' && (
            <group position={[0, 0.34, 0]}>
              <mesh material={M.black}><cylinderGeometry args={[0.3, 0.3, 0.03, 28]} /></mesh>
              <mesh position={[0, 0.16, 0]} material={M.black}><cylinderGeometry args={[0.19, 0.2, 0.3, 28]} /></mesh>
              <mesh position={[0, 0.05, 0]} material={mats.antenna}><cylinderGeometry args={[0.205, 0.205, 0.05, 28]} /></mesh>
            </group>
          )}
        </group>
      </group>

    </group>
  )
}
