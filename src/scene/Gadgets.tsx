import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CanvasTexture, Mesh, MeshBasicMaterial, SRGBColorSpace, SphereGeometry } from 'three'
import { sound } from '../audio/sound'
import { DEPTS } from '../sim/data'
import { company } from '../sim/engine'
import { clock, money } from '../sim/format'
import { Interactive } from './interact'
import { M, glow } from './materials'

/* ---------------------------------------------------------------- live canvas screens */

const FONT = '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif'
const MONO = '"JetBrains Mono", Consolas, monospace'

/** a canvas texture redrawn every `everyMs` from live simulation data */
function useScreen(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, everyMs = 1000) {
  const { ctx, tex } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    return { ctx: c.getContext('2d')!, tex: t }
  }, [w, h])
  const last = useRef(-1e9)
  const drawRef = useRef(draw)
  drawRef.current = draw
  useFrame(() => {
    const now = performance.now()
    if (now - last.current < everyMs) return
    last.current = now
    drawRef.current(ctx)
    tex.needsUpdate = true
  })
  return { tex, redraw: () => { last.current = -1e9 } }
}

function screenFrame(g: CanvasRenderingContext2D, W: number, H: number, title: string, right: string) {
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0F1B2E')
  bg.addColorStop(1, '#0A111D')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#8FA1BD'
  g.font = `700 17px ${FONT}`
  g.textAlign = 'left'
  g.fillText(title, 24, 34)
  g.textAlign = 'right'
  g.font = `600 15px ${MONO}`
  g.fillText(right, W - 24, 34)
  g.textAlign = 'left'
  g.fillStyle = '#1E2C44'
  g.fillRect(24, 46, W - 48, 2)
}

/** shared with the TV's info card, which can switch channels too */
export const tvState = { channel: 0, redraw: () => {} }
export const TV_CHANNELS = ['Tổng quan', 'Kho hàng', 'Nhật ký']

function drawOverview(g: CanvasRenderingContext2D, W: number, H: number) {
  const c = company
  g.fillStyle = '#E8EEF8'
  g.font = `800 54px ${FONT}`
  g.fillText(money(c.cash), 24, 112)
  g.fillStyle = '#8FA1BD'
  g.font = `600 15px ${FONT}`
  g.fillText('TIỀN MẶT', 26, 136)
  const pct = Math.max(0, Math.min(1, c.profit / c.target))
  g.fillStyle = '#22324C'
  g.fillRect(24, 150, 250, 10)
  g.fillStyle = '#3DDC84'
  g.fillRect(24, 150, 250 * pct, 10)
  g.fillStyle = '#8FA1BD'
  g.fillText(`Lãi ${money(c.profit)} · ${Math.round(pct * 100)}% mục tiêu`, 24, 184)
  const rows: [string, string, string][] = [
    ['#6AAEFF', 'Đơn hôm nay', String(c.today.orders)],
    ['#3DDC84', 'Doanh thu hôm nay', money(c.today.revenue)],
    ['#F2B544', 'Đơn chờ hàng', String(c.backorders.length)],
    ['#FF7AB6', 'Hài lòng khách', `${Math.round(c.satisfaction)}%`],
  ]
  rows.forEach(([col, label, val], i) => {
    const y = 84 + i * 30
    g.fillStyle = col
    g.beginPath()
    g.arc(312, y - 5, 6, 0, 7)
    g.fill()
    g.fillStyle = '#B9C6DA'
    g.font = `600 15px ${FONT}`
    g.fillText(label, 326, y)
    g.fillStyle = '#E8EEF8'
    g.font = `700 16px ${MONO}`
    g.textAlign = 'right'
    g.fillText(val, W - 24, y)
    g.textAlign = 'left'
  })
  // cash history bars
  const hist = c.cashHistory.slice(-36)
  const mx = Math.max(1, ...hist), mn = Math.min(...hist, 0)
  hist.forEach((v, i) => {
    const h = 6 + ((v - mn) / (mx - mn || 1)) * 56
    g.fillStyle = i === hist.length - 1 ? '#3DDC84' : '#2B4166'
    g.fillRect(24 + i * 13.6, H - 18 - h, 9, h)
  })
}

function drawStock(g: CanvasRenderingContext2D, W: number) {
  company.products.forEach((p, i) => {
    const y = 78 + i * 52
    const cap = Math.max(p.reorderPoint * 3, p.stock)
    const low = p.stock <= p.reorderPoint
    g.fillStyle = '#E8EEF8'
    g.font = `700 17px ${FONT}`
    g.fillText(p.name, 24, y)
    g.fillStyle = low ? '#FF7A7A' : '#8FA1BD'
    g.font = `600 14px ${MONO}`
    g.textAlign = 'right'
    g.fillText(`${p.stock} sp${p.openPO ? ' · đã đặt PO' : ''}`, W - 24, y)
    g.textAlign = 'left'
    g.fillStyle = '#22324C'
    g.fillRect(24, y + 10, W - 48, 12)
    g.fillStyle = p.openPO ? '#F2B544' : low ? '#FF7A7A' : '#3DDC84'
    g.fillRect(24, y + 10, (W - 48) * Math.min(1, p.stock / cap), 12)
    g.fillStyle = '#E8EEF8'
    g.fillRect(24 + (W - 48) * (p.reorderPoint / cap), y + 6, 2, 20)
  })
}

function drawLog(g: CanvasRenderingContext2D, W: number) {
  company.logs.slice(0, 7).forEach((e, i) => {
    const y = 80 + i * 30
    g.fillStyle = DEPTS[e.dept].color
    g.beginPath()
    g.arc(30, y - 5, 6, 0, 7)
    g.fill()
    g.fillStyle = '#8FA1BD'
    g.font = `600 13px ${MONO}`
    g.fillText(clock(e.t), 44, y)
    g.fillStyle = e.warn ? '#FF9A9A' : '#DCE5F2'
    g.font = `500 15px ${FONT}`
    let text = e.text
    while (g.measureText(text).width > W - 120 && text.length > 4) text = text.slice(0, -2)
    g.fillText(text === e.text ? text : text + '…', 100, y)
  })
}

/** wall TV in the director's office: three channels of live company data */
export function CompanyTV({ position }: { position: [number, number, number] }) {
  const W = 640, H = 360
  const { tex, redraw } = useScreen(W, H, g => {
    const ch = tvState.channel
    screenFrame(g, W, H, `ROBOCORP TV · ${TV_CHANNELS[ch].toUpperCase()}`, `Ngày ${company.day} · ${clock(company.t)}`)
    if (ch === 0) drawOverview(g, W, H)
    else if (ch === 1) drawStock(g, W)
    else drawLog(g, W)
  })
  tvState.redraw = redraw
  const screen = useMemo(() => new MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])
  return (
    <Interactive
      id="tv" name="TV phòng Giám đốc" hint="Bấm để đổi kênh · số liệu công ty theo thời gian thực" position={position}
      onActivate={() => { tvState.channel = (tvState.channel + 1) % TV_CHANNELS.length; redraw() }}
    >
      <RoundedBox args={[2.1, 1.24, 0.07]} radius={0.03} material={M.screenFrame} castShadow />
      <mesh position={[0, 0, 0.037]} material={screen}><planeGeometry args={[1.98, 1.12]} /></mesh>
    </Interactive>
  )
}

/** sales leaderboard on a stand in the sales room */
export function SalesTV({ position }: { position: [number, number, number] }) {
  const W = 512, H = 300
  const { tex } = useScreen(W, H, g => {
    screenFrame(g, W, H, 'BẢNG XẾP HẠNG SALES', clock(company.t))
    const reps = [company.bot('sales1'), company.bot('sales2')].sort((a, b) => b.done - a.done)
    const top = Math.max(1, reps[0].done)
    reps.forEach((b, i) => {
      const y = 92 + i * 62
      g.fillStyle = i === 0 ? '#F2B544' : '#8FA1BD'
      g.font = `800 26px ${FONT}`
      g.fillText(i === 0 ? '🏆' : '2', 24, y + 4)
      g.fillStyle = '#E8EEF8'
      g.font = `700 18px ${FONT}`
      g.fillText(b.name, 66, y - 6)
      g.fillStyle = '#22324C'
      g.fillRect(66, y + 4, W - 160, 12)
      g.fillStyle = DEPTS.sales.color
      g.fillRect(66, y + 4, (W - 160) * (b.done / top), 12)
      g.fillStyle = '#B9C6DA'
      g.font = `700 16px ${MONO}`
      g.textAlign = 'right'
      g.fillText(String(b.done), W - 24, y + 15)
      g.textAlign = 'left'
    })
    g.fillStyle = '#8FA1BD'
    g.font = `600 15px ${FONT}`
    g.fillText(`Hôm nay: ${company.today.orders} đơn · ${money(company.today.revenue)}`, 24, H - 26)
  })
  const screen = useMemo(() => new MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])
  return (
    <Interactive id="salesTv" name="Màn hình doanh số" hint="Bảng xếp hạng hai Sales-Bot" position={position}>
      <mesh position={[0, 0.02, 0]} material={M.darkMetal} receiveShadow><cylinderGeometry args={[0.32, 0.36, 0.05, 24]} /></mesh>
      <mesh position={[0, 0.85, 0]} material={M.darkMetal} castShadow><cylinderGeometry args={[0.04, 0.04, 1.6, 10]} /></mesh>
      <group position={[0, 1.78, 0]}>
        <RoundedBox args={[1.4, 0.84, 0.06]} radius={0.03} material={M.screenFrame} castShadow />
        <mesh position={[0, 0, 0.032]} material={screen}><planeGeometry args={[1.32, 0.77]} /></mesh>
      </group>
    </Interactive>
  )
}

/* ---------------------------------------------------------------- coffee machine */

const puffGeo = new SphereGeometry(0.07, 10, 8)
export const coffeeFx = { brew: () => {} }

export function CoffeeCorner({ position }: { position: [number, number, number] }) {
  const puffs = useRef<{ m: Mesh; life: number; vx: number; vz: number }[]>([])
  const holder = useRef<Mesh[]>([])
  const led = useMemo(() => glow('#FF9F43', 1.8), [])
  const puffMats = useMemo(() => Array.from({ length: 10 }, () => new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false })), [])

  const brew = () => {
    puffs.current = holder.current.map((m, i) => ({ m, life: -i * 0.18, vx: (Math.random() - 0.5) * 0.08, vz: (Math.random() - 0.5) * 0.08 }))
    sound.playBeep(520, 0.12)
    company.brewCoffee()
  }
  coffeeFx.brew = brew

  useFrame((_, dt) => {
    for (const p of puffs.current) {
      p.life += dt
      const k = p.life / 1.6
      const mat = p.m.material as MeshBasicMaterial
      if (k < 0 || k > 1) { mat.opacity = 0; continue }
      p.m.position.set(0.05 + p.vx * k * 6, 1.45 + k * 0.9, 0.05 + p.vz * k * 6)
      p.m.scale.setScalar(0.6 + k * 1.6)
      mat.opacity = 0.55 * (1 - k)
    }
  })

  return (
    <Interactive id="coffee" name="Máy pha cà phê" hint="Bấm để pha một ấm: +8% pin cho mọi robot" position={position} onActivate={brew}>
      {/* counter */}
      <RoundedBox args={[0.7, 0.9, 0.62]} radius={0.04} position={[0, 0.45, 0]} material={M.white} castShadow receiveShadow />
      <mesh position={[0, 0.91, 0]} material={M.woodDark} receiveShadow><boxGeometry args={[0.74, 0.04, 0.66]} /></mesh>
      {/* machine */}
      <RoundedBox args={[0.38, 0.5, 0.34]} radius={0.05} position={[0, 1.18, -0.06]} material={M.black} castShadow />
      <mesh position={[0, 1.06, 0.12]} material={M.metal}><boxGeometry args={[0.2, 0.03, 0.12]} /></mesh>
      <mesh position={[0, 1.0, 0.1]} material={M.glass}><cylinderGeometry args={[0.07, 0.06, 0.14, 16]} /></mesh>
      <mesh position={[0.11, 1.33, 0.115]} material={led}><sphereGeometry args={[0.025, 10, 8]} /></mesh>
      {/* mugs */}
      {[-0.22, 0.24].map(x => (
        <mesh key={x} position={[x, 0.98, 0.18]} material={x < 0 ? M.brand : M.yellow} castShadow><cylinderGeometry args={[0.05, 0.045, 0.1, 12]} /></mesh>
      ))}
      {puffMats.map((m, i) => (
        <mesh key={i} ref={el => { if (el) holder.current[i] = el }} geometry={puffGeo} material={m} raycast={() => {}} />
      ))}
    </Interactive>
  )
}
