import { useEffect, useMemo } from 'react'
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from 'three'
import { listNotes, onGuestbookChange, type Note } from '../net/online'
import { useUI } from '../store'
import { Box } from './Districts'
import { Interactive } from './interact'

/** a wooden notice board in the park showing the latest guestbook notes */
export function GuestbookBoard({ position }: { position: [number, number, number] }) {
  const { tex, ctx } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 640
    c.height = 400
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    return { tex: t, ctx: c.getContext('2d')! }
  }, [])
  const mat = useMemo(() => new MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])

  useEffect(() => {
    const draw = (notes: Note[]) => {
      const g = ctx
      g.fillStyle = '#F4E9D1'
      g.fillRect(0, 0, 640, 400)
      g.fillStyle = '#8A5A33'
      g.font = '800 34px "Chakra Petch", "Segoe UI", sans-serif'
      g.fillText('📖 SỔ LƯU BÚT ROBOCITY', 24, 50)
      g.font = '600 18px "Plus Jakarta Sans", "Segoe UI", sans-serif'
      g.fillStyle = '#A0785A'
      g.fillText('Bấm vào bảng để ký tên', 26, 80)
      notes.slice(0, 5).forEach((n, i) => {
        const y = 124 + i * 54
        g.fillStyle = i % 2 ? '#FFF8E8' : '#FCEFD6'
        g.fillRect(18, y - 30, 604, 48)
        g.font = '26px "Segoe UI Emoji", sans-serif'
        g.fillText(n.emoji, 28, y + 2)
        g.fillStyle = '#5B3A1E'
        g.font = '700 18px "Plus Jakarta Sans", sans-serif'
        g.fillText(n.name, 70, y - 6)
        g.font = '500 17px "Plus Jakarta Sans", sans-serif'
        let m = n.message
        while (g.measureText(m).width > 530 && m.length > 3) m = m.slice(0, -2)
        g.fillText(m === n.message ? m : m + '…', 70, y + 14)
      })
      if (!notes.length) { g.fillStyle = '#8A6A4A'; g.font = '600 22px sans-serif'; g.fillText('Chưa có ai ký sổ. Hãy là người đầu tiên!', 30, 180) }
      tex.needsUpdate = true
    }
    const load = () => listNotes(5).then(draw).catch(() => draw([]))
    load()
    const off = onGuestbookChange(load)
    const id = setInterval(load, 30000)
    return () => { off(); clearInterval(id) }
  }, [ctx, tex])

  return (
    <Interactive name="Sổ lưu bút" hint="Bấm để để lại lời nhắn cho RoboCity ✍️" position={position} onActivate={() => useUI.setState({ game: 'guestbook' })}>
      {[-1.7, 1.7].map(x => <Box key={x} s={[0.18, 2.6, 0.18]} p={[x, 1.3, 0]} c="#7A5230" r={0.8} />)}
      <Box s={[3.6, 2.3, 0.14]} p={[0, 1.9, 0]} c="#8A5A33" r={0.8} />
      <mesh position={[0, 1.9, 0.08]} material={mat}><planeGeometry args={[3.3, 2.06]} /></mesh>
      <Box s={[3.9, 0.16, 0.5]} p={[0, 3.12, 0]} c="#6E4426" r={0.8} />
    </Interactive>
  )
}
