import { useEffect, useRef, useState } from 'react'
import { sound } from '../../audio/sound'
import { speak } from '../../scene/chatter'
import { submitScore } from '../../net/online'

const LANES = [
  { key: 'KeyD', label: 'D', color: '#FF5FD2', voice: 'kick' as const },
  { key: 'KeyF', label: 'F', color: '#5BE7FF', voice: 'snare' as const },
  { key: 'KeyJ', label: 'J', color: '#FFD166', voice: 'hat' as const },
  { key: 'KeyK', label: 'K', color: '#8BFF8A', voice: 'synth' as const },
]
const BPM = 116, BEAT = 60 / BPM, BARS = 12, FALL = 1.7
const SYNTH = [262, 330, 392, 440, 392, 330]
const W = 360, H = 420, HIT_Y = 360

interface Note { t: number; lane: number; done: boolean }

/** a short groove: kick on the beat, snare on 2 and 4, hats and synth stabs in between */
function makeChart(): Note[] {
  const out: Note[] = []
  for (let bar = 0; bar < BARS; bar++) {
    for (let b = 0; b < 4; b++) {
      const t = 2 + (bar * 4 + b) * BEAT
      if (b % 2 === 0) out.push({ t, lane: 0, done: false })
      else out.push({ t, lane: 1, done: false })
      if (bar >= 2 && Math.random() < 0.45) out.push({ t: t + BEAT / 2, lane: 2, done: false })
      if (bar >= 4 && b === 3 && Math.random() < 0.7) out.push({ t: t + BEAT / 2, lane: 3, done: false })
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

const RANKS = [
  { min: 0.92, rank: 'S', text: 'DJ Robot xin bái bạn làm sư phụ! 🎧👑' },
  { min: 0.78, rank: 'A', text: 'Cả club đang hét tên bạn! 🔥' },
  { min: 0.55, rank: 'B', text: 'Ổn áp! Thêm vài ly trà đá là lên A.' },
  { min: 0, rank: 'C', text: 'Đám đông hơi bối rối… nhưng vẫn nhảy vì lịch sự 😅' },
]

export function DjGame() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready')
  const [stats, setStats] = useState({ score: 0, combo: 0, best: 0, perfect: 0, good: 0, miss: 0 })
  const game = useRef({ start: 0, notes: [] as Note[], flash: [0, 0, 0, 0], judge: '', judgeAt: 0, beatIdx: -1, finished: false })
  const statsRef = useRef(stats)
  statsRef.current = stats

  const now = () => performance.now() / 1000 - game.current.start

  const hitLane = (lane: number) => {
    const g = game.current
    sound.playDrum(LANES[lane].voice, SYNTH[Math.floor(Math.random() * SYNTH.length)], 0.8)
    g.flash[lane] = performance.now()
    if (phase !== 'play') return
    const t = now()
    const n = g.notes.find(x => !x.done && x.lane === lane && Math.abs(x.t - t) < 0.17)
    setStats(s => {
      if (!n) return { ...s, combo: 0 }
      n.done = true
      const perfect = Math.abs(n.t - t) < 0.09
      g.judge = perfect ? 'PERFECT!' : 'GOOD'
      g.judgeAt = performance.now()
      const combo = s.combo + 1
      return { ...s, combo, best: Math.max(s.best, combo), score: s.score + (perfect ? 300 : 120) + combo * 5, perfect: s.perfect + (perfect ? 1 : 0), good: s.good + (perfect ? 0 : 1) }
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lane = LANES.findIndex(l => l.key === e.code)
      if (lane < 0 || e.repeat) return
      e.preventDefault()
      e.stopPropagation()
      hitLane(lane)
    }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  })

  const start = () => {
    game.current = { start: performance.now() / 1000, notes: makeChart(), flash: [0, 0, 0, 0], judge: '', judgeAt: 0, beatIdx: -1, finished: false }
    setStats({ score: 0, combo: 0, best: 0, perfect: 0, good: 0, miss: 0 })
    setPhase('play')
    speak('dj', 'Có người lên đánh nhạc kìa! 🎧')
  }

  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const c = canvas.current
      if (!c) return
      const x = c.getContext('2d')!
      const g = game.current, t = phase === 'play' ? now() : 0, laneW = W / 4
      x.fillStyle = '#0D0820'
      x.fillRect(0, 0, W, H)
      LANES.forEach((l, i) => {
        const glow = Math.max(0, 1 - (performance.now() - g.flash[i]) / 180)
        x.fillStyle = `rgba(255,255,255,${0.03 + glow * 0.12})`
        x.fillRect(i * laneW + 2, 0, laneW - 4, H)
        x.fillStyle = l.color
        x.globalAlpha = 0.35 + glow * 0.65
        x.fillRect(i * laneW + 6, HIT_Y - 4, laneW - 12, 8)
        x.globalAlpha = 1
        x.font = '700 18px "JetBrains Mono", monospace'
        x.textAlign = 'center'
        x.fillStyle = '#FFFFFF'
        x.fillText(l.label, i * laneW + laneW / 2, H - 22)
      })
      if (phase === 'play') {
        // beat track: a soft hat on every beat keeps time
        const bi = Math.floor((t - 2) / BEAT)
        if (bi !== g.beatIdx && t > 2) { g.beatIdx = bi; sound.playDrum('hat', 0, 0.25) }
        let missed = 0
        for (const n of g.notes) {
          if (n.done) continue
          if (t - n.t > 0.17) { n.done = true; missed++; continue }
          const y = HIT_Y - ((n.t - t) / FALL) * HIT_Y
          if (y < -20) continue
          x.fillStyle = LANES[n.lane].color
          x.shadowColor = LANES[n.lane].color
          x.shadowBlur = 14
          x.beginPath()
          x.roundRect(n.lane * laneW + 10, y - 9, laneW - 20, 18, 9)
          x.fill()
          x.shadowBlur = 0
        }
        if (missed) setStats(s => ({ ...s, combo: 0, miss: s.miss + missed }))
        const age = performance.now() - g.judgeAt
        if (g.judge && age < 450) {
          x.globalAlpha = 1 - age / 450
          x.font = '800 30px "Chakra Petch", sans-serif'
          x.fillStyle = g.judge === 'PERFECT!' ? '#FFD166' : '#5BE7FF'
          x.fillText(g.judge, W / 2, HIT_Y - 120 - age / 20)
          x.globalAlpha = 1
        }
        if (!g.finished && g.notes.every(n => n.done) && t > (g.notes.at(-1)?.t ?? 0) + 1) {
          g.finished = true
          setPhase('done')
          const s = statsRef.current, total = g.notes.length
          const acc = (s.perfect + s.good * 0.6) / total
          sound.playResult(acc >= 0.55)
          submitScore('dj', s.score)
          speak('dj', acc >= 0.78 ? 'Đỉnh của chóp! 🔥' : 'Cũng được đó bạn ơi! 🎶')
        }
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = game.current.notes.length || 1
  const acc = (stats.perfect + stats.good * 0.6) / total
  const rank = RANKS.find(r => acc >= r.min)!

  return (
    <div className="dj-game">
      <div className="dj-hud">
        <span>Điểm <b>{stats.score.toLocaleString('vi-VN')}</b></span>
        <span>Combo <b>{stats.combo}</b></span>
        <span>Perfect <b>{stats.perfect}</b> · Good <b>{stats.good}</b> · Trượt <b>{stats.miss}</b></span>
      </div>
      <div className="dj-stage">
        <canvas ref={canvas} width={W} height={H} />
        {phase !== 'play' && (
          <div className="dj-overlay">
            {phase === 'done' ? (
              <>
                <b className="dj-rank">{rank.rank}</b>
                <p>{rank.text}</p>
                <p className="muted">Combo dài nhất: {stats.best} · Chính xác {Math.round(acc * 100)}%</p>
              </>
            ) : (
              <p>Nốt rơi xuống vạch sáng thì bấm <b>D F J K</b> (hoặc chạm vào làn).</p>
            )}
            <button className="btn-primary" onClick={start}>{phase === 'done' ? '🔁 Chơi lại' : '▶ Lên nhạc!'}</button>
          </div>
        )}
      </div>
      <div className="dj-pads">
        {LANES.map((l, i) => (
          <button key={l.key} style={{ '--c': l.color } as React.CSSProperties} onPointerDown={() => hitLane(i)}>{l.label}</button>
        ))}
      </div>
    </div>
  )
}
