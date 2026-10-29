import { CanvasTexture, Color, MeshPhysicalMaterial, MeshStandardMaterial, SRGBColorSpace } from 'three'

/** Shared materials so hundreds of props reuse a handful of shader programs. */
const std = (color: string, roughness = 0.65, metalness = 0) => new MeshStandardMaterial({ color, roughness, metalness })

export const M = {
  white: std('#F7F9FC', 0.55),
  offWhite: std('#E9EEF5', 0.7),
  brand: std('#2E6BF0', 0.45),
  brandDark: std('#1D4FC4', 0.5),
  brandSoft: std('#9DBBF5', 0.6),
  metal: std('#B9C3CF', 0.35, 0.6),
  darkMetal: std('#2A3340', 0.4, 0.4),
  screenFrame: std('#1A222C', 0.25, 0.3),
  wood: std('#E3CDAE', 0.7),
  woodDark: std('#9C7552', 0.6),
  fabric: std('#3D6FE0', 0.9),
  fabricSoft: std('#C9D6F2', 0.95),
  leaf: std('#5DBB63', 0.8),
  leafDark: std('#3F9A55', 0.8),
  leafLight: std('#86CF6A', 0.8),
  trunk: std('#8A6A4E', 0.85),
  pot: std('#F2F4F7', 0.5),
  cardboard: std('#D9A86C', 0.85),
  cardboardDark: std('#C28F52', 0.85),
  palletBlue: std('#3567D8', 0.6),
  yellow: std('#F6B826', 0.5),
  black: std('#20262E', 0.6),
  tyre: std('#262B31', 0.9),
  gold: std('#E8B923', 0.3, 0.7),
  red: std('#E05252', 0.5),
  glass: new MeshPhysicalMaterial({ color: '#CFE6FA', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false }),
  window: new MeshStandardMaterial({ color: '#BFD9F5', roughness: 0.1, metalness: 0.2, emissive: new Color('#7FB1EA'), emissiveIntensity: 0.15 }),
  shadow: new MeshStandardMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }),
}

/** glowing material that blooms (not tone-mapped) */
export function glow(color: string, intensity = 1.6) {
  const m = new MeshStandardMaterial({ color: '#000', emissive: new Color(color), emissiveIntensity: intensity, toneMapped: false })
  return m
}

const deptMats = new Map<string, MeshStandardMaterial>()
export function tint(color: string, roughness = 0.6) {
  const key = color + roughness
  if (!deptMats.has(key)) deptMats.set(key, std(color, roughness))
  return deptMats.get(key)!
}

/** soft radial texture used as a cheap contact shadow under moving things */
export const blobTexture = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(0,0,0,0.55)')
  g.addColorStop(0.5, 'rgba(0,0,0,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
})()

function roundRect(x: CanvasRenderingContext2D, ox: number, oy: number, w: number, h: number, r: number) {
  x.beginPath()
  x.moveTo(ox + r, oy)
  x.arcTo(ox + w, oy, ox + w, oy + h, r)
  x.arcTo(ox + w, oy + h, ox, oy + h, r)
  x.arcTo(ox, oy + h, ox, oy, r)
  x.arcTo(ox, oy, ox + w, oy, r)
  x.closePath()
}

/** white pill sign with a coloured icon disc, drawn on a canvas */
export function signTexture(icon: string, text: string, color: string) {
  const s = 2, W = 560, H = 120
  const c = document.createElement('canvas')
  c.width = W * s
  c.height = H * s
  const x = c.getContext('2d')!
  x.scale(s, s)
  x.font = '600 44px "Chakra Petch", "Segoe UI", sans-serif'
  const w = Math.min(W - 8, x.measureText(text).width + 124)
  const ox = (W - w) / 2, oy = 14, h = 92
  x.shadowColor = 'rgba(20,40,80,0.18)'
  x.shadowBlur = 12
  x.shadowOffsetY = 4
  x.fillStyle = '#FFFFFF'
  roundRect(x, ox, oy, w, h, 46)
  x.fill()
  x.shadowColor = 'transparent'
  x.fillStyle = color
  x.beginPath()
  x.arc(ox + 46, oy + 46, 34, 0, Math.PI * 2)
  x.fill()
  x.font = '38px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText(icon, ox + 46, oy + 49)
  x.font = '600 44px "Chakra Petch", "Segoe UI", sans-serif'
  x.fillStyle = '#16212C'
  x.textAlign = 'left'
  x.fillText(text, ox + 94, oy + 49)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** brand decal for the truck trailer */
export function brandTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const x = c.getContext('2d')!
  x.fillStyle = '#F7F9FC'
  x.fillRect(0, 0, 512, 256)
  x.fillStyle = '#2E6BF0'
  x.fillRect(0, 196, 512, 60)
  roundRect(x, 40, 70, 80, 80, 18)
  x.fill()
  x.fillStyle = '#FFFFFF'
  x.beginPath()
  x.arc(66, 106, 9, 0, 7)
  x.arc(94, 106, 9, 0, 7)
  x.fill()
  x.fillStyle = '#16212C'
  x.font = '700 64px "Chakra Petch", "Segoe UI", sans-serif'
  x.textBaseline = 'middle'
  x.fillText('RoboCorp', 140, 104)
  x.fillStyle = '#5A6878'
  x.font = '500 24px "IBM Plex Sans", "Segoe UI", sans-serif'
  x.fillText('Giao hàng bởi robot', 144, 152)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}
