import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CapsuleGeometry, Group, SphereGeometry, TorusGeometry } from 'three'
import { sound } from '../audio/sound'
import { speakers, type Voice } from './chatter'
import { M, glow, tint } from './materials'

export type HumanRole = 'monk' | 'buddhist' | 'guest' | 'dancer' | 'office' | 'chef'
export type HumanAction =
  | 'idle' | 'walk' | 'type' | 'eat' | 'dance'
  /** standing with palms together (chắp tay) */
  | 'bow'
  /** lotus seat, palms together, slow breathing */
  | 'meditate'
  /** kneeling full bows (lạy) */
  | 'prostrate'
  /** lotus seat, tapping the wooden fish (gõ mõ) on the beat */
  | 'chant'
  /** standing at the bell, pulling the striker log */
  | 'ring'
  /** sitting on a chair or stool */
  | 'sit'
  /** walking with a tray held out in front */
  | 'carry'
  /** standing, tray held out */
  | 'hold'
  /** singing into a microphone, swaying */
  | 'sing'
export type Hair = 'short' | 'bun' | 'long' | 'bald' | 'cap' | 'nonla'

interface HumanProps {
  pos: [number, number, number]
  role: HumanRole
  rot?: number
  name?: string
  skinTone?: string
  shirtColor?: string
  pantsColor?: string
  hair?: Hair
  action?: HumanAction
  /** seat height for 'sit' / 'eat' */
  seat?: number
  /** beat period in seconds for 'chant' (shared with the pagoda's sound) */
  beat?: number
  /** registers this person with the city's chatter under `name` */
  voice?: Voice
  /** people at the same table talk to each other */
  table?: string
  /** áo dài: a long tunic with front and back panels over white trousers */
  outfit?: 'aodai'
  /** a street vendor's shoulder pole with two baskets */
  carryPole?: boolean
}

/* shared geometry: every person reuses the same handful of buffers */
const G = {
  head: new SphereGeometry(0.27, 24, 18),
  hairCap: new SphereGeometry(0.285, 24, 14, 0, Math.PI * 2, 0, Math.PI / 1.85),
  bun: new SphereGeometry(0.1, 12, 10),
  eye: new SphereGeometry(0.032, 10, 8),
  glint: new SphereGeometry(0.011, 6, 6),
  ear: new SphereGeometry(0.05, 10, 8),
  limb: new CapsuleGeometry(0.068, 0.2, 6, 12),
  leg: new CapsuleGeometry(0.078, 0.24, 6, 12),
  hand: new SphereGeometry(0.058, 10, 8),
  shoe: new CapsuleGeometry(0.06, 0.1, 4, 10),
  mouth: new TorusGeometry(0.035, 0.008, 6, 12, Math.PI),
  beads: new TorusGeometry(0.15, 0.022, 8, 24),
}
const ROBE = { monk: '#8A5A33', saffron: '#C9781E', lam: '#7E93AB' }
const HAIR = '#1E1A17'
const rad = (d: number) => (d * Math.PI) / 180

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }

/**
 * Chibi person with a proper little rig: hips, a torso that can bend, shoulders, legs.
 * Proportions and the "big head, small body" read follow khanh020905/my-office's chibi-rig.
 */
export function ChibiHuman({
  pos, role, rot = 0, name = '', skinTone = '#F3C9A5', shirtColor = '#2563EB', pantsColor = '#334155',
  hair, action = 'idle', seat = 0.45, beat = 0.9, voice, table, outfit, carryPole,
}: HumanProps) {
  const root = useRef<Group>(null)
  const hips = useRef<Group>(null)
  const upper = useRef<Group>(null)
  const head = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const [greet, setGreet] = useState(false)

  const seatedPose = action === 'meditate' || action === 'chant' || action === 'sit' || action === 'eat' || action === 'prostrate'
  useEffect(() => {
    if (!voice || !root.current) return
    const id = name || `p-${pos.join(',')}`
    speakers.set(id, { obj: root.current, voice, table, head: seatedPose ? 1.35 : 1.75 })
    return () => { speakers.delete(id) }
  }, [voice, table, name, seatedPose]) // eslint-disable-line react-hooks/exhaustive-deps

  const robed = role === 'monk' || role === 'buddhist'
  const seed = useMemo(() => hash(name + pos.join(',')), [name, pos])
  const style: Hair = hair ?? (role === 'monk' ? 'bald' : role === 'chef' ? 'cap' : (['short', 'bun', 'long', 'short'] as Hair[])[seed % 4])
  const mats = useMemo(() => {
    const robe = role === 'monk' ? (seed % 3 === 0 ? ROBE.saffron : ROBE.monk) : ROBE.lam
    return {
      skin: tint(skinTone, 0.6),
      top: tint(robed ? robe : role === 'chef' ? '#F8FAFC' : shirtColor, 0.75),
      bottom: tint(robed ? robe : outfit === 'aodai' ? '#F8F6F0' : pantsColor, 0.8),
      hair: tint(HAIR, 0.85),
      shoe: tint(robed ? '#3B2A20' : '#22262E', 0.6),
      eye: tint('#15171C', 0.25),
      glint: M.white,
      blush: tint('#F6A5A5', 0.9),
      heart: glow('#FF4D6D', 2.6),
    }
  }, [role, robed, seed, skinTone, shirtColor, pantsColor, outfit])

  const seated = action === 'meditate' || action === 'chant' || action === 'sit' || action === 'eat'
  const lotus = action === 'meditate' || action === 'chant'
  const phase = (seed % 100) / 17

  useFrame(state => {
    const t = state.clock.elapsedTime + phase
    const r = root.current, h = hips.current, u = upper.current, hd = head.current
    const aL = armL.current, aR = armR.current, lL = legL.current, lR = legR.current
    if (!r || !h || !u || !hd || !aL || !aR || !lL || !lR) return
    // defaults
    let hipY = 0.46, pitch = 0, headX = 0, headY = 0, headZ = 0
    let al: [number, number, number] = [0, 0, 0.08], ar: [number, number, number] = [0, 0, -0.08]
    let ll: [number, number] = [0, 0], lr: [number, number] = [0, 0]
    let bob = 0, yaw = 0

    const palms = (): void => { al = [-0.98, 0, 0.79]; ar = [-0.98, 0, -0.79] }

    switch (action) {
      case 'walk': {
        const s = Math.sin(t * 7)
        ll = [s * 0.55, 0]; lr = [-s * 0.55, 0]
        al = [-s * 0.5, 0, 0.08]; ar = [s * 0.5, 0, -0.08]
        bob = Math.abs(Math.cos(t * 7)) * 0.04
        break
      }
      case 'type':
        al = [-1.2 + Math.sin(t * 16) * 0.08, 0, 0.35]; ar = [-1.2 + Math.sin(t * 16 + 1.4) * 0.08, 0, -0.35]
        headX = 0.12
        break
      case 'dance': {
        bob = Math.abs(Math.sin(t * 6)) * 0.14
        yaw = Math.sin(t * 3) * 0.4
        al = [-0.3, 0, 2.2 + Math.sin(t * 6) * 0.5]; ar = [-0.3, 0, -2.2 - Math.sin(t * 6) * 0.5]
        ll = [Math.sin(t * 6) * 0.3, 0]; lr = [-Math.sin(t * 6) * 0.3, 0]
        headX = Math.sin(t * 6) * 0.15
        break
      }
      case 'bow':
        palms()
        pitch = 0.08 + Math.max(0, Math.sin(t * 0.9)) * 0.35
        headX = 0.15
        break
      case 'meditate':
        palms()
        bob = Math.sin(t * 0.8) * 0.008
        headX = 0.12 + Math.sin(t * 0.8) * 0.03
        break
      case 'chant': {
        // left hand raised before the chest, right hand strikes the wooden fish on every beat
        const k = ((state.clock.elapsedTime % beat) / beat)
        const strike = k < 0.18 ? k / 0.18 : 1 - Math.min(1, (k - 0.18) / 0.5)
        al = [-1.15, 0, 0.62]
        ar = [-0.75 - (1 - strike) * 0.35, 0, -0.32]
        headX = 0.1 + strike * 0.03
        break
      }
      case 'prostrate': {
        // stand → kneel → forehead to the floor, every ~6 s
        const k = (t % 6) / 6
        const down = k < 0.3 ? k / 0.3 : k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4
        const e = down * down * (3 - 2 * down)
        hipY = 0.46 - e * 0.22
        ll = [e * 1.55, 0]; lr = [e * 1.55, 0]
        pitch = e * 1.25
        palms()
        if (e > 0.6) { al = [-2.4, 0, 0.35]; ar = [-2.4, 0, -0.35] }
        break
      }
      case 'ring': {
        // pull back, then swing the log into the bell (period matches the bell tower)
        const k = (state.clock.elapsedTime % 8) / 8
        const pull = k < 0.4 ? k / 0.4 : k < 0.5 ? 1 - (k - 0.4) / 0.1 : 0
        al = [-1.45 + pull * 0.4, 0, 0.2]; ar = [-1.45 + pull * 0.4, 0, -0.2]
        pitch = -pull * 0.25
        break
      }
      case 'carry':
      case 'hold': {
        if (action === 'carry') {
          const s = Math.sin(t * 7)
          ll = [s * 0.5, 0]; lr = [-s * 0.5, 0]
          bob = Math.abs(Math.cos(t * 7)) * 0.03
        }
        al = [-1.3, 0, 0.12]; ar = [-1.3, 0, -0.12]
        break
      }
      case 'sing': {
        bob = Math.abs(Math.sin(t * 4)) * 0.05
        yaw = Math.sin(t * 2) * 0.3
        ar = [-2.1, 0, -0.45]
        al = [-0.4 + Math.sin(t * 4) * 0.3, 0, 0.7 + Math.sin(t * 2) * 0.4]
        headX = -0.1 + Math.sin(t * 4) * 0.06
        ll = [Math.sin(t * 4) * 0.12, 0]; lr = [-Math.sin(t * 4) * 0.12, 0]
        break
      }
      case 'eat':
        ar = [-1.35 + Math.max(0, Math.sin(t * 2.4)) * 0.6, 0, -0.2]
        al = [-1.0, 0, 0.3]
        headX = 0.18 + Math.max(0, Math.sin(t * 2.4)) * 0.08
        break
      case 'sit':
        al = [-0.5, 0, 0.18]; ar = [-0.5, 0, -0.18]
        headY = Math.sin(t * 0.6) * 0.3
        break
      default:
        headY = Math.sin(t * 0.7) * 0.2
        bob = Math.sin(t * 1.6) * 0.006
    }

    if (seated) {
      if (lotus) {
        hipY = 0.2
        ll = [-1.45, -0.55]; lr = [-1.45, 0.55]
      } else {
        hipY = seat + 0.04
        ll = [-1.5, 0]; lr = [-1.5, 0]
      }
    }

    h.position.y = hipY + bob
    u.rotation.x = pitch
    hd.rotation.set(headX, headY, headZ)
    aL.rotation.set(al[0], al[1], al[2])
    aR.rotation.set(ar[0], ar[1], ar[2])
    lL.rotation.set(ll[0], ll[1], 0)
    lR.rotation.set(lr[0], lr[1], 0)
    r.rotation.y = rot + yaw
  })

  const onClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    sound.playBeep(robed ? 520 : 680, 0.12)
    setGreet(true)
    setTimeout(() => setGreet(false), 2000)
  }

  const leg = (side: -1 | 1, ref: typeof legL) => (
    <group ref={ref} position={[side * 0.1, 0, 0]}>
      <mesh geometry={G.leg} material={mats.bottom} position={[0, -0.2, 0]} castShadow />
      <mesh geometry={G.shoe} material={mats.shoe} position={[0, -0.41, 0.05]} rotation-x={Math.PI / 2} castShadow />
    </group>
  )
  const arm = (side: -1 | 1, ref: typeof armL) => (
    <group ref={ref} position={[side * 0.25, 0.36, 0]}>
      <mesh geometry={G.limb} material={mats.top} position={[0, -0.14, 0]} castShadow />
      <mesh geometry={G.hand} material={mats.skin} position={[0, -0.29, 0]} />
      {action === 'sing' && side === 1 && (
        <group position={[0, -0.36, 0.02]}>
          <mesh material={M.black}><cylinderGeometry args={[0.025, 0.02, 0.16, 8]} /></mesh>
          <mesh position={[0, -0.1, 0]} material={M.metal}><sphereGeometry args={[0.045, 10, 8]} /></mesh>
        </group>
      )}
    </group>
  )

  return (
    <group ref={root} position={pos} rotation-y={rot} onClick={onClick}>
      <group ref={hips} position={[0, 0.46, 0]}>
        {leg(-1, legL)}
        {leg(1, legR)}
        {/* lap of the robe when sitting cross-legged; a long skirt when standing */}
        {robed && (lotus
          ? <mesh material={mats.bottom} position={[0, -0.04, 0.12]} scale={[0.36, 0.11, 0.3]} castShadow><sphereGeometry args={[1, 20, 12]} /></mesh>
          : !seated && <mesh material={mats.bottom} position={[0, -0.2, 0]} castShadow><cylinderGeometry args={[0.2, 0.27, 0.46, 20]} /></mesh>)}

        {outfit === 'aodai' && !seated && [-1, 1].map(s => (
          <mesh key={s} material={mats.top} position={[0, -0.24, s * 0.14]} castShadow><boxGeometry args={[0.36, 0.52, 0.025]} /></mesh>
        ))}
        <group ref={upper}>
          {/* torso */}
          <mesh material={mats.top} position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.22, 0.42, 20]} />
          </mesh>
          <mesh material={mats.top} position={[0, 0.41, 0]} scale={[1, 0.45, 0.85]} castShadow><sphereGeometry args={[0.2, 18, 10]} /></mesh>
          {/* monk's outer robe: a sash across one shoulder */}
          {role === 'monk' && (
            <mesh material={tint('#6E4426', 0.8)} position={[0.02, 0.24, 0]} rotation-z={rad(-28)} scale={[1, 1, 1.08]}><cylinderGeometry args={[0.215, 0.225, 0.13, 20]} /></mesh>
          )}
          {robed && <mesh geometry={G.beads} material={tint('#4A2C17', 0.6)} position={[0, 0.3, 0.12]} rotation-x={rad(70)} />}
          {role === 'chef' && <mesh material={tint('#E2E8F0', 0.7)} position={[0, 0.15, 0.19]} scale={[1, 1, 0.3]}><boxGeometry args={[0.3, 0.34, 0.1]} /></mesh>}
          {arm(-1, armL)}
          {arm(1, armR)}

          <group ref={head} position={[0, 0.75, 0]}>
            <mesh geometry={G.head} material={mats.skin} castShadow />
            {[-1, 1].map(s => <mesh key={s} geometry={G.ear} material={mats.skin} position={[s * 0.265, -0.02, 0]} />)}
            {/* face */}
            {[-1, 1].map(s => (
              <group key={s} position={[s * 0.095, 0.0, 0.245]}>
                <mesh geometry={G.eye} material={mats.eye} scale={[1, 1.25, 0.6]} />
                <mesh geometry={G.glint} material={mats.glint} position={[0.01, 0.014, 0.018]} />
                <mesh material={mats.hair} position={[0, 0.07, -0.01]} rotation-z={s * -0.12}><boxGeometry args={[0.07, 0.014, 0.012]} /></mesh>
                <mesh material={mats.blush} position={[s * 0.06, -0.06, -0.012]} scale={[1, 0.6, 0.3]}><sphereGeometry args={[0.032, 8, 6]} /></mesh>
              </group>
            ))}
            <mesh geometry={G.mouth} material={tint('#9B4B4B', 0.6)} position={[0, -0.08, 0.255]} rotation-z={Math.PI} />
            {/* hair */}
            {style === 'short' && <mesh geometry={G.hairCap} material={mats.hair} position={[0, 0.02, -0.02]} rotation-x={-0.25} castShadow />}
            {style === 'bun' && (<>
              <mesh geometry={G.hairCap} material={mats.hair} position={[0, 0.02, -0.02]} rotation-x={-0.25} castShadow />
              <mesh geometry={G.bun} material={mats.hair} position={[0, 0.2, -0.2]} castShadow />
            </>)}
            {style === 'long' && (<>
              <mesh geometry={G.hairCap} material={mats.hair} position={[0, 0.02, -0.02]} rotation-x={-0.25} castShadow />
              <mesh material={mats.hair} position={[0, -0.18, -0.12]} scale={[1, 1.4, 0.55]} castShadow><sphereGeometry args={[0.24, 16, 12]} /></mesh>
            </>)}
            {style === 'nonla' && (<>
              <mesh geometry={G.hairCap} material={mats.hair} position={[0, 0.02, -0.02]} rotation-x={-0.25} castShadow />
              <mesh material={mats.hair} position={[0, -0.18, -0.12]} scale={[1, 1.4, 0.55]} castShadow><sphereGeometry args={[0.24, 16, 12]} /></mesh>
              <mesh material={tint('#E6CF8E', 0.85)} position={[0, 0.3, 0]} castShadow><coneGeometry args={[0.46, 0.26, 28]} /></mesh>
            </>)}
            {style === 'cap' && (<>
              <mesh material={M.white} position={[0, 0.24, 0]} castShadow><cylinderGeometry args={[0.2, 0.22, 0.26, 18]} /></mesh>
              <mesh material={M.white} position={[0, 0.38, 0]} scale={[1, 0.55, 1]}><sphereGeometry args={[0.24, 16, 10]} /></mesh>
            </>)}
          </group>
        </group>
      </group>

      {carryPole && (
        <group position={[0.2, 0.98, 0]}>
          <mesh rotation-x={Math.PI / 2} material={tint('#B08A4E', 0.8)} castShadow><cylinderGeometry args={[0.025, 0.025, 1.7, 6]} /></mesh>
          {[-0.8, 0.8].map(x => (
            <group key={x} position={[0, 0, x]}>
              {[-1, 1].map(s => <mesh key={s} position={[s * 0.1, -0.33, 0]} material={tint('#7A5A33', 0.9)}><cylinderGeometry args={[0.006, 0.006, 0.66, 4]} /></mesh>)}
              <mesh position={[0, -0.72, 0]} material={tint('#A07C46', 0.9)} castShadow><cylinderGeometry args={[0.2, 0.15, 0.2, 14]} /></mesh>
              {[0, 1, 2].map(k => (
                <mesh key={k} position={[Math.cos(k * 2.1) * 0.08, -0.58, Math.sin(k * 2.1) * 0.08]} material={tint(x < 0 ? '#F59E0B' : '#84CC16', 0.6)}><sphereGeometry args={[0.07, 8, 6]} /></mesh>
              ))}
            </group>
          ))}
        </group>
      )}
      {greet && <mesh material={mats.heart} position={[0, 1.75, 0]}><sphereGeometry args={[0.09, 12, 10]} /></mesh>}
    </group>
  )
}
