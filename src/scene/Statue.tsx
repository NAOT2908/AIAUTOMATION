import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending, CatmullRomCurve3, Color, DoubleSide, InstancedMesh, LatheGeometry, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, Object3D, SphereGeometry, TubeGeometry, Vector2, Vector3,
} from 'three'
import { sound } from '../audio/sound'
import { Interactive } from './interact'
import { tint } from './materials'

const v2 = (x: number, y: number) => new Vector2(x, y)
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z)
const tube = (pts: Vector3[], r: number, seg = 24) => new TubeGeometry(new CatmullRomCurve3(pts), seg, r, 10, false)

/** a lotus throne: two rings of upturned petals around a seed pod */
function LotusThrone({ radius = 0.62, outerColor = '#F2BFCB', innerColor = '#FAE1E7', baseColor = '#E9A9B8' }: { radius?: number; outerColor?: string; innerColor?: string; baseColor?: string }) {
  const outer = tint(outerColor, 0.45), inner = tint(innerColor, 0.4)
  const rings: [number, number, number, number, typeof outer][] = [
    // count, ring radius, tilt, height, material
    [16, radius, 0.95, 0.12, outer],
    [12, radius * 0.72, 0.55, 0.2, inner],
  ]
  return (
    <group>
      <mesh position={[0, 0.08, 0]} material={tint(baseColor, 0.5)} castShadow><cylinderGeometry args={[radius * 0.8, radius * 0.9, 0.16, 32]} /></mesh>
      {rings.map(([n, r, tilt, y, m], k) => Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + k * 0.2
        return (
          <group key={`${k}-${i}`} position={[Math.sin(a) * r, y, Math.cos(a) * r]} rotation-y={a}>
            <mesh rotation-x={tilt} position={[0, 0.12, 0]} scale={[0.15, 0.26, 0.06]} material={m} castShadow>
              <sphereGeometry args={[1, 14, 10]} />
            </mesh>
          </group>
        )
      }))}
      <mesh position={[0, 0.26, 0]} material={tint('#F6D98A', 0.5)}><cylinderGeometry args={[radius * 0.5, radius * 0.55, 0.06, 28]} /></mesh>
    </group>
  )
}

/**
 * Quan Thế Âm Bồ Tát standing on a lotus: white-jade robe turned on a lathe, hood falling over
 * the shoulders, the vase of pure water with a willow sprig in the left hand, the right hand
 * lowered in the gesture of giving, silk sashes, halo and a faint mandorla.
 */
export function GuanYin({ position, rot = 0, scale = 1.15 }: { position: [number, number, number]; rot?: number; scale?: number }) {
  const pulse = useRef(0)

  const m = useMemo(() => ({
    jade: new MeshPhysicalMaterial({ color: '#F5F1E8', roughness: 0.3, clearcoat: 0.45, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new Color('#FFF4E0') }),
    jadeShade: new MeshPhysicalMaterial({ color: '#ECE6DA', roughness: 0.38, clearcoat: 0.3, side: DoubleSide }),
    gold: new MeshStandardMaterial({ color: '#D9B25A', metalness: 0.7, roughness: 0.3 }),
    silk: new MeshPhysicalMaterial({ color: '#F3DCD6', roughness: 0.45, sheen: 0.6, sheenColor: new Color('#FFE6EC') }),
    leaf: tint('#6FAE5C', 0.6),
    feature: tint('#B49A86', 0.6),
    glow: new MeshBasicMaterial({ color: new Color(1.6, 1.25, 0.6), transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  }), [])

  const g = useMemo(() => ({
    // gown: hem flares at the feet, slim at the knees, waist, chest, shoulders, neck
    robe: new LatheGeometry([
      v2(0, 0), v2(0.44, 0), v2(0.47, 0.05), v2(0.42, 0.14), v2(0.36, 0.32), v2(0.31, 0.58), v2(0.27, 0.86),
      v2(0.22, 1.02), v2(0.23, 1.16), v2(0.25, 1.3), v2(0.27, 1.42), v2(0.22, 1.5), v2(0.1, 1.58), v2(0.075, 1.64), v2(0, 1.66),
    ], 48),
    // hood: covers the back of the head and falls over the shoulders, leaving the face open
    hood: new LatheGeometry([
      v2(0.0, 2.08), v2(0.12, 2.06), v2(0.2, 2.0), v2(0.23, 1.88), v2(0.24, 1.74), v2(0.28, 1.6), v2(0.33, 1.48), v2(0.36, 1.36), v2(0.37, 1.24),
    ], 40, Math.PI * 0.32, Math.PI * 1.36),
    vase: new LatheGeometry([v2(0, 0), v2(0.05, 0), v2(0.075, 0.05), v2(0.07, 0.1), v2(0.03, 0.15), v2(0.022, 0.21), v2(0.038, 0.24), v2(0.03, 0.25)], 24),
    armL: tube([v3(0.26, 1.44, 0), v3(0.32, 1.22, 0.04), v3(0.27, 1.12, 0.14), v3(0.14, 1.18, 0.22)], 0.055),
    armR: tube([v3(-0.26, 1.44, 0), v3(-0.32, 1.2, 0.03), v3(-0.31, 1.0, 0.08), v3(-0.26, 0.86, 0.14)], 0.055),
    sleeveL: new LatheGeometry([v2(0.05, 0), v2(0.08, -0.1), v2(0.12, -0.3), v2(0.14, -0.42), v2(0.11, -0.44)], 20),
    sleeveR: new LatheGeometry([v2(0.05, 0), v2(0.09, -0.12), v2(0.13, -0.34), v2(0.15, -0.5), v2(0.12, -0.52)], 20),
    sashL: tube([v3(0.24, 1.46, -0.04), v3(0.36, 1.2, 0.0), v3(0.42, 0.9, 0.06), v3(0.48, 0.6, 0.02), v3(0.52, 0.3, 0.06), v3(0.5, 0.12, 0.02)], 0.022, 40),
    sashR: tube([v3(-0.24, 1.46, -0.04), v3(-0.38, 1.18, 0.0), v3(-0.44, 0.86, 0.06), v3(-0.5, 0.56, 0.0), v3(-0.53, 0.28, 0.06), v3(-0.5, 0.12, 0.0)], 0.022, 40),
    sashFront: tube([v3(0.22, 1.2, 0.14), v3(0.0, 1.0, 0.27), v3(-0.22, 1.18, 0.15)], 0.024),
    willow: tube([v3(0.14, 1.43, 0.22), v3(0.16, 1.58, 0.24), v3(0.24, 1.7, 0.22), v3(0.3, 1.74, 0.2)], 0.008, 16),
  }), [])

  useFrame((_, dt) => {
    pulse.current = Math.max(0, pulse.current - dt * 0.6)
    m.glow.opacity = 0.18 + pulse.current * 0.5
  })

  return (
    <Interactive name="Tượng Quan Thế Âm Bồ Tát" hint="Bấm để thỉnh một tiếng chuông" position={position}
      onActivate={() => { pulse.current = 1; sound.playBell(0.5) }}>
      <group rotation-y={rot}>
        {/* octagonal stone pedestal */}
        <mesh position={[0, 0.18, 0]} material={tint('#CDBFA6', 0.85)} castShadow receiveShadow><cylinderGeometry args={[0.95, 1.02, 0.36, 8]} /></mesh>
        <mesh position={[0, 0.48, 0]} material={tint('#D8CCB4', 0.85)} castShadow receiveShadow><cylinderGeometry args={[0.78, 0.84, 0.24, 8]} /></mesh>
        <group position={[0, 0.6, 0]} scale={scale}>
          <LotusThrone />
          <group position={[0, 0.28, 0]}>
            {/* gown, hood, head */}
            <mesh geometry={g.robe} material={m.jade} castShadow />
            <mesh geometry={g.hood} material={m.jadeShade} castShadow />
            <mesh position={[0, 1.82, 0.01]} scale={[1, 1.14, 1]} material={m.jade} castShadow><sphereGeometry args={[0.165, 28, 22]} /></mesh>
            <mesh position={[0, 2.02, -0.02]} material={m.jade}><sphereGeometry args={[0.075, 16, 12]} /></mesh>
            {/* crown band with a small gold image in front */}
            <mesh position={[0, 1.93, 0]} rotation-x={-0.12} material={m.gold}><torusGeometry args={[0.16, 0.014, 8, 32]} /></mesh>
            <mesh position={[0, 1.98, 0.16]} material={m.gold}><coneGeometry args={[0.035, 0.09, 4]} /></mesh>
            {/* serene face: closed eyes, urna, small mouth, long ears */}
            {[-1, 1].map(s => (
              <mesh key={s} position={[s * 0.055, 1.83, 0.158]} rotation={[0, 0, Math.PI / 2]} material={m.feature}><torusGeometry args={[0.022, 0.004, 4, 12, Math.PI]} /></mesh>
            ))}
            <mesh position={[0, 1.885, 0.163]} material={m.gold}><sphereGeometry args={[0.009, 8, 6]} /></mesh>
            <mesh position={[0, 1.755, 0.158]} material={m.feature}><boxGeometry args={[0.04, 0.007, 0.004]} /></mesh>
            {[-1, 1].map(s => <mesh key={s} position={[s * 0.16, 1.79, 0]} scale={[0.035, 0.09, 0.04]} material={m.jade}><sphereGeometry args={[1, 10, 8]} /></mesh>)}
            {/* arms, wide sleeves, hands */}
            <mesh geometry={g.armL} material={m.jade} castShadow />
            <mesh geometry={g.armR} material={m.jade} castShadow />
            <mesh geometry={g.sleeveL} material={m.jadeShade} position={[0.3, 1.16, 0.06]} rotation-z={0.15} castShadow />
            <mesh geometry={g.sleeveR} material={m.jadeShade} position={[-0.31, 1.06, 0.08]} rotation-z={-0.08} castShadow />
            <mesh position={[0.13, 1.19, 0.23]} material={m.jade}><sphereGeometry args={[0.045, 12, 10]} /></mesh>
            <mesh position={[-0.25, 0.84, 0.16]} scale={[0.8, 1.15, 0.6]} material={m.jade}><sphereGeometry args={[0.05, 12, 10]} /></mesh>
            {/* vase of pure water with a willow sprig */}
            <group position={[0.14, 1.18, 0.22]}>
              <mesh geometry={g.vase} material={m.jade} castShadow />
            </group>
            <mesh geometry={g.willow} material={m.leaf} />
            {[0.2, 0.45, 0.7, 0.95].map(k => (
              <mesh key={k} position={[0.14 + k * 0.16, 1.43 + Math.sin(k * 2.6) * 0.3, 0.22 - k * 0.02]} rotation-z={0.9 - k} scale={[0.012, 0.045, 0.01]} material={m.leaf}><sphereGeometry args={[1, 6, 6]} /></mesh>
            ))}
            {/* silk sashes */}
            <mesh geometry={g.sashL} material={m.silk} castShadow />
            <mesh geometry={g.sashR} material={m.silk} castShadow />
            <mesh geometry={g.sashFront} material={m.silk} />
            {/* halo and mandorla */}
            <mesh position={[0, 1.86, -0.2]} material={m.gold}><torusGeometry args={[0.27, 0.014, 8, 48]} /></mesh>
            <mesh position={[0, 1.86, -0.21]} material={m.glow}><circleGeometry args={[0.27, 40]} /></mesh>
            <mesh position={[0, 1.0, -0.32]} scale={[0.62, 1.15, 1]} material={m.gold}><torusGeometry args={[0.9, 0.012, 6, 64]} /></mesh>
          </group>
        </group>
      </group>
    </Interactive>
  )
}

/* ---------------------------------------------------------------- Shakyamuni */

/** snail-shell curls over the scalp and the ushnisha, as one instanced mesh */
function Curls({ material }: { material: MeshStandardMaterial }) {
  const ref = useRef<InstancedMesh>(null)
  const spots = useMemo(() => {
    const out: Vector3[] = []
    // scalp: golden-angle spiral over the upper part of the head
    const n = 120
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 0.95
      if (y < 0.1) continue
      const r = Math.sqrt(1 - y * y), a = i * 2.39996
      const p = new Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
      if (p.z > 0.55 && p.y < 0.55) continue // keep the forehead clear
      out.push(new Vector3(p.x * 0.215, 1.42 + p.y * 0.24, p.z * 0.215))
    }
    // ushnisha
    for (let i = 0; i < 40; i++) {
      const y = 1 - (i / 39) * 1.1
      const r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996
      out.push(new Vector3(Math.cos(a) * r * 0.1, 1.68 + y * 0.09, Math.sin(a) * r * 0.1))
    }
    return out
  }, [])
  const geo = useMemo(() => new SphereGeometry(0.026, 8, 6), [])
  useEffect(() => {
    const m = ref.current!
    const o = new Object3D()
    spots.forEach((p, i) => { o.position.copy(p); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
    m.instanceMatrix.needsUpdate = true
  }, [spots])
  return <instancedMesh ref={ref} args={[geo, material, spots.length]} castShadow />
}

/**
 * Đức Phật Thích Ca seated in the lotus position on a lotus throne: hands in the meditation
 * mudra, robe over the left shoulder, snail-shell curls and ushnisha, long ears, urna, closed
 * eyes, a flaming halo and a large aureole behind the body. Gilded.
 */
export function Shakyamuni({ position, scale = 0.8, onActivate }: { position: [number, number, number]; scale?: number; onActivate?: () => void }) {
  const m = useMemo(() => ({
    gold: new MeshStandardMaterial({ color: '#D9A43B', metalness: 0.8, roughness: 0.28 }),
    goldDeep: new MeshStandardMaterial({ color: '#B98428', metalness: 0.8, roughness: 0.34 }),
    hair: new MeshStandardMaterial({ color: '#3A3F63', metalness: 0.4, roughness: 0.45 }),
    feature: new MeshStandardMaterial({ color: '#8A5A1E', metalness: 0.5, roughness: 0.5 }),
    flame: new MeshStandardMaterial({ color: '#E7B54A', metalness: 0.7, roughness: 0.3, emissive: new Color('#FFB23D'), emissiveIntensity: 0.25 }),
    glow: new MeshBasicMaterial({ color: new Color(1.4, 1.0, 0.45), transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  }), [])
  const g = useMemo(() => ({
    torso: new LatheGeometry([
      v2(0, 0.28), v2(0.36, 0.28), v2(0.37, 0.42), v2(0.31, 0.66), v2(0.33, 0.86), v2(0.37, 1.02), v2(0.33, 1.1), v2(0.2, 1.16), v2(0.1, 1.2), v2(0, 1.22),
    ], 44),
    // robe thrown over the left shoulder, across the chest, down to the right hip
    sash: tube([v3(0.3, 1.08, -0.05), v3(0.18, 1.02, 0.22), v3(-0.05, 0.86, 0.3), v3(-0.25, 0.66, 0.26), v3(-0.33, 0.5, 0.18)], 0.045, 32),
    fold1: tube([v3(0.34, 1.04, 0.0), v3(0.42, 0.8, 0.06), v3(0.44, 0.58, 0.1)], 0.03),
    armL: tube([v3(0.34, 1.02, 0), v3(0.43, 0.78, 0.06), v3(0.38, 0.52, 0.18), v3(0.14, 0.44, 0.28)], 0.075),
    armR: tube([v3(-0.34, 1.02, 0), v3(-0.43, 0.78, 0.06), v3(-0.38, 0.52, 0.18), v3(-0.14, 0.44, 0.28)], 0.072),
    lapFolds: [0.36, 0.46, 0.56].map(r => new TubeGeometry(new CatmullRomCurve3(
      Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (0.12 + 0.76 * (i / 8)); return v3(Math.cos(a) * r * 1.35, 0.33, Math.sin(a) * r * 0.85) }),
    ), 24, 0.012, 6, false)),
  }), [])
  const flames = useMemo(() => Array.from({ length: 18 }, (_, i) => (i / 18) * Math.PI * 2), [])
  return (
    <Interactive name="Đức Phật Thích Ca Mâu Ni" hint="Ngồi kiết già, tay ấn thiền định · bấm để thỉnh chuông" position={position} onActivate={onActivate}>
      <group scale={scale}>
        <LotusThrone radius={0.82} outerColor="#C23B32" innerColor="#E8B04A" baseColor="#8E2A22" />
        <group position={[0, 0.3, 0]}>
          {/* crossed legs: lap, knees, upturned soles */}
          <mesh position={[0, 0.2, 0.1]} scale={[0.66, 0.2, 0.42]} material={m.gold} castShadow><sphereGeometry args={[1, 28, 16]} /></mesh>
          {[-1, 1].map(sx => (
            <group key={sx}>
              <mesh position={[sx * 0.5, 0.17, 0.2]} scale={[0.2, 0.15, 0.22]} material={m.gold} castShadow><sphereGeometry args={[1, 16, 12]} /></mesh>
              <mesh position={[sx * 0.2, 0.3, 0.28]} rotation-y={sx * 0.4} scale={[0.12, 0.05, 0.07]} material={m.goldDeep}><sphereGeometry args={[1, 12, 8]} /></mesh>
            </group>
          ))}
          {g.lapFolds.map((geo, i) => <mesh key={i} geometry={geo} material={m.goldDeep} />)}
          {/* torso, robe, arms, hands in dhyana mudra */}
          <mesh geometry={g.torso} material={m.gold} castShadow />
          <mesh geometry={g.sash} material={m.goldDeep} castShadow />
          <mesh geometry={g.fold1} material={m.goldDeep} />
          <mesh geometry={g.armL} material={m.gold} castShadow />
          <mesh geometry={g.armR} material={m.gold} castShadow />
          <mesh position={[0, 0.44, 0.3]} scale={[0.2, 0.05, 0.12]} material={m.gold}><sphereGeometry args={[1, 16, 10]} /></mesh>
          <mesh position={[0, 0.5, 0.36]} rotation-x={Math.PI / 2} material={m.gold}><torusGeometry args={[0.04, 0.012, 6, 14]} /></mesh>
          {/* neck with the three folds of beauty */}
          <mesh position={[0, 1.24, 0]} material={m.gold}><cylinderGeometry args={[0.085, 0.1, 0.1, 18]} /></mesh>
          {[1.21, 1.25].map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2} material={m.goldDeep}><torusGeometry args={[0.093, 0.006, 4, 20]} /></mesh>)}
          {/* head */}
          <mesh position={[0, 1.42, 0.0]} scale={[1, 1.12, 1]} material={m.gold} castShadow><sphereGeometry args={[0.2, 32, 24]} /></mesh>
          <Curls material={m.hair} />
          <mesh position={[0, 1.74, 0]} material={m.flame}><coneGeometry args={[0.035, 0.12, 10]} /></mesh>
          {[-1, 1].map(sx => <mesh key={sx} position={[sx * 0.2, 1.36, 0.0]} scale={[0.04, 0.13, 0.055]} material={m.gold}><sphereGeometry args={[1, 10, 8]} /></mesh>)}
          {[-1, 1].map(sx => (
            <mesh key={sx} position={[sx * 0.068, 1.44, 0.188]} rotation-z={Math.PI} material={m.feature}><torusGeometry args={[0.028, 0.005, 4, 12, Math.PI]} /></mesh>
          ))}
          {[-1, 1].map(sx => <mesh key={sx} position={[sx * 0.068, 1.49, 0.18]} rotation-z={sx * 0.15} material={m.feature}><boxGeometry args={[0.07, 0.008, 0.005]} /></mesh>)}
          <mesh position={[0, 1.4, 0.205]} scale={[0.6, 1, 0.7]} material={m.gold}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
          <mesh position={[0, 1.515, 0.19]} material={m.feature}><sphereGeometry args={[0.011, 8, 6]} /></mesh>
          <mesh position={[0, 1.335, 0.19]} material={m.feature}><boxGeometry args={[0.05, 0.007, 0.005]} /></mesh>
          {/* flaming halo behind the head, large aureole behind the body */}
          <group position={[0, 1.44, -0.24]}>
            <mesh material={m.flame}><torusGeometry args={[0.34, 0.02, 8, 56]} /></mesh>
            <mesh material={m.glow}><circleGeometry args={[0.34, 48]} /></mesh>
            {flames.map(a => (
              <mesh key={a} position={[Math.cos(a) * 0.39, Math.sin(a) * 0.39, 0]} rotation-z={a - Math.PI / 2} material={m.flame}>
                <coneGeometry args={[0.035, 0.11, 6]} />
              </mesh>
            ))}
          </group>
          <group position={[0, 0.85, -0.34]} scale={[0.82, 1.05, 1]}>
            <mesh material={m.flame}><torusGeometry args={[0.92, 0.018, 8, 72]} /></mesh>
            <mesh material={m.glow}><circleGeometry args={[0.92, 56]} /></mesh>
          </group>
        </group>
      </group>
    </Interactive>
  )
}
