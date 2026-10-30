import { useState } from 'react'
import { sound } from '../../audio/sound'
import { speak } from '../../scene/chatter'
import { submitScore } from '../../net/online'

/** goal zones: columns left/centre/right × rows top/bottom */
const ZONES = [0, 1, 2, 3, 4, 5]
const zoneXY = (z: number) => ({ x: [18, 50, 82][z % 3], y: z < 3 ? 30 : 72 })
const SHOTS = 5
const GOAL_LINES = ['Vàooo!!! ⚽🔥', 'Một cú sút như trên TV!', 'Thủ môn robot đứng hình!', 'Lưới rung bần bật!']
const SAVE_LINES = ['Thủ môn robot đã đọc được ý đồ! 🤖🧤', 'Bay người cản phá ngoạn mục!', 'Robot phân tích 1000 cú sút của bạn rồi 😏']
const MISS_LINES = ['Bóng bay lên khán đài, cổ động viên bắt được làm kỷ niệm 😂', 'Chệch cột dọc trong gang tấc!']

export function PenaltyGame() {
  const [shots, setShots] = useState<('goal' | 'save' | 'miss')[]>([])
  const [ball, setBall] = useState<{ x: number; y: number } | null>(null)
  const [keeper, setKeeper] = useState(1)
  const [line, setLine] = useState('Chọn góc sút trên khung thành')
  const [busy, setBusy] = useState(false)
  const done = shots.length >= SHOTS
  const goals = shots.filter(s => s === 'goal').length

  const shoot = (zone: number) => {
    if (busy || done) return
    setBusy(true)
    sound.playDrum('kick', 0, 1)
    // the robot keeper guesses a column; corners are a little harder to reach
    const dive = Math.floor(Math.random() * 3)
    const col = zone % 3
    const miss = Math.random() < (col === 1 ? 0.04 : 0.1)
    const saved = !miss && dive === col && Math.random() < (zone < 3 && col !== 1 ? 0.55 : 0.85)
    setKeeper(dive)
    const target = zoneXY(zone)
    setBall(miss ? { x: target.x + (col === 0 ? -14 : 14), y: target.y - 26 } : target)
    setTimeout(() => {
      const r: 'goal' | 'save' | 'miss' = miss ? 'miss' : saved ? 'save' : 'goal'
      setShots(s => {
        const all = [...s, r]
        if (all.length === SHOTS) submitScore('penalty', all.filter(x => x === 'goal').length)
        return all
      })
      const pool = r === 'goal' ? GOAL_LINES : r === 'save' ? SAVE_LINES : MISS_LINES
      setLine(pool[Math.floor(Math.random() * pool.length)])
      sound.playResult(r === 'goal')
      if (r === 'goal') speak('co-dong-vien-0', 'Vàooo!!! ⚽')
      setTimeout(() => { setBall(null); setKeeper(1); setBusy(false) }, 1100)
    }, 550)
  }

  const reset = () => { setShots([]); setLine('Chọn góc sút trên khung thành'); setBall(null); setKeeper(1) }

  return (
    <div className="pen-game">
      <div className="pen-score">
        {Array.from({ length: SHOTS }, (_, i) => <span key={i} className={`pen-dot ${shots[i] ?? ''}`} />)}
        <b>{goals}/{SHOTS}</b>
      </div>
      <div className="pen-goal">
        <div className="pen-net" />
        {ZONES.map(z => {
          const { x, y } = zoneXY(z)
          return <button key={z} className="pen-zone" style={{ left: `${x}%`, top: `${y}%` }} onClick={() => shoot(z)} disabled={busy || done} aria-label={`Sút góc ${z + 1}`}>🎯</button>
        })}
        <div className="pen-keeper" style={{ left: `${[22, 50, 78][keeper]}%`, transform: `translateX(-50%) rotate(${[-35, 0, 35][keeper]}deg)` }}>🧤🤖🧤</div>
        <div className="pen-ball" style={ball ? { left: `${ball.x}%`, top: `${ball.y}%`, transform: 'translate(-50%,-50%) scale(0.6)' } : undefined}>⚽</div>
      </div>
      <p className="pen-line">{line}</p>
      {done && (
        <div className="pc-actions">
          <b>{goals >= 4 ? 'Vua phạt đền! 👑' : goals >= 2 ? 'Không tệ chút nào!' : 'Thủ môn robot thắng rồi 🤖'}</b>
          <button className="btn-primary" onClick={reset}>🔁 Sút lại</button>
        </div>
      )}
    </div>
  )
}
