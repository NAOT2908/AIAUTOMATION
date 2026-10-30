import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { chatter, lines, speak, speakers } from './chatter'

/** speech bubbles only from up close, and never too many at once */
const MIN_ZOOM = 30
const MAX_SHOWN = 5
const POOL = 6
const pool: HTMLDivElement[] = []
const tmp = new Vector3()

/** DOM layer for the people's speech bubbles (rendered over the canvas) */
export function SpeechLayer() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current!
    for (let i = 0; i < POOL; i++) {
      const el = document.createElement('div')
      el.className = 'say'
      el.hidden = true
      root.append(el)
      pool.push(el)
    }
    return () => { root.textContent = ''; pool.length = 0 }
  }, [])
  return <div ref={ref} className="labels speech" aria-hidden="true" />
}

/** inside the Canvas: decides who talks and keeps the bubbles over their heads */
export function CitySpeech() {
  const camera = useThree(s => s.camera)
  const size = useThree(s => s.size)
  const nextAt = useRef(0)
  const pending = useRef<{ at: number; id: string; text: string }[]>([])
  const shownKey = useRef<number[]>([])

  useFrame(() => {
    const now = performance.now()
    for (const [id, l] of lines) if (l.until < now) lines.delete(id)
    const close = camera.zoom >= MIN_ZOOM

    // who is on screen right now
    const screen = new Map<string, [number, number]>()
    for (const [id, s] of speakers) {
      if (!s.obj.visible || !s.obj.parent) continue
      s.obj.getWorldPosition(tmp)
      tmp.y += s.head * s.obj.scale.y
      tmp.project(camera)
      if (tmp.z > 1 || Math.abs(tmp.x) > 0.95 || Math.abs(tmp.y) > 0.9) continue
      screen.set(id, [(tmp.x * 0.5 + 0.5) * size.width, (-tmp.y * 0.5 + 0.5) * size.height])
    }

    if (close && now >= nextAt.current && screen.size) {
      const c = chatter([...screen.keys()])
      if (c?.reply) pending.current.push({ at: now + 1500, ...c.reply })
      nextAt.current = now + 900 + Math.random() * 1100
    }
    pending.current = pending.current.filter(p => {
      if (p.at > now) return true
      if (!lines.has(p.id)) speak(p.id, p.text, 3000)
      return false
    })

    // place the newest lines first, skipping ones that would overlap
    const live = close ? [...lines.entries()].filter(([id]) => screen.has(id)).sort((a, b) => b[1].key - a[1].key) : []
    const placed: [number, number][] = []
    let used = 0
    for (const [id, l] of live) {
      if (used >= MAX_SHOWN) break
      const [x, y] = screen.get(id)!
      if (placed.some(([px, py]) => Math.abs(px - x) < 170 && Math.abs(py - y) < 46)) continue
      placed.push([x, y])
      const el = pool[used]
      if (shownKey.current[used] !== l.key) {
        shownKey.current[used] = l.key
        el.textContent = l.text
        el.className = `say v-${l.voice}`
      }
      el.hidden = false
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%)`
      used++
    }
    for (let i = used; i < pool.length; i++) pool[i].hidden = true
  })
  return null
}
