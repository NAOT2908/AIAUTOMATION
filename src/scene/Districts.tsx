import { RoundedBox } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { CanvasTexture, Color, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, SRGBColorSpace, SphereGeometry, Sprite, SpriteMaterial } from 'three'
import { sound } from '../audio/sound'
import { useUI } from '../store'
import { CurvedRoof, bellGeometry, signTexture2, stoneTexture, stripeTexture } from './arch'
import { speak } from './chatter'
import { ChibiHuman } from './Human'
import { GuanYin, Shakyamuni } from './Statue'
import { Interactive } from './interact'
import { M, glow, tint } from './materials'

// Vị trí các khu vực trong RoboCity
export const BISTRO_POS: [number, number, number] = [26, 0, 0]
export const PAGODA_POS: [number, number, number] = [-2, 0, 31]
export const CLUB_POS: [number, number, number] = [26, 0, 31]

const PI = Math.PI
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]

/** a platform with a paved top (stone texture) */
export function Plaza({ w, d, color, repeat }: { w: number; d: number; color: string; repeat: number }) {
  const mat = useMemo(() => new MeshStandardMaterial({ map: stoneTexture(color, [w / repeat, d / repeat]), roughness: 0.9 }), [w, d, color, repeat])
  return <RoundedBox args={[w, 0.24, d]} radius={0.06} position={[0, -0.12, 0]} material={mat} receiveShadow castShadow />
}

export function Box({ s, p, c, r = 0.7, rot }: { s: [number, number, number]; p: [number, number, number]; c: string; r?: number; rot?: [number, number, number] }) {
  return <mesh position={p} rotation={rot} material={tint(c, r)} castShadow receiveShadow><boxGeometry args={s} /></mesh>
}

export function Pillar({ x, z, h, y = 0, c = '#9E2B25', r = 0.13 }: { x: number; z: number; h: number; y?: number; c?: string; r?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.08, 0]} material={tint('#CDBBA0', 0.85)} castShadow><cylinderGeometry args={[r * 1.6, r * 1.8, 0.16, 14]} /></mesh>
      <mesh position={[0, h / 2, 0]} material={tint(c, 0.45)} castShadow><cylinderGeometry args={[r, r * 1.05, h, 16]} /></mesh>
    </group>
  )
}

export function Tree({ x, z, s = 1, dark = false }: { x: number; z: number; s?: number; dark?: boolean }) {
  const leaf = tint(dark ? '#3E7D45' : '#5FA552', 0.85)
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.9, 0]} material={tint('#6B4A33', 0.9)} castShadow><cylinderGeometry args={[0.14, 0.22, 1.8, 10]} /></mesh>
      {[[0, 2.3, 0, 1.05], [0.75, 2.0, 0.3, 0.75], [-0.7, 2.05, -0.2, 0.8], [0.2, 2.75, -0.5, 0.75], [-0.3, 2.6, 0.6, 0.7]].map(([px, py, pz, r], i) => (
        <mesh key={i} position={[px, py, pz]} material={i % 2 ? tint(dark ? '#4C8F50' : '#72B865', 0.85) : leaf} castShadow><icosahedronGeometry args={[r, 1]} /></mesh>
      ))}
    </group>
  )
}

/* ================================================================ 1. CHÙA KHÁNH AN */

const GOLD = '#D7A23A'
const BEAT = 0.9

function Candle({ x, z, y }: { x: number; z: number; y: number }) {
  const flame = useMemo(() => glow('#FFB347', 3), [])
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.25, 0]} material={tint(GOLD, 0.35)}><cylinderGeometry args={[0.05, 0.12, 0.5, 12]} /></mesh>
      <mesh position={[0, 0.62, 0]} material={tint('#F8F1E3', 0.5)}><cylinderGeometry args={[0.05, 0.05, 0.24, 10]} /></mesh>
      <mesh position={[0, 0.8, 0]} scale={[1, 1.8, 1]} material={flame}><sphereGeometry args={[0.035, 8, 6]} /></mesh>
    </group>
  )
}

/** zoom threshold (camera.zoom) above which roofs lift off, like a dollhouse cut-away */
const CUTAWAY_ZOOM = 70
/** manual open/close of the hall roof (roof click or the 🏯 button); expires after a while */
export const roofControl = {
  open: null as boolean | null,
  until: 0,
  toggle(current: boolean) { this.open = !current; this.until = performance.now() + 20000 },
  isOpen: false,
}

/**
 * Cut-away roof: rises and fades out when the camera is close (or when clicked), so the
 * interior can be seen from the isometric view; settles back when you zoom out.
 */
function HallRoof({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)
  const lift = useRef(0)
  const camera = useThree(st => st.camera)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const close = camera.zoom > CUTAWAY_ZOOM
    const manual = roofControl.until > performance.now() ? roofControl.open : null
    const open = manual ?? close
    roofControl.isOpen = open
    lift.current += ((open ? 1 : 0) - lift.current) * Math.min(1, dt * 5)
    g.position.y = 2.85 + lift.current * 7
    g.visible = lift.current < 0.97
  })
  return (
    <Interactive name="Mái chính điện" hint="Bấm để mở mái nhìn vào trong (phóng to cũng tự mở)" bounce={false}
      onActivate={() => roofControl.toggle(roofControl.isOpen)}>
      <group ref={ref} position={[0, 2.85, -0.2]}>{children}</group>
    </Interactive>
  )
}

function MainHall() {
  const sign = useMemo(() => new MeshBasicMaterial({ map: signTexture2('CHÙA KHÁNH AN', '', '#7A1D17', '#F2C14E', 1024, 220), toneMapped: false }), [])
  const plaster = '#E6BB72'
  const cols = [-3.9, -2.3, -0.75, 0.75, 2.3, 3.9]
  return (
    <group position={[0.3, 0, -3.2]}>
      {/* raised stone base and steps */}
      <RoundedBox args={[9.8, 0.42, 5.6]} radius={0.04} position={[0, 0.21, -0.1]} material={tint('#CBB89B', 0.85)} castShadow receiveShadow />
      {[0, 1, 2].map(i => <Box key={i} s={[2.8, 0.14, 0.32]} p={[0, 0.07 + i * 0.14, 2.95 - i * 0.3 + 0.0]} c="#BFAA8A" r={0.9} />)}
      <group position={[0, 0.42, 0]}>
        {/* walls */}
        <Box s={[8.6, 2.3, 0.25]} p={[0, 1.15, -2.45]} c={plaster} />
        {[-1, 1].map(s => <Box key={s} s={[0.25, 2.3, 4.0]} p={[s * 4.3, 1.15, -0.45]} c={plaster} />)}
        {/* lacquered pillars, front beam and the name board */}
        {cols.map(x => <Pillar key={x} x={x} z={2.05} h={2.35} />)}
        {[-2.3, 2.3].map(x => <Pillar key={x} x={x} z={0.3} h={2.35} />)}
        <Box s={[8.8, 0.24, 0.26]} p={[0, 2.38, 2.05]} c="#6E1F1A" r={0.5} />
        <mesh position={[0, 2.0, 2.2]} material={sign}><planeGeometry args={[1.42, 0.31]} /></mesh>
        <Box s={[1.5, 0.38, 0.05]} p={[0, 2.0, 2.17]} c="#5C1611" r={0.4} />
        {/* altar */}
        <Box s={[3.4, 0.55, 1.3]} p={[0, 0.27, -1.6]} c="#7A1D17" r={0.4} />
        <Box s={[3.5, 0.06, 1.4]} p={[0, 0.56, -1.6]} c={GOLD} r={0.3} />
        <Shakyamuni position={[0, 0.58, -1.7]} scale={0.78} onActivate={() => sound.playBell(0.6)} />
        <Candle x={-1.25} z={-1.15} y={0.58} />
        <Candle x={1.25} z={-1.15} y={0.58} />
        {/* fruit plate and flowers */}
        <mesh position={[-0.7, 0.66, -1.05]} material={tint(GOLD, 0.3)}><cylinderGeometry args={[0.22, 0.12, 0.08, 16]} /></mesh>
        {[[-0.76, -1.02, '#F28C28'], [-0.64, -1.08, '#E8C547'], [-0.7, -0.98, '#D64545']].map(([x, z, c], i) => (
          <mesh key={i} position={[x as number, 0.75, z as number]} material={tint(c as string, 0.5)}><sphereGeometry args={[0.07, 10, 8]} /></mesh>
        ))}
        {[0.7].map(x => (
          <group key={x} position={[x, 0.6, -1.05]}>
            <mesh position={[0, 0.12, 0]} material={tint('#2F6F8F', 0.3)}><cylinderGeometry args={[0.07, 0.09, 0.24, 12]} /></mesh>
            {[-0.06, 0, 0.06].map((dx, i) => <mesh key={i} position={[dx, 0.36, 0]} material={tint('#F6A5C0', 0.5)}><sphereGeometry args={[0.07, 10, 8]} /></mesh>)}
          </group>
        ))}
      </group>
      {/* two-tier curved roof (chồng diêm); lifts away when you zoom in so the altar can be seen */}
      <HallRoof>
        {/* ceiling lifts with the roof */}
        <Box s={[8.6, 0.18, 4.4]} p={[0, -0.01, 0]} c="#5A2A1C" r={0.8} />
        <CurvedRoof w={10.8} d={7.0} h={1.25} curl={0.55} ridge={false} />
        <Box s={[6.6, 0.85, 3.7]} p={[0, 0.85, 0]} c="#7A1D17" r={0.6} />
        <CurvedRoof w={7.8} d={4.6} h={1.3} curl={0.5} y={1.25} pearl />
      </HallRoof>
    </group>
  )
}

function BellTower({ position }: { position: [number, number, number] }) {
  const bellRef = useRef<Group>(null)
  const logRef = useRef<Group>(null)
  const ringRef = useRef<Mesh>(null)
  const bronze = useMemo(() => new MeshStandardMaterial({ color: '#7D5A2E', metalness: 0.8, roughness: 0.35 }), [])
  const geo = useMemo(() => bellGeometry(1), [])
  const ripple = useMemo(() => new MeshBasicMaterial({ color: new Color(2, 1.6, 0.8), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [])
  const hit = useRef(-10)
  const lastCycle = useRef(-1)

  const strike = () => {
    hit.current = performance.now() / 1000
    sound.playBell()
  }

  useFrame(state => {
    const t = state.clock.elapsedTime
    // the ringer's 8 s cycle: pull back, release, hit at k = 0.5
    const k = (t % 8) / 8
    const pull = k < 0.4 ? k / 0.4 : k < 0.5 ? 1 - (k - 0.4) / 0.1 : 0
    if (logRef.current) logRef.current.position.x = -1.0 - pull * 0.45
    const cycle = Math.floor(t / 8)
    if (k >= 0.5 && cycle !== lastCycle.current) {
      lastCycle.current = cycle
      hit.current = performance.now() / 1000
      if (useUI.getState().district === 'pagoda') sound.playBell(0.55)
    }
    const since = performance.now() / 1000 - hit.current
    if (bellRef.current) bellRef.current.rotation.z = since < 3 ? Math.sin(since * 14) * 0.05 * Math.exp(-since * 1.4) : 0
    if (ringRef.current) {
      const a = Math.min(1, since / 1.6)
      ringRef.current.scale.setScalar(0.6 + a * 2.6)
      ripple.opacity = since < 1.6 ? 0.55 * (1 - a) : 0
    }
  })

  return (
    <group position={position}>
      <RoundedBox args={[2.8, 0.3, 2.8]} radius={0.04} position={[0, 0.15, 0]} material={tint('#CBB89B', 0.85)} castShadow receiveShadow />
      {[[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]].map(([x, z]) => <Pillar key={`${x}${z}`} x={x} z={z} h={2.3} y={0.3} />)}
      <Box s={[2.2, 0.16, 0.18]} p={[0, 2.55, 0]} c="#5A2A1C" />
      <Box s={[0.18, 0.16, 2.2]} p={[0, 2.55, 0]} c="#5A2A1C" />
      <group position={[0, 2.62, 0]}>
        <CurvedRoof w={3.5} d={3.5} h={1.0} curl={0.42} ridge={false} pearl />
      </group>
      <Interactive name="Chuông đồng" hint="Bấm để thỉnh chuông" onActivate={strike} bounce={false}>
        <group ref={bellRef} position={[0, 2.47, 0]}>
          <mesh geometry={geo} material={bronze} position={[0, -1.0, 0]} castShadow />
          <mesh position={[0, 0.02, 0]} material={bronze}><torusGeometry args={[0.1, 0.035, 8, 16]} /></mesh>
        </group>
        <mesh ref={ringRef} position={[0, 1.9, 0]} rotation-x={PI / 2} material={ripple}><torusGeometry args={[0.5, 0.02, 6, 48]} /></mesh>
      </Interactive>
      {/* striker log hung on two ropes */}
      <group ref={logRef} position={[-1.0, 1.85, 0]}>
        <mesh rotation-z={PI / 2} material={tint('#8A6440', 0.8)} castShadow><cylinderGeometry args={[0.1, 0.1, 1.1, 12]} /></mesh>
        {[-0.35, 0.35].map(x => <mesh key={x} position={[x, 0.33, 0]} material={tint('#C9A86B', 0.9)}><cylinderGeometry args={[0.012, 0.012, 0.66, 4]} /></mesh>)}
      </group>
      <ChibiHuman pos={[-1.85, 0, 0]} rot={PI / 2} role="monk" action="ring" name="chuong" voice="ringer" />
    </group>
  )
}

function Stupa({ position }: { position: [number, number, number] }) {
  const brick = '#C9734A'
  return (
    <group position={position}>
      <RoundedBox args={[2.8, 0.3, 2.8]} radius={0.04} position={[0, 0.15, 0]} material={tint('#CBB89B', 0.85)} castShadow receiveShadow />
      {[0, 1, 2, 3, 4].map(i => {
        const s = 1.8 - i * 0.26, y = 0.3 + i * 1.22
        return (
          <group key={i} position={[0, y, 0]}>
            <Box s={[s, 0.85, s]} p={[0, 0.42, 0]} c={brick} r={0.85} />
            <Box s={[0.36, 0.5, 0.04]} p={[0, 0.42, s / 2 + 0.01]} c="#3B2318" />
            <group position={[0, 0.85, 0]}><CurvedRoof w={s + 1.0} d={s + 1.0} h={0.42} curl={0.24} ridge={false} color="#7E3526" /></group>
          </group>
        )
      })}
      <mesh position={[0, 6.75, 0]} material={tint(GOLD, 0.3)} castShadow><sphereGeometry args={[0.22, 16, 12]} /></mesh>
      <mesh position={[0, 7.15, 0]} material={tint(GOLD, 0.3)}><coneGeometry args={[0.1, 0.6, 12]} /></mesh>
    </group>
  )
}

function IncenseUrn({ position }: { position: [number, number, number] }) {
  const bronze = useMemo(() => new MeshStandardMaterial({ color: '#6B4E2A', metalness: 0.75, roughness: 0.38 }), [])
  const ember = useMemo(() => glow('#FF5A36', 2.6), [])
  const smoke = useMemo(() => Array.from({ length: 8 }, () => new MeshBasicMaterial({ color: '#EDEFF4', transparent: true, opacity: 0, depthWrite: false })), [])
  const puffs = useRef<Mesh[]>([])
  const boost = useRef(0)
  const geo = useMemo(() => new SphereGeometry(0.12, 10, 8), [])
  useFrame(state => {
    const t = state.clock.elapsedTime
    puffs.current.forEach((m, i) => {
      const k = ((t * (0.22 + boost.current * 0.3) + i / 8) % 1)
      m.position.set(Math.sin(t * 0.6 + i) * 0.12 * k, 1.35 + k * 1.8, Math.cos(t * 0.5 + i) * 0.1 * k)
      m.scale.setScalar(0.5 + k * 2.2)
      smoke[i].opacity = 0.35 * (1 - k) * Math.min(1, k * 6)
    })
    boost.current = Math.max(0, boost.current - 0.01)
  })
  return (
    <Interactive name="Đỉnh hương" hint="Bấm để thắp thêm nén nhang" position={position} onActivate={() => { boost.current = 1; sound.playBeep(440, 0.2) }}>
      <RoundedBox args={[1.1, 0.25, 1.1]} radius={0.04} position={[0, 0.12, 0]} material={tint('#BFAA8A', 0.9)} castShadow />
      {[0, 1, 2].map(i => {
        const a = (i / 3) * PI * 2
        return <mesh key={i} position={[Math.cos(a) * 0.32, 0.38, Math.sin(a) * 0.32]} material={bronze}><cylinderGeometry args={[0.05, 0.07, 0.3, 8]} /></mesh>
      })}
      <mesh position={[0, 0.78, 0]} material={bronze} scale={[1, 0.75, 1]} castShadow><sphereGeometry args={[0.48, 24, 16]} /></mesh>
      <mesh position={[0, 1.08, 0]} material={bronze}><cylinderGeometry args={[0.42, 0.36, 0.12, 24]} /></mesh>
      {[-0.1, 0, 0.1, 0.05].map((dx, i) => (
        <group key={i} position={[dx, 1.14, (i - 1.5) * 0.06]} rotation-z={dx * 0.6}>
          <mesh position={[0, 0.16, 0]} material={tint('#B23A2E', 0.6)}><cylinderGeometry args={[0.012, 0.012, 0.32, 5]} /></mesh>
          <mesh position={[0, 0.33, 0]} material={ember}><sphereGeometry args={[0.022, 6, 6]} /></mesh>
        </group>
      ))}
      {smoke.map((m, i) => <mesh key={i} ref={el => { if (el) puffs.current[i] = el }} geometry={geo} material={m} raycast={() => {}} />)}
    </Interactive>
  )
}

function LotusPond({ position }: { position: [number, number, number] }) {
  const water = useMemo(() => new MeshStandardMaterial({ color: '#4C9A97', roughness: 0.12, metalness: 0.25 }), [])
  const pads: [number, number, number][] = [[-1.2, -0.4, 0.32], [-0.4, 0.5, 0.28], [0.6, -0.3, 0.34], [1.3, 0.4, 0.26], [0.1, 0.1, 0.22], [-1.5, 0.6, 0.24]]
  return (
    <group position={position}>
      <RoundedBox args={[4.4, 0.3, 2.8]} radius={0.12} position={[0, 0.15, 0]} material={tint('#BFAA8A', 0.9)} castShadow receiveShadow />
      <mesh position={[0, 0.27, 0]} rotation-x={-PI / 2} material={water}><planeGeometry args={[4.0, 2.4]} /></mesh>
      {pads.map(([x, z, r], i) => (
        <group key={i} position={[x, 0.29, z]}>
          <mesh material={tint('#3F8A45', 0.7)}><cylinderGeometry args={[r, r, 0.02, 18, 1, false, 0.3, PI * 1.85]} /></mesh>
          {i % 2 === 0 && (
            <group position={[0.05, 0.12, 0]}>
              {Array.from({ length: 7 }, (_, k) => {
                const a = (k / 7) * PI * 2
                return <mesh key={k} position={[Math.cos(a) * 0.07, 0.04, Math.sin(a) * 0.07]} rotation={[Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]} scale={[0.06, 0.13, 0.04]} material={tint('#F49AB4', 0.5)}><sphereGeometry args={[1, 8, 6]} /></mesh>
              })}
              <mesh position={[0, 0.06, 0]} material={tint('#F6D35B', 0.5)}><sphereGeometry args={[0.04, 8, 6]} /></mesh>
            </group>
          )}
        </group>
      ))}
    </group>
  )
}

function StoneLantern({ x, z }: { x: number; z: number }) {
  const light = useMemo(() => glow('#FFC56B', 1.6), [])
  return (
    <group position={[x, 0, z]}>
      <Box s={[0.5, 0.2, 0.5]} p={[0, 0.1, 0]} c="#A8A29A" r={0.95} />
      <mesh position={[0, 0.55, 0]} material={tint('#A8A29A', 0.95)}><cylinderGeometry args={[0.1, 0.12, 0.7, 8]} /></mesh>
      <Box s={[0.42, 0.34, 0.42]} p={[0, 1.07, 0]} c="#A8A29A" r={0.95} />
      <mesh position={[0, 1.07, 0.212]} material={light}><planeGeometry args={[0.18, 0.18]} /></mesh>
      <mesh position={[0, 1.36, 0]} material={tint('#8F8982', 0.95)} castShadow><coneGeometry args={[0.38, 0.28, 4]} /></mesh>
    </group>
  )
}

function Woodfish({ position }: { position: [number, number, number] }) {
  return (
    <Interactive name="Mõ gỗ" hint="Bấm để chơi Gõ mõ tích công đức 🪵" position={position} onActivate={() => { sound.playWoodfish(); useUI.setState({ game: 'mo' }) }}>
      <mesh position={[0, 0.06, 0]} material={tint('#7A1D17', 0.6)}><cylinderGeometry args={[0.2, 0.22, 0.1, 16]} /></mesh>
      <mesh position={[0, 0.2, 0]} scale={[1, 0.8, 0.85]} material={tint('#A5672F', 0.45)} castShadow><sphereGeometry args={[0.16, 18, 12]} /></mesh>
      <mesh position={[0, 0.2, 0.13]} scale={[0.7, 0.12, 0.2]} material={tint('#3B2210', 0.6)}><sphereGeometry args={[0.16, 10, 6]} /></mesh>
    </Interactive>
  )
}

function Cushion({ x, z, c = '#8E2D23' }: { x: number; z: number; c?: string }) {
  return <mesh position={[x, 0.07, z]} material={tint(c, 0.95)} castShadow receiveShadow><cylinderGeometry args={[0.36, 0.38, 0.14, 20]} /></mesh>
}

function PerimeterWall() {
  const segs: [number, number, number, number][] = [[0, -6.85, 17, 0], [-8.35, 0, 13.7, 1], [8.35, 0, 13.7, 1]]
  return (
    <group>
      {segs.map(([x, z, len, side], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={side ? PI / 2 : 0}>
          <Box s={[len, 0.75, 0.26]} p={[0, 0.375, 0]} c="#E6BB72" />
          <Box s={[len, 0.12, 0.42]} p={[0, 0.8, 0]} c="#7E3526" r={0.7} />
        </group>
      ))}
      {/* gate pillars (trụ biểu) with lotus tops */}
      {[-1.7, 2.3].map(x => (
        <group key={x} position={[x, 0, 6.5]}>
          <Box s={[0.5, 2.6, 0.5]} p={[0, 1.3, 0]} c="#E9D9B8" />
          <Box s={[0.62, 0.14, 0.62]} p={[0, 2.62, 0]} c="#7E3526" />
          <mesh position={[0, 2.95, 0]} material={tint('#E9D9B8', 0.8)}><sphereGeometry args={[0.24, 14, 10]} /></mesh>
          <mesh position={[0, 3.25, 0]} material={tint(GOLD, 0.35)}><coneGeometry args={[0.1, 0.3, 10]} /></mesh>
        </group>
      ))}
    </group>
  )
}

function CyberPagoda() {
  const setDistrict = useUI(s => s.setDistrict)
  const lastBeat = useRef(-1)
  useFrame(state => {
    // chanting: one knock of the wooden fish per beat while the pagoda is in view
    const n = Math.floor(state.clock.elapsedTime / BEAT)
    if (n !== lastBeat.current) {
      lastBeat.current = n
      if (useUI.getState().district === 'pagoda' && n % 24 < 16) sound.playWoodfish(0.35)
    }
  })
  return (
    <group position={PAGODA_POS} onDoubleClick={e => { e.stopPropagation(); setDistrict('pagoda') }}>
      <Plaza w={17} d={14} color="#E4D7C2" repeat={2} />
      <PerimeterWall />
      <MainHall />
      <Stupa position={[-6.4, 0, -2.4]} />
      <BellTower position={[7.0, 0, 1.7]} />
      <IncenseUrn position={[0.3, 0, 4.9]} />
      <LotusPond position={[-5.2, 0, 4.4]} />
      <Tree x={6.9} z={-3.4} s={1.35} dark />
      <Tree x={-7.2} z={2.0} s={0.9} />
      <StoneLantern x={-2.4} z={0.2} />
      <StoneLantern x={3.0} z={0.2} />

      {/* outdoor Quan Âm statue the assembly faces, turned toward the camera side */}
      <GuanYin position={[5.3, 0, 4.6]} rot={0.7} />

      {/* the assembly: a monk leads the chant with the wooden fish; lay Buddhists meditate, palms together */}
      <Cushion x={1.75} z={1.9} c="#5C2A1C" />
      <ChibiHuman pos={[1.75, 0.12, 1.9]} rot={PI / 2} role="monk" action="chant" beat={BEAT} name="tri-khach" voice="monk" />
      <Woodfish position={[2.15, 0, 1.6]} />
      {[[-1.3, 0.8], [0.15, 0.8], [-1.3, 1.9], [0.15, 1.9], [-1.3, 3.0], [0.15, 3.0]].map(([x, z], i) => (
        <group key={i}>
          <Cushion x={x} z={z} />
          <ChibiHuman pos={[x, 0.12, z]} rot={PI / 2} role="buddhist" action="meditate" name={`phat-tu-${i}`} voice="buddhist"
            skinTone={['#F3C9A5', '#E8B48E', '#F6D2B5'][i % 3]} hair={i % 2 ? 'bun' : 'short'} />
        </group>
      ))}
      {/* a visitor bowing on the hall steps */}
      <ChibiHuman pos={[0.3, 0, 0.3]} rot={PI} role="buddhist" action="prostrate" name="le-phat" hair="long" voice="buddhist" />
    </group>
  )
}

/* ================================================================ 2. PHỐ ẨM THỰC */

export function Scooter({ x, z, rot = 0, c }: { x: number; z: number; rot?: number; c: string }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {[-0.42, 0.42].map(zz => (
        <mesh key={zz} position={[0, 0.2, zz]} rotation-z={PI / 2} material={M.tyre} castShadow><cylinderGeometry args={[0.2, 0.2, 0.09, 16]} /></mesh>
      ))}
      <RoundedBox args={[0.32, 0.3, 0.9]} radius={0.12} position={[0, 0.42, -0.05]} material={tint(c, 0.35)} castShadow />
      <RoundedBox args={[0.3, 0.1, 0.5]} radius={0.05} position={[0, 0.62, -0.15]} material={tint('#1F2328', 0.7)} castShadow />
      <RoundedBox args={[0.28, 0.5, 0.16]} radius={0.06} position={[0, 0.6, 0.38]} material={tint(c, 0.35)} castShadow />
      <mesh position={[0, 0.9, 0.42]} rotation-z={PI / 2} material={M.darkMetal}><cylinderGeometry args={[0.02, 0.02, 0.56, 6]} /></mesh>
      <mesh position={[0, 0.84, 0.49]} material={glow('#FFF6D8', 1.6)}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
    </group>
  )
}

function PlasticSet({ x, z, people }: { x: number; z: number; people: number }) {
  const seats: [number, number, number][] = [[0, 0.55, PI], [0, -0.55, 0], [0.55, 0, -PI / 2], [-0.55, 0, PI / 2]]
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.42, 0]} material={tint('#2E7BD6', 0.5)} castShadow><boxGeometry args={[0.7, 0.04, 0.7]} /></mesh>
      <mesh position={[0, 0.21, 0]} material={tint('#2E7BD6', 0.5)}><cylinderGeometry args={[0.25, 0.3, 0.4, 4, 1, true]} /></mesh>
      {/* bowls with chopsticks, a glass of iced tea */}
      {[[0.15, 0.1], [-0.15, -0.12]].map(([bx, bz], i) => (
        <group key={i} position={[bx, 0.47, bz]}>
          <mesh material={M.white}><cylinderGeometry args={[0.1, 0.06, 0.07, 14]} /></mesh>
          <mesh position={[0, 0.03, 0]} rotation-x={-PI / 2} material={tint('#E6B45A', 0.5)}><circleGeometry args={[0.085, 14]} /></mesh>
          <mesh position={[0.02, 0.07, 0]} rotation-z={0.5} material={tint('#C9A06A', 0.7)}><boxGeometry args={[0.24, 0.012, 0.012]} /></mesh>
        </group>
      ))}
      <mesh position={[-0.18, 0.5, 0.18]} material={M.glass}><cylinderGeometry args={[0.04, 0.035, 0.12, 10]} /></mesh>
      {seats.map(([sx, sz, r], i) => (
        <group key={i} position={[sx, 0, sz]}>
          <mesh position={[0, 0.26, 0]} material={tint(i % 2 ? '#D63A3A' : '#2E7BD6', 0.5)} castShadow><cylinderGeometry args={[0.15, 0.18, 0.26, 12]} /></mesh>
          {i < people && <ChibiHuman pos={[0, 0, 0]} rot={r} role="guest" action="eat" seat={0.28} name={`an-${x}-${z}-${i}`} voice="diner" table={`ban-${x}-${z}`}
            shirtColor={['#F97316', '#0EA5E9', '#22C55E', '#E11D48'][i]} pantsColor={['#334155', '#1E3A8A', '#3F3F46', '#1F2937'][i]} />}
        </group>
      ))}
    </group>
  )
}

function ShopHouse({ x, facade, sign, sub, signBg, awningA }: { x: number; facade: string; sign: string; sub: string; signBg: string; awningA: string }) {
  const signMat = useMemo(() => new MeshBasicMaterial({ map: signTexture2(sign, sub, signBg, '#FFFFFF', 1024, 256), toneMapped: false }), [sign, sub, signBg])
  const awning = useMemo(() => new MeshStandardMaterial({ map: stripeTexture(awningA, '#F8F4EA'), roughness: 0.8 }), [awningA])
  const W = 4.6, D = 5, F = 2.9
  return (
    <group position={[x, 0, -3.6]}>
      {/* body: two floors and a parapet */}
      <Box s={[W, F * 2, D]} p={[0, F, 0]} c={facade} r={0.85} />
      <Box s={[W + 0.1, 0.3, D + 0.1]} p={[0, F * 2 + 0.15, 0]} c="#EDE6DA" r={0.85} />
      {/* ground floor shopfront: dark interior, shutter box */}
      <Box s={[W - 0.5, 2.3, 0.1]} p={[0, 1.2, D / 2 + 0.01]} c="#3A2A22" r={0.7} />
      <Box s={[W - 0.3, 0.22, 0.24]} p={[0, 2.5, D / 2 + 0.08]} c="#9CA3AF" r={0.4} />
      <mesh position={[0, 2.95, D / 2 + 0.06]} material={signMat}><planeGeometry args={[W - 0.4, (W - 0.4) / 4]} /></mesh>
      {/* awning */}
      <mesh position={[0, 2.35, D / 2 + 0.7]} rotation-x={0.42} material={awning} castShadow><boxGeometry args={[W - 0.2, 0.04, 1.5]} /></mesh>
      {/* upper floor: balcony, french windows with green shutters, potted plants, AC unit */}
      <Box s={[W, 0.12, 0.9]} p={[0, F + 0.1, D / 2 + 0.45]} c="#EDE6DA" />
      {[-1.1, 0, 1.1].map(bx => <Box key={bx} s={[0.04, 0.8, 0.04]} p={[bx * 2, F + 0.55, D / 2 + 0.88]} c="#3A3F45" />)}
      <Box s={[W, 0.05, 0.05]} p={[0, F + 0.95, D / 2 + 0.88]} c="#3A3F45" />
      {[-1.1, 1.1].map(wx => (
        <group key={wx} position={[wx, F + 1.25, D / 2 + 0.01]}>
          <Box s={[0.9, 1.6, 0.06]} p={[0, 0, 0]} c="#2B3A44" r={0.3} />
          {[-1, 1].map(s => <Box key={s} s={[0.42, 1.6, 0.05]} p={[s * 0.68, 0, 0.03]} c="#3F7D5A" r={0.6} rot={[0, s * 0.5, 0]} />)}
        </group>
      ))}
      {[-1.6, 1.6].map(px => (
        <group key={px} position={[px, F + 0.16, D / 2 + 0.6]}>
          <mesh position={[0, 0.12, 0]} material={tint('#B4643C', 0.8)}><cylinderGeometry args={[0.13, 0.1, 0.24, 10]} /></mesh>
          <mesh position={[0, 0.38, 0]} material={tint('#4F9A55', 0.85)}><icosahedronGeometry args={[0.22, 1]} /></mesh>
        </group>
      ))}
      <Box s={[0.7, 0.45, 0.3]} p={[W / 2 - 0.6, F * 1.75, D / 2 + 0.16]} c="#E5E7EB" r={0.5} />
      {/* rooftop stainless water tank */}
      <mesh position={[-1.2, F * 2 + 0.75, -1]} rotation-z={PI / 2} material={tint('#C7CCD3', 0.3)} castShadow><cylinderGeometry args={[0.4, 0.4, 1.2, 18]} /></mesh>
    </group>
  )
}

function StringLights() {
  const bulb = useMemo(() => glow('#FFD58A', 2.4), [])
  const pts = useMemo(() => {
    const out: [number, number, number][] = []
    for (let i = 0; i <= 24; i++) {
      const u = i / 24
      out.push([-7 + u * 14, 3.1 - Math.sin(u * PI * 3) ** 2 * 0.35, 2.4])
    }
    return out
  }, [])
  return (
    <group>
      {[-7, 7].map(x => <mesh key={x} position={[x, 1.6, 2.4]} material={M.darkMetal}><cylinderGeometry args={[0.05, 0.06, 3.2, 8]} /></mesh>)}
      {pts.map((p, i) => <mesh key={i} position={p} material={bulb}><sphereGeometry args={[0.06, 8, 6]} /></mesh>)}
    </group>
  )
}

function PhoCart({ position }: { position: [number, number, number] }) {
  const steam = useRef<Group>(null)
  const puffs = useMemo(() => [0, 1, 2].map(() => new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.3, depthWrite: false })), [])
  useFrame(state => {
    const t = state.clock.elapsedTime
    steam.current?.children.forEach((m, i) => {
      const k = (t * 0.5 + i / 3) % 1
      m.position.set(Math.sin(t + i) * 0.05, 1.15 + k * 0.8, 0)
      m.scale.setScalar(0.6 + k * 1.4)
      ;((m as Mesh).material as MeshBasicMaterial).opacity = 0.4 * (1 - k)
    })
  })
  return (
    <Interactive name="Xe phở" hint="Bấm để chơi Nấu phở thần tốc 🍜" position={position} onActivate={() => { sound.playBeep(700, 0.1); useUI.setState({ game: 'pho' }) }}>
      <RoundedBox args={[1.8, 0.85, 0.8]} radius={0.05} position={[0, 0.5, 0]} material={tint('#C0392B', 0.5)} castShadow />
      <RoundedBox args={[1.9, 0.06, 0.9]} radius={0.02} position={[0, 0.95, 0]} material={tint('#E9E4DA', 0.4)} />
      <mesh position={[0, 0.2, 0.42]} rotation-x={PI / 2} material={M.tyre}><cylinderGeometry args={[0.18, 0.18, 0.06, 14]} /></mesh>
      <mesh position={[-0.45, 1.13, 0]} material={tint('#9AA3AD', 0.25)} castShadow><cylinderGeometry args={[0.28, 0.26, 0.36, 18]} /></mesh>
      <mesh position={[0.45, 1.05, 0]} material={M.glass}><boxGeometry args={[0.6, 0.2, 0.5]} /></mesh>
      <group ref={steam} position={[-0.45, 0, 0]}>
        {puffs.map((m, i) => <mesh key={i} material={m}><sphereGeometry args={[0.12, 10, 8]} /></mesh>)}
      </group>
    </Interactive>
  )
}

const TABLES: [number, number][] = [[-2.6, 2.2], [0.2, 1.4], [2.9, 2.3], [5.4, 1.0]]

/** a fresh bowl appears on the table the waiter just served, steaming for a while */
function ServedDishes({ served }: { served: { current: number[] } }) {
  const groups = useRef<(Group | null)[]>([])
  const puffs = useMemo(() => TABLES.map(() => [0, 1, 2].map(() => new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false }))), [])
  useFrame(state => {
    const now = performance.now(), t = state.clock.elapsedTime
    TABLES.forEach((_, i) => {
      const g = groups.current[i]
      if (!g) return
      const age = (now - served.current[i]) / 1000
      g.visible = age < 28
      puffs[i].forEach((m, k) => {
        const kk = (t * 0.6 + k / 3) % 1
        m.opacity = age < 14 ? 0.45 * (1 - kk) * (1 - age / 14) : 0
        const mesh = g.children[2 + k]
        mesh.position.set(Math.sin(t + k) * 0.03, 0.1 + kk * 0.5, 0)
        mesh.scale.setScalar(0.5 + kk * 1.2)
      })
    })
  })
  return (
    <group>
      {TABLES.map(([x, z], i) => (
        <group key={i} ref={el => { groups.current[i] = el }} position={[x - 0.02, 0.46, z - 0.2]} visible={false}>
          <mesh material={M.white}><cylinderGeometry args={[0.12, 0.07, 0.09, 16]} /></mesh>
          <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2} material={tint('#E9B65C', 0.5)}><circleGeometry args={[0.105, 16]} /></mesh>
          {puffs[i].map((m, k) => <mesh key={k} material={m}><sphereGeometry args={[0.05, 8, 6]} /></mesh>)}
        </group>
      ))}
    </group>
  )
}

/** the waiter: picks up at the phở cart, carries a bowl to each table in turn */
function Waiter({ served }: { served: { current: number[] } }) {
  const ref = useRef<Group>(null)
  const tray = useRef<Group>(null)
  const [pose, setPose] = useState<'carry' | 'hold' | 'walk' | 'idle'>('carry')
  const st = useRef({ table: 0, phase: 0, t: 0 })
  const LANE = 0.35, HOME: [number, number] = [-4.0, LANE]
  const legs = (i: number): [number, number][] => {
    const [tx, tz] = TABLES[i]
    return [HOME, [tx, LANE], [tx, tz - 1.0]]
  }
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const s = st.current
    s.t += dt
    const speed = 1.5
    const walkAlong = (pts: [number, number][]) => {
      let d = s.t * speed
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1], [bx, bz] = pts[i]
        const len = Math.hypot(bx - ax, bz - az)
        if (d <= len || i === pts.length - 1) {
          const k = Math.min(1, d / Math.max(1e-6, len))
          g.position.set(ax + (bx - ax) * k, 0, az + (bz - az) * k)
          if (len > 1e-3) g.rotation.y = Math.atan2(bx - ax, bz - az)
          return d > len
        }
        d -= len
      }
      return true
    }
    const next = (phase: number, p: typeof pose) => { s.phase = phase; s.t = 0; setPose(p) }
    if (s.phase === 0) {                       // carry the bowl out
      if (walkAlong(legs(s.table))) {
        next(1, 'hold')
        served.current[s.table] = performance.now()
        speak('phuc-vu', pick(['Món của anh chị đây ạ! 🍜', 'Chúc cả nhà ngon miệng!', 'Cẩn thận nóng nha!']))
        const [tx, tz] = TABLES[s.table]
        setTimeout(() => speak(`an-${tx}-${tz}-0`, pick(['Cảm ơn em nhé! 😋', 'Thơm quá trời!', 'Nhìn là thấy đói rồi'])), 1300)
      }
    } else if (s.phase === 1) {                // set it down
      if (s.t > 1.8) next(2, 'walk')
    } else if (s.phase === 2) {                // back to the cart
      if (walkAlong([...legs(s.table)].reverse())) {
        next(3, 'idle')
        speak('dau-bep', pick(['Phở bò tái nạm ra đây! 🍜', 'Bún chả xong rồi!', 'Bàn kế tiếp nè!']))
      }
    } else if (s.t > 2.6) {                    // pick up the next order
      s.table = (s.table + 1) % TABLES.length
      next(0, 'carry')
    }
    if (tray.current) tray.current.visible = s.phase <= 1 && !(s.phase === 1 && s.t > 0.9)
  })
  return (
    <group ref={ref} position={[HOME[0], 0, HOME[1]]}>
      <ChibiHuman pos={[0, 0, 0]} role="guest" action={pose} name="phuc-vu" voice="waiter" shirtColor="#F8FAFC" pantsColor="#111827" hair="bun" />
      <group ref={tray} position={[0, 1.0, 0.42]}>
        <mesh material={M.metal}><cylinderGeometry args={[0.2, 0.2, 0.02, 20]} /></mesh>
        <mesh position={[0, 0.05, 0]} material={M.white}><cylinderGeometry args={[0.11, 0.07, 0.09, 16]} /></mesh>
        <mesh position={[0, 0.095, 0]} rotation-x={-Math.PI / 2} material={tint('#E9B65C', 0.5)}><circleGeometry args={[0.095, 16]} /></mesh>
      </group>
    </group>
  )
}

function RoboBistro() {
  const setDistrict = useUI(s => s.setDistrict)
  const served = useRef(TABLES.map(() => -1e9))
  return (
    <group position={BISTRO_POS} onDoubleClick={e => { e.stopPropagation(); setDistrict('bistro') }}>
      <Plaza w={16} d={14} color="#D9D4CB" repeat={1.2} />
      <ShopHouse x={-5.2} facade="#F2D7A6" sign="PHỞ ROBO" sub="Phở bò · Bún chả · 24/7" signBg="#B3261E" awningA="#C62828" />
      <ShopHouse x={0} facade="#CFE3D4" sign="RAMEN BOT" sub="Mì Nhật · Gyoza · Trà đá" signBg="#1E3A5F" awningA="#2563EB" />
      <ShopHouse x={5.2} facade="#F4C7B8" sign="CÀ PHÊ AI" sub="Cà phê muối · Bạc xỉu" signBg="#3F2A1E" awningA="#8B5E3C" />
      <StringLights />
      <PhoCart position={[-5.0, 0, 0.6]} />
      <ChibiHuman pos={[-5.0, 0, -0.1]} rot={0} role="chef" action="idle" name="dau-bep" voice="chef" />
      <PlasticSet x={-2.6} z={2.2} people={3} />
      <PlasticSet x={0.2} z={1.4} people={2} />
      <PlasticSet x={2.9} z={2.3} people={4} />
      <PlasticSet x={5.4} z={1.0} people={2} />
      <ServedDishes served={served} />
      <Waiter served={served} />
      {['#E11D48', '#111827', '#F8FAFC', '#2563EB', '#16A34A'].map((c, i) => <Scooter key={i} x={-6 + i * 1.1} z={5.4} rot={0.25} c={c} />)}
      <Tree x={6.8} z={5.5} s={0.85} />
      <ChibiHuman pos={[3.6, 0, 5.2]} rot={-0.6} role="guest" action="walk" name="khach-di-bo" shirtColor="#F59E0B" voice="walker" />
    </group>
  )
}

/* ================================================================ 3. VŨ TRƯỜNG */

function DanceFloor() {
  const ref = useRef<InstancedMesh>(null)
  const cols = 8, rows = 5, n = cols * rows
  const c = useMemo(() => new Color(), [])
  useFrame(state => {
    const m = ref.current
    if (!m) return
    if (!m.userData.placed) {
      const o = new Object3D()
      for (let i = 0; i < n; i++) {
        o.position.set((i % cols - (cols - 1) / 2) * 0.82, 0.03, (Math.floor(i / cols) - (rows - 1) / 2) * 0.82)
        o.updateMatrix()
        m.setMatrixAt(i, o.matrix)
      }
      m.instanceMatrix.needsUpdate = true
      m.userData.placed = true
    }
    const t = state.clock.elapsedTime
    for (let i = 0; i < n; i++) {
      const x = i % cols, y = Math.floor(i / cols)
      const v = 0.5 + 0.5 * Math.sin(t * 3 + x * 0.9 + y * 1.3)
      c.setHSL((t * 0.08 + x * 0.05 + y * 0.07) % 1, 0.85, 0.25 + v * 0.3).multiplyScalar(1.6)
      m.setColorAt(i, c)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <boxGeometry args={[0.78, 0.05, 0.78]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

function Speaker({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[0.8, 1.6, 0.7]} radius={0.04} position={[0, 0.8, 0]} material={tint('#16181D', 0.5)} castShadow />
      {[0.45, 1.1].map((y, i) => <mesh key={y} position={[0, y, 0.36]} material={tint('#2C3038', 0.3)}><cylinderGeometry args={[i ? 0.16 : 0.26, i ? 0.16 : 0.26, 0.04, 20]} /></mesh>)}
    </group>
  )
}

/** ♪ ♫ notes rising from the stage, pink and cyan */
function MusicNotes() {
  const notes = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    g.fillStyle = i % 2 ? '#FF6BD6' : '#5BE7FF'
    g.font = 'bold 52px "Segoe UI Symbol", "Segoe UI", sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(i % 3 ? '♪' : '♫', 32, 34)
    const tex = new CanvasTexture(c)
    tex.colorSpace = SRGBColorSpace
    return { mat: new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }), x: (i % 5 - 2) * 0.9, phase: i / 10 }
  }), [])
  const refs = useRef<(Sprite | null)[]>([])
  useFrame(state => {
    const t = state.clock.elapsedTime
    notes.forEach((n, i) => {
      const s = refs.current[i]
      if (!s) return
      const k = (t * 0.35 + n.phase) % 1
      s.position.set(n.x + Math.sin(t * 2 + i) * 0.25, 1.4 + k * 2.6, Math.cos(t + i) * 0.2)
      s.scale.setScalar(0.35 + k * 0.25)
      n.mat.opacity = Math.min(1, k * 5) * (1 - k)
    })
  })
  return <group position={[0, 0, -2.5]}>{notes.map((n, i) => <sprite key={i} ref={el => { refs.current[i] = el }} material={n.mat} />)}</group>
}

function NeonClub() {
  const setDistrict = useUI(s => s.setDistrict)
  const beams = useRef<Group>(null)
  const sign = useMemo(() => new MeshBasicMaterial({ map: signTexture2('NEON BEATS', 'CLUB · LIVE DJ', '#14081F', '#FF5FD2', 1024, 256), toneMapped: false }), [])
  const pink = useMemo(() => glow('#FF4FD8', 2.2), [])
  const cyan = useMemo(() => glow('#3BE2FF', 2.2), [])
  const beamMat = useMemo(() => new MeshBasicMaterial({ color: new Color(0.6, 0.9, 1.6), transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }), [])
  useFrame(state => {
    const t = state.clock.elapsedTime
    beams.current?.children.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.3 + i * 1.7) * 0.5; b.rotation.x = Math.cos(t * 1.1 + i) * 0.3 })
  })
  return (
    <group position={CLUB_POS} onDoubleClick={e => { e.stopPropagation(); setDistrict('club') }}>
      <Plaza w={16} d={14} color="#3A3F4D" repeat={1.6} />
      {/* building: dark facade panels, neon edges */}
      <group position={[0, 0, -3.4]}>
        <Box s={[12, 4.4, 6]} p={[0, 2.2, 0]} c="#262433" r={0.5} />
        {[-4.5, -1.5, 1.5, 4.5].map(px => <Box key={px} s={[2.6, 3.6, 0.08]} p={[px, 2.3, 3.03]} c="#302C40" r={0.35} />)}
        <mesh position={[0, 4.42, 3.04]} material={pink}><boxGeometry args={[12.1, 0.07, 0.07]} /></mesh>
        {[-6.02, 6.02].map(px => <mesh key={px} position={[px, 2.2, 3.04]} material={cyan}><boxGeometry args={[0.07, 4.4, 0.07]} /></mesh>)}
        <mesh position={[0, 3.55, 3.1]} material={sign}><planeGeometry args={[5.6, 1.4]} /></mesh>
        {/* entrance with canopy */}
        <Box s={[2.2, 2.4, 0.1]} p={[3.6, 1.2, 3.08]} c="#120E1A" r={0.2} />
        <mesh position={[3.6, 2.45, 3.1]} material={pink}><boxGeometry args={[2.3, 0.06, 0.06]} /></mesh>
        <Box s={[2.8, 0.12, 1.4]} p={[3.6, 2.65, 3.7]} c="#1A1724" r={0.4} />
      </group>
      {/* velvet rope queue and bouncer */}
      {[2.4, 3.6, 4.8].map(px => (
        <group key={px} position={[px, 0, 1.4]}>
          <mesh position={[0, 0.45, 0]} material={tint(GOLD, 0.3)}><cylinderGeometry args={[0.04, 0.06, 0.9, 10]} /></mesh>
        </group>
      ))}
      <mesh position={[3.6, 0.75, 1.4]} rotation-z={PI / 2} material={tint('#9B1B30', 0.6)}><cylinderGeometry args={[0.03, 0.03, 2.4, 8]} /></mesh>
      <ChibiHuman pos={[2.0, 0, 0.5]} rot={0.3} role="guest" action="idle" name="bao-ve" voice="bouncer" shirtColor="#111827" pantsColor="#111827" hair="short" />
      {[[3.2, 2.1], [4.0, 2.3], [4.8, 2.1]].map(([px, pz], i) => (
        <ChibiHuman key={i} pos={[px, 0, pz]} rot={PI * 0.85} role="guest" action="idle" name={`hang-${i}`} voice="queue" shirtColor={['#A855F7', '#F43F5E', '#14B8A6'][i]} />
      ))}
      {/* outdoor stage: LED dance floor, DJ booth, speakers, moving beams */}
      <group position={[-2.4, 0, 2.6]}>
        <DanceFloor />
        <MusicNotes />
        <group position={[0, 0, -2.5]}>
          <RoundedBox args={[4.2, 0.5, 1.4]} radius={0.05} position={[0, 0.25, 0]} material={tint('#1C1A24', 0.4)} castShadow />
          <Interactive name="Bàn DJ" hint="Bấm để chơi DJ nhịp điệu 🎧" onActivate={() => useUI.setState({ game: 'dj' })}>
            <RoundedBox args={[2.2, 0.9, 0.6]} radius={0.04} position={[0, 0.95, 0.25]} material={tint('#2A2735', 0.35)} castShadow />
            <mesh position={[0, 1.15, 0.56]} material={cyan}><boxGeometry args={[2.0, 0.05, 0.02]} /></mesh>
          </Interactive>
          <ChibiHuman pos={[0, 0.5, -0.2]} rot={0} role="dancer" action="dance" name="dj" voice="dj" shirtColor="#0EA5E9" hair="cap" />
          <ChibiHuman pos={[1.25, 0.5, 0.45]} rot={-0.25} role="dancer" action="sing" name="ca-si" voice="singer" shirtColor="#F43F5E" hair="long" />
          <Speaker x={-1.75} z={0} />
          <Speaker x={1.75} z={0} />
          {/* truss with moving beams */}
          {[-2.2, 2.2].map(px => <mesh key={px} position={[px, 1.8, -0.4]} material={M.darkMetal}><boxGeometry args={[0.1, 3.6, 0.1]} /></mesh>)}
          <mesh position={[0, 3.6, -0.4]} material={M.darkMetal}><boxGeometry args={[4.5, 0.1, 0.1]} /></mesh>
          <group ref={beams} position={[0, 3.55, -0.4]}>
            {[-1.6, -0.5, 0.5, 1.6].map(px => (
              <group key={px} position={[px, 0, 0]}>
                <mesh position={[0, -1.6, 0.6]} rotation-x={0.35} material={beamMat}><coneGeometry args={[0.5, 3.4, 16, 1, true]} /></mesh>
              </group>
            ))}
          </group>
        </group>
        {[[-1.2, 0.2], [0.4, -0.5], [1.4, 0.6], [-0.3, 1.1], [-2.0, -0.6]].map(([px, pz], i) => (
          <ChibiHuman key={i} pos={[px, 0.05, pz]} rot={PI + (i - 2) * 0.3} role="dancer" action="dance" name={`dancer-${i}`} voice="dancer"
            shirtColor={['#F43F5E', '#8B5CF6', '#F59E0B', '#22D3EE', '#84CC16'][i]} hair={(['long', 'short', 'bun', 'short', 'long'] as const)[i]} />
        ))}
      </group>
      <Tree x={6.6} z={5.6} s={0.8} dark />
    </group>
  )
}

/* ================================================================ campus */

export function RoboCityCampus() {
  return (
    <group>
      <RoboBistro />
      <CyberPagoda />
      <NeonClub />
    </group>
  )
}
