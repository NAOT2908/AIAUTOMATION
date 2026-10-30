import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CatmullRomCurve3, Group, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three'
import { CurvedRoof } from './arch'
import { Box, Pillar } from './Districts'
import { ChibiHuman } from './Human'
import { tint } from './materials'

/** the lake park on the west side of the city */
// between the boulevard (z 14) and the metro (z 46), west of the pagoda: no road crosses it
export const PARK_POS: [number, number, number] = [-30, 0, 29.5]
const RX = 9, RZ = 5.9 // lake radii

function Willow({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  const leaf = tint('#7DB25A', 0.85), leaf2 = tint('#5E9A48', 0.85)
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 1.1, 0]} rotation-z={0.12} material={tint('#6B4A33', 0.9)} castShadow><cylinderGeometry args={[0.12, 0.2, 2.2, 8]} /></mesh>
      {/* drooping curtain of leaves */}
      <mesh position={[0.15, 2.1, 0]} material={leaf} castShadow><sphereGeometry args={[1.0, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0.15, 1.35, 0]} material={leaf2} castShadow><cylinderGeometry args={[1.0, 1.15, 1.5, 14, 1, true]} /></mesh>
    </group>
  )
}

function Bench({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <Box s={[1.2, 0.08, 0.4]} p={[0, 0.42, 0]} c="#A9A39A" r={0.9} />
      <Box s={[1.2, 0.36, 0.08]} p={[0, 0.62, -0.18]} c="#A9A39A" r={0.9} />
      {[-0.5, 0.5].map(dx => <Box key={dx} s={[0.1, 0.4, 0.36]} p={[dx, 0.2, 0]} c="#8E887F" r={0.9} />)}
    </group>
  )
}

/** red arched wooden bridge from the shore to the temple island */
function RedBridge({ from, to }: { from: [number, number]; to: [number, number] }) {
  const red = tint('#B8282A', 0.5)
  const { deck, rails, posts } = useMemo(() => {
    const a = new Vector3(from[0], 0.25, from[1]), b = new Vector3(to[0], 0.25, to[1])
    const mid = a.clone().lerp(b, 0.5).setY(1.25)
    const curve = new CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).setY(0.95), mid, mid.clone().lerp(b, 0.5).setY(0.95), b])
    const dir = b.clone().sub(a).setY(0).normalize()
    const side = new Vector3(-dir.z, 0, dir.x)
    const rail = (s: number) => new TubeGeometry(new CatmullRomCurve3(curve.getPoints(20).map(p => p.clone().addScaledVector(side, s * 0.62).setY(p.y + 0.55))), 40, 0.045, 6, false)
    const steps = curve.getSpacedPoints(16).map((p, i, arr) => {
      const n = arr[Math.min(i + 1, arr.length - 1)], prev = arr[Math.max(i - 1, 0)]
      return { p, yaw: Math.atan2(n.x - prev.x, n.z - prev.z), pitch: Math.atan2(n.y - prev.y, Math.hypot(n.x - prev.x, n.z - prev.z)) }
    })
    const postPts = curve.getSpacedPoints(6).flatMap(p => [-1, 1].map(s => p.clone().addScaledVector(side, s * 0.62)))
    return { deck: steps, rails: [rail(-1), rail(1)], posts: postPts }
  }, [from, to])
  return (
    <group>
      {deck.map(({ p, yaw, pitch }, i) => (
        <mesh key={i} position={p} rotation={[-pitch, yaw, 0, 'YXZ']} material={red} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.1, 0.42]} />
        </mesh>
      ))}
      {rails.map((g, i) => <mesh key={i} geometry={g} material={red} castShadow />)}
      {posts.map((p, i) => <mesh key={i} position={[p.x, p.y + 0.28, p.z]} material={red}><boxGeometry args={[0.09, 0.56, 0.09]} /></mesh>)}
    </group>
  )
}

/** a swan pedal boat circling the lake */
function SwanBoat({ phase, color = '#F8FAFC' }: { phase: number; color?: string }) {
  const ref = useRef<Group>(null)
  const neck = useMemo(() => new TubeGeometry(new CatmullRomCurve3([new Vector3(0, 0.35, 0.35), new Vector3(0, 0.75, 0.5), new Vector3(0, 0.95, 0.42), new Vector3(0, 0.92, 0.6)]), 16, 0.07, 8), [])
  useFrame(state => {
    const g = ref.current
    if (!g) return
    const a = state.clock.elapsedTime * 0.08 + phase
    g.position.set(Math.cos(a) * RX * 0.62, -0.02 + Math.sin(state.clock.elapsedTime * 1.3 + phase) * 0.03, Math.sin(a) * RZ * 0.55)
    g.rotation.y = Math.atan2(-Math.sin(a) * RX, Math.cos(a) * RZ)
  })
  const body = tint(color, 0.4)
  return (
    <group ref={ref}>
      <RoundedBox args={[0.9, 0.4, 1.3]} radius={0.18} position={[0, 0.15, 0]} material={body} castShadow />
      <mesh geometry={neck} material={body} castShadow />
      <mesh position={[0, 0.92, 0.66]} rotation-x={Math.PI / 2} material={tint('#F59E0B', 0.5)}><coneGeometry args={[0.05, 0.14, 8]} /></mesh>
      {[-1, 1].map(s => <mesh key={s} position={[s * 0.35, 0.35, -0.2]} scale={[0.15, 0.25, 0.45]} material={body}><sphereGeometry args={[1, 10, 8]} /></mesh>)}
    </group>
  )
}

/** a stroller or jogger following the lakeside path */
function LakeWalker({ phase, speed, role = 'guest', shirt, name }: { phase: number; speed: number; role?: 'guest' | 'buddhist'; shirt: string; name: string }) {
  const ref = useRef<Group>(null)
  const R = { x: RX + 1.6, z: RZ + 1.6 }
  useFrame(state => {
    const g = ref.current
    if (!g) return
    const a = state.clock.elapsedTime * speed + phase
    g.position.set(Math.cos(a) * R.x, 0, Math.sin(a) * R.z)
    // tangent of the ellipse, walking counter-clockwise
    g.rotation.y = Math.atan2(-Math.sin(a) * R.x, Math.cos(a) * R.z)
  })
  return (
    <group ref={ref}>
      <ChibiHuman pos={[0, 0, 0]} role={role} action="walk" name={name} voice="park" shirtColor={shirt} />
    </group>
  )
}

export function LakePark() {
  const water = useMemo(() => new MeshStandardMaterial({ color: '#4C9BAE', roughness: 0.1, metalness: 0.3 }), [])
  const stone = tint('#D9D2C3', 0.9)
  return (
    <group position={PARK_POS}>
      {/* lakeside path and stone rim */}
      <mesh position={[0, -0.09, 0]} rotation-x={-Math.PI / 2} scale={[1, RZ / RX, 1]} material={stone} receiveShadow>
        <ringGeometry args={[RX + 0.9, RX + 2.3, 64]} />
      </mesh>
      <mesh position={[0, -0.07, 0]} rotation-x={-Math.PI / 2} scale={[1, RZ / RX, 1]} material={tint('#B9B1A2', 0.9)}>
        <ringGeometry args={[RX, RX + 0.35, 64]} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation-x={-Math.PI / 2} scale={[1, RZ / RX, 1]} material={water}>
        <circleGeometry args={[RX, 64]} />
      </mesh>

      {/* the old tower on its little island */}
      <group position={[-3.5, 0, 1.0]}>
        <mesh position={[0, -0.04, 0]} scale={[1, 1, 0.75]} material={tint('#7FAE5E', 0.9)}><cylinderGeometry args={[1.4, 1.5, 0.2, 24]} /></mesh>
        {[0, 1, 2].map(i => {
          const w = 1.5 - i * 0.35, y = 0.06 + i * 0.95
          return (
            <group key={i} position={[0, y, 0]}>
              <Box s={[w, 0.9, w * 0.8]} p={[0, 0.45, 0]} c="#CDBB93" r={0.85} />
              {[-1, 1].map(s => <Box key={s} s={[0.22, 0.42, 0.03]} p={[s * w * 0.22, 0.42, w * 0.4 + 0.01]} c="#3B3126" />)}
              <group position={[0, 0.9, 0]}><CurvedRoof w={w + 0.45} d={w * 0.8 + 0.45} h={0.25} curl={0.14} ridge={false} color="#7E3526" /></group>
            </group>
          )
        })}
      </group>

      {/* temple island with a red-lacquered pavilion, joined to the shore by the red bridge */}
      <group position={[5.2, 0, -3.9]}>
        <mesh position={[0, -0.03, 0]} scale={[1, 1, 0.8]} material={tint('#86B865', 0.9)}><cylinderGeometry args={[1.8, 1.9, 0.22, 24]} /></mesh>
        {[[-0.75, -0.6], [0.75, -0.6], [-0.75, 0.6], [0.75, 0.6]].map(([x, z]) => <Pillar key={`${x}${z}`} x={x} z={z} h={1.7} y={0.08} r={0.08} />)}
        <group position={[0, 1.78, 0]}><CurvedRoof w={2.4} d={2.0} h={0.6} curl={0.32} pearl /></group>
      </group>
      <RedBridge from={[9.0, -6.0]} to={[6.6, -4.6]} />

      {/* willows and benches round the shore */}
      {[[-12.2, -3.8, 1.1], [-9.5, 6.6, 1], [2, 9.0, 1.15], [11.8, 3.6, 1], [-2, -9.2, 0.95], [13.0, -2.6, 0.9]].map(([x, z, s], i) => <Willow key={i} x={x} z={z} s={s} />)}
      {[[-6, 7.6, Math.PI], [5.5, 7.7, Math.PI], [-11.6, 0.5, Math.PI / 2], [0, -8.2, 0]].map(([x, z, r], i) => <Bench key={i} x={x} z={z} rot={r} />)}

      <SwanBoat phase={0} />
      <SwanBoat phase={Math.PI} color="#FDE68A" />

      <LakeWalker phase={0} speed={0.1} shirt="#F97316" name="cong-vien-0" />
      <LakeWalker phase={2.1} speed={0.07} shirt="#22C55E" name="cong-vien-1" />
      <LakeWalker phase={4.2} speed={0.16} shirt="#0EA5E9" name="cong-vien-2" />
      <ChibiHuman pos={[-6, 0, 7.5]} rot={Math.PI} role="guest" action="sit" seat={0.42} name="cong-vien-ghe" voice="park" shirtColor="#A855F7" />
    </group>
  )
}
