import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BoxGeometry, CanvasTexture, Color, Group, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three'
import { world } from './Atmosphere'
import { M, glow, tint } from './materials'

/**
 * Downtown: a skyline north of the metro, so it frames the city from behind and never hides it.
 * Facades are canvas window grids; at night a second texture lights random windows.
 */
type Style = 'glass' | 'office' | 'apartment' | 'hotel'
const CELL = { w: 1.6, h: 1.5 } // one window bay (world units)
const nightMats: MeshStandardMaterial[] = []

function facadeCanvas(style: Style, lit: boolean, seed: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const cols = 8, rows = 8, cw = 512 / cols, rh = 512 / rows
  let r = seed
  const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 }
  const wall = { glass: '#5E8FB8', office: '#D5D9DE', apartment: '#EFE6D6', hotel: '#E9E1D4' }[style]
  g.fillStyle = lit ? '#000' : wall
  g.fillRect(0, 0, 512, 512)
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const px = x * cw, py = y * rh
    if (style === 'glass') {
      if (lit) { if (rand() < 0.42) { g.fillStyle = rand() < 0.8 ? '#FFD58A' : '#BFE3FF'; g.fillRect(px + 2, py + 3, cw - 4, rh - 8) } continue }
      const grd = g.createLinearGradient(px, py, px + cw, py + rh)
      grd.addColorStop(0, '#7FB2DA'); grd.addColorStop(1, '#3E6E99')
      g.fillStyle = grd
      g.fillRect(px + 2, py + 3, cw - 4, rh - 8)
      g.fillStyle = 'rgba(255,255,255,0.22)'
      g.fillRect(px + 2, py + 3, (cw - 4) * 0.35, rh - 8)
    } else {
      const ww = cw * (style === 'office' ? 0.78 : 0.5), wh = rh * (style === 'office' ? 0.62 : 0.55)
      const ox = px + (cw - ww) / 2, oy = py + rh * 0.18
      if (lit) { if (rand() < 0.38) { g.fillStyle = '#FFCF7A'; g.fillRect(ox, oy, ww, wh) } continue }
      g.fillStyle = style === 'office' ? '#3D5A7A' : '#4B6378'
      g.fillRect(ox, oy, ww, wh)
      g.fillStyle = 'rgba(255,255,255,0.25)'
      g.fillRect(ox, oy, ww * 0.3, wh)
      if (style === 'apartment' || style === 'hotel') {
        // balcony slab and railing under each window
        g.fillStyle = 'rgba(0,0,0,0.12)'
        g.fillRect(px + 4, py + rh * 0.8, cw - 8, rh * 0.07)
        g.strokeStyle = 'rgba(60,60,60,0.45)'
        g.lineWidth = 2
        for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(px + 8 + k * (cw - 16) / 5, py + rh * 0.8); g.lineTo(px + 8 + k * (cw - 16) / 5, py + rh * 0.66); g.stroke() }
        if (style === 'apartment' && rand() < 0.25) { g.fillStyle = ['#E57373', '#64B5F6', '#FFF176', '#81C784'][Math.floor(rand() * 4)]; g.fillRect(px + cw * 0.6, py + rh * 0.62, 6, 10) } // laundry
      }
    }
  }
  if (!lit && style !== 'glass') {
    g.fillStyle = 'rgba(0,0,0,0.06)'
    for (let y = 0; y < rows; y++) g.fillRect(0, y * rh, 512, 3)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 8
  return t
}

const texCache = new Map<string, CanvasTexture>()
function facadeTex(style: Style, lit: boolean, seed: number) {
  const k = `${style}${lit}${seed % 3}`
  if (!texCache.has(k)) texCache.set(k, facadeCanvas(style, lit, 7 + (seed % 3) * 101))
  return texCache.get(k)!
}

function facadeMat(style: Style, span: number, h: number, seed: number) {
  const map = facadeTex(style, false, seed).clone(), em = facadeTex(style, true, seed).clone()
  const rx = span / CELL.w / 8, ry = h / CELL.h / 8
  for (const t of [map, em]) { t.repeat.set(rx, ry); t.needsUpdate = true }
  const m = new MeshStandardMaterial({
    map, emissiveMap: em, emissive: new Color('#FFFFFF'), emissiveIntensity: 0,
    roughness: style === 'glass' ? 0.12 : 0.75, metalness: style === 'glass' ? 0.55 : 0.05,
  })
  nightMats.push(m)
  return m
}

interface TowerProps { x: number; z: number; w: number; d: number; h: number; style: Style; seed?: number; crown?: 'spire' | 'pool' | 'helipad' | 'antenna' | 'none' }

function Tower({ x, z, w, d, h, style, seed = 0, crown = 'none' }: TowerProps) {
  const mats = useMemo(() => {
    const sideX = facadeMat(style, d, h, seed), sideZ = facadeMat(style, w, h, seed + 1)
    const roof = tint('#B9BEC5', 0.8)
    // box face order: +x, -x, +y, -y, +z, -z
    return [sideX, sideX, roof, roof, sideZ, sideZ]
  }, [w, d, h, style, seed])
  const geo = useMemo(() => new BoxGeometry(w, h, d), [w, h, d])
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geo} material={mats} position={[0, h / 2, 0]} castShadow receiveShadow />
      {/* plinth / lobby */}
      <mesh position={[0, 1.1, 0]} material={tint('#3B4552', 0.4)}><boxGeometry args={[w + 0.3, 2.2, d + 0.3]} /></mesh>
      <mesh position={[0, h + 0.25, 0]} material={tint('#9AA1AA', 0.7)}><boxGeometry args={[w + 0.2, 0.5, d + 0.2]} /></mesh>
      {crown === 'antenna' && <mesh position={[0, h + 3, 0]} material={M.metal}><cylinderGeometry args={[0.08, 0.15, 5, 8]} /></mesh>}
      {crown === 'pool' && (
        <group position={[0, h + 0.55, 0]}>
          <mesh position={[-w * 0.15, 0.02, 0]} material={tint('#38BDF8', 0.1)}><boxGeometry args={[w * 0.5, 0.1, d * 0.6]} /></mesh>
          {[-1, 1].map(s => <mesh key={s} position={[w * 0.28, 0.4, s * d * 0.2]} material={tint('#F97316', 0.6)}><coneGeometry args={[0.8, 0.5, 12]} /></mesh>)}
        </group>
      )}
      {crown === 'helipad' && (
        <group position={[0, h + 0.55, 0]}>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} material={tint('#334155', 0.7)}><circleGeometry args={[Math.min(w, d) * 0.4, 32]} /></mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]} material={M.white}><ringGeometry args={[Math.min(w, d) * 0.33, Math.min(w, d) * 0.36, 32]} /></mesh>
        </group>
      )}
    </group>
  )
}

/** the city's landmark: a bundle of glass shafts stepping up to a spire with a blinking beacon */
function Landmark({ x, z }: { x: number; z: number }) {
  const beacon = useMemo(() => glow('#FF3B3B', 3), [])
  const crown = useMemo(() => glow('#9FD8FF', 1.2), [])
  useFrame(state => { beacon.emissiveIntensity = Math.sin(state.clock.elapsedTime * 3) > 0 ? 4 : 0.3; crown.emissiveIntensity = 0.4 + world.night * 2.2 })
  const shafts: [number, number, number][] = [[-2.4, -2.4, 34], [2.4, -2.4, 42], [-2.4, 2.4, 46], [2.4, 2.4, 38], [0, 0, 56]]
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[13, 3, 13]} radius={0.3} position={[0, 1.5, 0]} material={tint('#2F3A47', 0.4)} castShadow />
      {shafts.map(([sx, sz, h], i) => <Tower key={i} x={sx} z={sz} w={4.6} d={4.6} h={h} style="glass" seed={i} />)}
      <mesh position={[0, 58, 0]} material={crown}><coneGeometry args={[2.2, 6, 4]} /></mesh>
      <mesh position={[0, 64, 0]} material={M.metal}><cylinderGeometry args={[0.1, 0.25, 8, 8]} /></mesh>
      <mesh position={[0, 68.2, 0]} material={beacon}><sphereGeometry args={[0.35, 10, 8]} /></mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- river + bridge + boats */

const RIVER_Z = -54.5, RIVER_W = 6

function Boat({ lane, speed, color, phase }: { lane: number; speed: number; color: string; phase: number }) {
  const ref = useRef<Group>(null)
  useFrame(state => {
    const g = ref.current
    if (!g) return
    const span = 140
    const d = ((state.clock.elapsedTime * Math.abs(speed) + phase) % span)
    g.position.set(speed > 0 ? -70 + d : 70 - d, -0.2, RIVER_Z + lane)
    g.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2
    g.rotation.z = Math.sin(state.clock.elapsedTime * 1.4 + phase) * 0.03
  })
  return (
    <group ref={ref}>
      <RoundedBox args={[1.3, 0.5, 3.4]} radius={0.2} position={[0, 0.2, 0]} material={tint(color, 0.5)} castShadow />
      <RoundedBox args={[1.0, 0.6, 1.4]} radius={0.12} position={[0, 0.7, -0.3]} material={M.white} castShadow />
      <mesh position={[0, 0.75, 0.42]} material={M.screenFrame}><boxGeometry args={[0.9, 0.25, 0.04]} /></mesh>
    </group>
  )
}

function CableBridge({ x }: { x: number }) {
  const cables = useMemo(() => {
    const out: { mid: Vector3; len: number; rot: number }[] = []
    for (const side of [-1, 1]) for (let k = 1; k <= 4; k++) {
      const top = new Vector3(0, 11, 0), deck = new Vector3(0, 1.1, side * k * 1.5)
      out.push({ mid: top.clone().lerp(deck, 0.5), len: top.distanceTo(deck), rot: Math.atan2(top.z - deck.z, top.y - deck.y) })
    }
    return out
  }, [])
  return (
    <group position={[x, 0, RIVER_Z]}>
      <mesh position={[0, 0.85, 0]} material={tint('#9CA3AF', 0.8)} castShadow receiveShadow><boxGeometry args={[4.4, 0.4, RIVER_W + 6]} /></mesh>
      <mesh position={[0, 1.07, 0]} material={tint('#4B5563', 0.9)}><boxGeometry args={[3.6, 0.05, RIVER_W + 6]} /></mesh>
      {[-1, 1].map(s => (
        <group key={s} position={[s * 2.1, 0, 0]}>
          <mesh position={[0, 6, 0]} material={tint('#E5E7EB', 0.6)} castShadow><boxGeometry args={[0.5, 12, 0.7]} /></mesh>
          {cables.map((c, i) => (
            <mesh key={i} position={c.mid} rotation-x={c.rot} material={tint('#F8FAFC', 0.4)}><cylinderGeometry args={[0.03, 0.03, c.len, 4]} /></mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function River() {
  const water = useMemo(() => new MeshStandardMaterial({ color: '#4A8FA8', roughness: 0.1, metalness: 0.35 }), [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[5, -0.11, RIVER_Z]} material={tint('#B9B2A3', 0.9)} receiveShadow><planeGeometry args={[150, RIVER_W + 2]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[5, -0.1, RIVER_Z]} material={water}><planeGeometry args={[150, RIVER_W]} /></mesh>
      <CableBridge x={13.4} />
      <Boat lane={-1.4} speed={5} color="#DC2626" phase={0} />
      <Boat lane={1.4} speed={-4} color="#2563EB" phase={60} />
      <Boat lane={-1.4} speed={6} color="#F59E0B" phase={95} />
    </group>
  )
}

/* ---------------------------------------------------------------- streets + blocks */

function Streets() {
  const asphalt = tint('#6B727B', 0.9)
  const roads: [number, number, number, number][] = [ // x, z, w, d
    [13.4, -76, 3.6, 46], [5, -69, 140, 3.4], [5, -86.5, 140, 3.4], [-31, -78, 3.4, 30], [40, -78, 3.4, 30],
  ]
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[5, -0.115, -78]} material={tint('#CFC8BB', 0.9)} receiveShadow><planeGeometry args={[150, 40]} /></mesh>
      {roads.map(([x, z, w, d], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, -0.1, z]} material={asphalt} receiveShadow><planeGeometry args={[w, d]} /></mesh>
      ))}
    </group>
  )
}

export function Downtown() {
  useFrame(() => {
    // windows light up after dusk (and a little under rain clouds)
    const k = Math.min(1, world.night * 1.15 + world.rain * 0.15)
    for (const m of nightMats) m.emissiveIntensity = k * 1.3
  })
  return (
    <group>
      <River />
      <Streets />
      {/* front row: homes and the hotel */}
      <Tower x={-40} z={-62} w={8} d={5} h={16} style="apartment" seed={1} />
      <Tower x={-27} z={-62} w={8} d={5} h={20} style="apartment" seed={2} />
      <Tower x={-15} z={-62} w={7} d={5} h={14} style="apartment" seed={3} />
      <Tower x={0} z={-62.5} w={8} d={6} h={24} style="office" seed={4} crown="antenna" />
      <Tower x={27} z={-62.5} w={9} d={6} h={28} style="hotel" seed={5} crown="pool" />
      <Tower x={46} z={-62} w={8} d={5} h={18} style="apartment" seed={6} />
      {/* middle row: the landmark and glass towers */}
      <Tower x={-40} z={-78} w={8} d={8} h={30} style="office" seed={7} />
      <Tower x={-21} z={-78} w={9} d={9} h={38} style="glass" seed={8} crown="helipad" />
      <Landmark x={2} z={-78} />
      <Tower x={28} z={-78} w={9} d={9} h={44} style="glass" seed={9} crown="antenna" />
      <Tower x={50} z={-78} w={8} d={8} h={32} style="office" seed={10} />
      {/* back row */}
      {[-44, -28, -12, 22, 34, 52].map((x, i) => (
        <Tower key={x} x={x} z={-94} w={8} d={7} h={22 + (i % 3) * 7} style={i % 2 ? 'office' : 'glass'} seed={11 + i} />
      ))}
    </group>
  )
}
