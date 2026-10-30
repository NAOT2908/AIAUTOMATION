import { useMemo } from 'react'
import {
  BufferGeometry, CanvasTexture, Float32BufferAttribute, FrontSide, BackSide, LatheGeometry, MeshStandardMaterial,
  QuadraticBezierCurve3, RepeatWrapping, SRGBColorSpace, TubeGeometry, Vector2, Vector3,
} from 'three'
import { tint } from './materials'

/* ---------------------------------------------------------------- textures */

const texCache = new Map<string, CanvasTexture>()
function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) {
  if (!texCache.has(key)) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    draw(c.getContext('2d')!)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    t.wrapS = t.wrapT = RepeatWrapping
    t.anisotropy = 8
    texCache.set(key, t)
  }
  const t = texCache.get(key)!.clone()
  t.repeat.set(repeat[0], repeat[1])
  t.needsUpdate = true
  return t
}

/** rows of curved clay tiles (ngói mũi hài / ống) */
export function tileTexture(color: string) {
  return canvasTexture('tile' + color, 128, 128, g => {
    g.fillStyle = color
    g.fillRect(0, 0, 128, 128)
    for (let row = 0; row < 8; row++) {
      const y = row * 16
      g.fillStyle = 'rgba(0,0,0,0.22)'
      g.fillRect(0, y + 13, 128, 3)
      for (let col = 0; col < 8; col++) {
        const x = col * 16 + (row % 2) * 8
        const grd = g.createLinearGradient(x, 0, x + 16, 0)
        grd.addColorStop(0, 'rgba(0,0,0,0.18)')
        grd.addColorStop(0.5, 'rgba(255,255,255,0.12)')
        grd.addColorStop(1, 'rgba(0,0,0,0.18)')
        g.fillStyle = grd
        g.fillRect(x, y, 16, 13)
      }
    }
  })
}

/** large square stone pavers */
export function stoneTexture(color: string, repeat: [number, number]) {
  return canvasTexture('stone' + color, 128, 128, g => {
    g.fillStyle = color
    g.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = `rgba(0,0,0,${0.02 + ((i * 7 + j * 3) % 5) * 0.012})`
      g.fillRect(i * 32 + 1, j * 32 + 1, 30, 30)
    }
    g.strokeStyle = 'rgba(80,60,40,0.25)'
    g.lineWidth = 2
    for (let k = 0; k <= 4; k++) {
      g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32, 128); g.stroke()
      g.beginPath(); g.moveTo(0, k * 32); g.lineTo(128, k * 32); g.stroke()
    }
  }, repeat)
}

/** sign board: text on a coloured plate */
export function signTexture2(text: string, sub: string, bg: string, fg: string, w = 1024, h = 256) {
  return canvasTexture(`sign${text}${sub}${bg}${fg}`, w, h, g => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.strokeStyle = fg
    g.globalAlpha = 0.5
    g.lineWidth = 6
    g.strokeRect(14, 14, w - 28, h - 28)
    g.globalAlpha = 1
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `800 ${Math.round(h * 0.38)}px "Chakra Petch", "Segoe UI", sans-serif`
    g.fillText(text, w / 2, sub ? h * 0.42 : h / 2)
    if (sub) {
      g.font = `600 ${Math.round(h * 0.15)}px "Plus Jakarta Sans", "Segoe UI", sans-serif`
      g.fillText(sub, w / 2, h * 0.78)
    }
  })
}

/** red/white awning stripes */
export function stripeTexture(a: string, b: string) {
  return canvasTexture('stripe' + a + b, 128, 16, g => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 16, 0, 16, 16) }
  })
}

/* ---------------------------------------------------------------- curved roof */

/**
 * Vietnamese hip roof: four tiled slopes that sag a little in the middle, with the eave
 * corners swept up and out (đao). Built as one grid per slope so the hips meet exactly.
 */
export function curvedRoofGeometry(W: number, D: number, H: number, curl: number) {
  const R = Math.max(0, W - D)            // ridge length along x
  const NU = 18, NV = 7
  const pos: number[] = [], uv: number[] = [], idx: number[] = []
  const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z)
  const faces: [Vector3, Vector3, Vector3, Vector3][] = [
    [v3(-W / 2, 0, D / 2), v3(W / 2, 0, D / 2), v3(-R / 2, H, 0), v3(R / 2, H, 0)],   // front
    [v3(W / 2, 0, -D / 2), v3(-W / 2, 0, -D / 2), v3(R / 2, H, 0), v3(-R / 2, H, 0)], // back
    [v3(-W / 2, 0, -D / 2), v3(-W / 2, 0, D / 2), v3(-R / 2, H, 0), v3(-R / 2, H, 0)], // left
    [v3(W / 2, 0, D / 2), v3(W / 2, 0, -D / 2), v3(R / 2, H, 0), v3(R / 2, H, 0)],   // right
  ]
  const p = new Vector3(), e = new Vector3(), r = new Vector3()
  for (const [e0, e1, r0, r1] of faces) {
    const base = pos.length / 3
    const eaveLen = e0.distanceTo(e1)
    for (let j = 0; j <= NV; j++) {
      const v = j / NV
      for (let i = 0; i <= NU; i++) {
        const u = i / NU
        e.lerpVectors(e0, e1, u)
        r.lerpVectors(r0, r1, u)
        p.lerpVectors(e, r, v)
        const c = Math.pow(Math.abs(2 * u - 1), 4) * Math.pow(1 - v, 2)
        p.y += curl * c - H * 0.1 * Math.sin(Math.PI * v)
        // sweep the corners outward as they lift
        const ox = Math.sign(e.x) * curl * 0.35 * c, oz = Math.sign(e.z) * curl * 0.35 * c
        p.x += Math.abs(e.x) > 1e-3 ? ox : 0
        p.z += Math.abs(e.z) > 1e-3 ? oz : 0
        pos.push(p.x, p.y, p.z)
        uv.push(u * eaveLen * 0.8, v * 3)
      }
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = base + j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1
      idx.push(a, b, c, b, d, c)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

interface RoofProps {
  w: number
  d: number
  h: number
  curl?: number
  y?: number
  color?: string
  underside?: string
  ridge?: boolean
  /** gold pearl on the ridge (lưỡng long chầu nguyệt, simplified) */
  pearl?: boolean
}

export function CurvedRoof({ w, d, h, curl = 0.5, y = 0, color = '#8E3B2A', underside = '#4A2A1C', ridge = true, pearl = false }: RoofProps) {
  const geo = useMemo(() => curvedRoofGeometry(w, d, h, curl), [w, d, h, curl])
  const top = useMemo(() => new MeshStandardMaterial({ map: tileTexture(color), roughness: 0.75, side: FrontSide }), [color])
  const under = useMemo(() => new MeshStandardMaterial({ color: underside, roughness: 0.85, side: BackSide }), [underside])
  const R = Math.max(0, w - d)
  // upturned dragon-tail ridge ends
  const ends = useMemo(() => [-1, 1].map(s => new TubeGeometry(new QuadraticBezierCurve3(
    new Vector3(s * R / 2, h + 0.08, 0), new Vector3(s * (R / 2 + 0.35), h + 0.1, 0), new Vector3(s * (R / 2 + 0.5), h + 0.55, 0),
  ), 12, 0.08, 8)), [R, h])
  // the swept-up corner hooks (đao)
  const hooks = useMemo(() => [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => {
    const cx = sx * (w / 2 + curl * 0.35), cz = sz * (d / 2 + curl * 0.35)
    return new TubeGeometry(new QuadraticBezierCurve3(
      new Vector3(cx * 0.94, curl * 0.85, cz * 0.94), new Vector3(cx * 1.02, curl * 0.95, cz * 1.02), new Vector3(cx * 1.06, curl * 1.5, cz * 1.06),
    ), 10, 0.06, 6)
  }), [w, d, curl])
  const ridgeMat = tint(color === '#8E3B2A' ? '#6E2A1D' : color, 0.6)
  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geo} material={top} castShadow receiveShadow />
      <mesh geometry={geo} material={under} />
      {ridge && R > 0 && (
        <>
          <mesh position={[0, h + 0.05, 0]} material={ridgeMat} castShadow><boxGeometry args={[R + 0.2, 0.2, 0.26]} /></mesh>
          {ends.map((g, i) => <mesh key={i} geometry={g} material={ridgeMat} castShadow />)}
        </>
      )}
      {hooks.map((g, i) => <mesh key={i} geometry={g} material={ridgeMat} castShadow />)}
      {pearl && (
        <mesh position={[0, h + 0.42, 0]} material={tint('#E8B923', 0.25)} castShadow><sphereGeometry args={[0.22, 18, 14]} /></mesh>
      )}
    </group>
  )
}

/* ---------------------------------------------------------------- bronze bell */

export function bellGeometry(height = 1) {
  const pts = [
    [0, 1], [0.18, 0.99], [0.27, 0.95], [0.3, 0.85], [0.31, 0.6], [0.33, 0.35], [0.38, 0.15], [0.44, 0.04], [0.46, 0], [0.42, 0],
  ].map(([x, y]) => new Vector2(x * height, y * height))
  return new LatheGeometry(pts, 36)
}
