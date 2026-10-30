import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Mountains framing the city from behind (north and west only — the camera looks from the
 * south-east, so nothing here can hide the city): limestone karsts, a high range whose far
 * peaks carry snow, and a forest at their feet. Everything is merged/instanced: 3 draw calls.
 */

function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

const FOREST = new Color('#4F8A4A'), FOREST_DARK = new Color('#3E7140'), ROCK = new Color('#8C8C84'), ROCK_DARK = new Color('#6E6F6A'), SNOW = new Color('#F4F7FA')
const KARST_TOP = new Color('#5E9A55'), KARST_ROCK = new Color('#A9A69B')

/** a jagged low-poly peak, coloured by height: forest, rock, then snow if it is tall enough */
function peak(x: number, z: number, r: number, h: number, rand: () => number, snowLine: number) {
  const g = new ConeGeometry(r, h, 9, 5).toNonIndexed()
  const pos = g.attributes.position as BufferAttribute
  const col = new Float32Array(pos.count * 3)
  const c = new Color()
  // displace each ring a little, but keep coincident vertices together
  const jitter = new Map<string, [number, number, number]>()
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i)
    const key = `${px.toFixed(3)},${py.toFixed(3)},${pz.toFixed(3)}`
    if (!jitter.has(key)) {
      const top = py > h / 2 - 0.01
      jitter.set(key, top ? [(rand() - 0.5) * r * 0.2, 0, (rand() - 0.5) * r * 0.2] : [(rand() - 0.5) * r * 0.22, (rand() - 0.5) * h * 0.08, (rand() - 0.5) * r * 0.22])
    }
    const [jx, jy, jz] = jitter.get(key)!
    pos.setXYZ(i, px + jx + x, py + jy + h / 2 - 0.5, pz + jz + z)
  }
  // flat-shaded faces: colour each triangle by its average height
  for (let i = 0; i < pos.count; i += 3) {
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
    const t = y / h
    if (y > snowLine) c.copy(SNOW)
    else if (t > 0.55) c.copy(rand() < 0.5 ? ROCK : ROCK_DARK)
    else c.copy(rand() < 0.5 ? FOREST : FOREST_DARK).lerp(ROCK, Math.max(0, t - 0.3))
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b }
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.deleteAttribute('uv')
  g.computeVertexNormals()
  return g
}

/** a steep limestone tower (karst) with a green cap */
function karst(x: number, z: number, r: number, h: number, rand: () => number) {
  const g = new CylinderGeometry(r * 0.55, r, h, 8, 4).toNonIndexed()
  const pos = g.attributes.position as BufferAttribute
  const col = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i)
    const bulge = 1 + Math.sin(py * 0.4 + x) * 0.08 + (rand() - 0.5) * 0.06
    pos.setXYZ(i, pos.getX(i) * bulge + x, py + h / 2 - 0.5, pos.getZ(i) * bulge + z)
  }
  for (let i = 0; i < pos.count; i += 3) {
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
    c.copy(y > h * 0.78 ? KARST_TOP : y > h * 0.5 && rand() < 0.35 ? FOREST : KARST_ROCK)
    for (let k = 0; k < 3; k++) { col[(i + k) * 3] = c.r; col[(i + k) * 3 + 1] = c.g; col[(i + k) * 3 + 2] = c.b }
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.deleteAttribute('uv')
  g.computeVertexNormals()
  return g
}

function buildRanges() {
  const rand = rng(81)
  const parts: BufferGeometry[] = []
  // north: foothills in front, a high snowy range behind
  for (let x = -170; x <= 170; x += 15) {
    parts.push(peak(x + rand() * 8, -118 - rand() * 10, 16 + rand() * 8, 14 + rand() * 12, rand, 999))
    parts.push(peak(x + 7 + rand() * 8, -145 - rand() * 15, 22 + rand() * 10, 34 + rand() * 30, rand, 46))
  }
  for (let x = -150; x <= 150; x += 34) parts.push(peak(x + rand() * 14, -185 - rand() * 15, 30 + rand() * 10, 60 + rand() * 30, rand, 44))
  // west: limestone karsts rising out of the plain, mountains behind them
  for (let z = -110; z <= 120; z += 9) {
    if (rand() < 0.75) parts.push(karst(-78 - rand() * 18, z + rand() * 6, 4 + rand() * 4, 14 + rand() * 18, rand))
    if (rand() < 0.5) parts.push(karst(-100 - rand() * 14, z + rand() * 6, 5 + rand() * 4, 18 + rand() * 20, rand))
  }
  for (let z = -120; z <= 140; z += 18) parts.push(peak(-130 - rand() * 12, z + rand() * 8, 20 + rand() * 8, 30 + rand() * 25, rand, 48))
  const merged = mergeGeometries(parts, false)!
  parts.forEach(p => p.dispose())
  return merged
}

const TREES = 520

/** forest at the feet of the mountains, between the city's edge and the ranges */
function Forest() {
  const trunks = useRef<InstancedMesh>(null)
  const crowns = useRef<InstancedMesh>(null)
  const spots = useMemo(() => {
    const rand = rng(7)
    const out: [number, number, number][] = []
    while (out.length < TREES) {
      // a band north of downtown and a band west of the city
      const north = rand() < 0.55
      const x = north ? -120 + rand() * 240 : -58 - rand() * 50
      const z = north ? -100 - rand() * 22 : -100 + rand() * 220
      out.push([x, z, 0.8 + rand() * 0.9])
    }
    return out
  }, [])
  useEffect(() => {
    const o = new Object3D(), c = new Color()
    spots.forEach(([x, z, s], i) => {
      o.position.set(x, 0.9 * s - 0.1, z); o.scale.set(s, s, s); o.updateMatrix(); trunks.current!.setMatrixAt(i, o.matrix)
      o.position.set(x, 2.6 * s - 0.1, z); o.updateMatrix(); crowns.current!.setMatrixAt(i, o.matrix)
      crowns.current!.setColorAt(i, c.setHSL(0.27 + (i % 7) * 0.012, 0.42, 0.3 + (i % 5) * 0.03))
    })
    trunks.current!.instanceMatrix.needsUpdate = true
    crowns.current!.instanceMatrix.needsUpdate = true
    if (crowns.current!.instanceColor) crowns.current!.instanceColor.needsUpdate = true
  }, [spots])
  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREES]}>
        <cylinderGeometry args={[0.15, 0.22, 1.8, 6]} />
        <meshStandardMaterial color="#6B4A33" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, TREES]}>
        <coneGeometry args={[1.3, 3.4, 7]} />
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  )
}

export function Mountains() {
  const geo = useMemo(buildRanges, [])
  const mat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 }), [])
  return (
    <group>
      <mesh geometry={geo} material={mat} receiveShadow />
      <Forest />
    </group>
  )
}
