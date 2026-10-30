import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { BOT_DEFS, DEPTS } from '../sim/data'
import { useUI } from '../store'
import { robots } from './vis'

/**
 * Speech bubbles and name tags. One persistent DOM element per robot, moved with a
 * transform each frame, so nothing is mounted/unmounted while the company is running.
 */
interface LabelEls { bubble: HTMLDivElement; tag: HTMLDivElement; key: number }
const els = new Map<string, LabelEls>()
const tmp = new Vector3()
const clip = (s: string) => (s.length > 90 ? s.slice(0, 88) + '…' : s)

/** DOM layer, rendered on top of the canvas */
export function LabelLayer() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = ref.current!
    for (const b of BOT_DEFS) {
      const bubble = document.createElement('div')
      const tag = document.createElement('div')
      bubble.className = 'bubble'
      tag.className = 'nametag'
      tag.textContent = b.name
      bubble.hidden = tag.hidden = true
      root.append(bubble, tag)
      els.set(b.id, { bubble, tag, key: -1 })
    }
    return () => { root.textContent = ''; els.clear() }
  }, [])
  return <div ref={ref} className="labels" aria-hidden="true" />
}

/** lives inside the Canvas: projects each robot's head to screen space */
export function LabelSync() {
  const camera = useThree(s => s.camera)
  const size = useThree(s => s.size)
  useFrame(() => {
    const now = performance.now()
    const selected = useUI.getState().selected
    for (const [id, el] of els) {
      const v = robots.get(id)
      if (!v) continue
      const showBubble = v.bubble.until > now
      const showTag = !showBubble && (v.hover || id === selected)
      el.bubble.hidden = !showBubble
      el.tag.hidden = !showTag
      if (!showBubble && !showTag) continue
      if (showBubble && el.key !== v.bubble.key) {
        el.key = v.bubble.key
        el.bubble.className = `bubble ${v.bubble.kind}`
        el.bubble.textContent = ''
        const def = BOT_DEFS.find(b => b.id === id)
        const d = def ? DEPTS[def.dept] : null

        const header = document.createElement('div')
        header.className = 'bubble-header'
        header.innerHTML = `<span class="bubble-botname" style="color: ${d?.color || '#5BE3FF'}">${d?.icon || '🤖'} ${def?.name || id}</span>${
          v.bubble.kind === 'llm' ? '<span class="bubble-badge llm-badge">🧠 AI</span>' :
          v.bubble.kind === 'warn' ? '<span class="bubble-badge warn-badge">⚠️</span>' :
          v.bubble.kind === 'good' ? '<span class="bubble-badge good-badge">✨</span>' : ''
        }`
        const textSpan = document.createElement('div')
        textSpan.className = 'bubble-text'
        textSpan.textContent = clip(v.bubble.text)

        el.bubble.append(header, textSpan)
      }
      el.tag.classList.toggle('sel', id === selected)
      tmp.set(v.pos.x, (showBubble ? 2.35 : 2.2) + v.bob, v.pos.z).project(camera)
      const x = (tmp.x * 0.5 + 0.5) * size.width
      const y = (-tmp.y * 0.5 + 0.5) * size.height
      ;(showBubble ? el.bubble : el.tag).style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%)`
    }
  })
  return null
}
