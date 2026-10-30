import { useCallback, useEffect, useRef, useState } from 'react'
import { sound } from '../../audio/sound'
import { speak } from '../../scene/chatter'

const KEY = 'robocity_cong_duc'
const GAINS = [
  '+1 công đức', '+1 công đức', '+1 công đức', '+1 bình tĩnh', '+1 may mắn', '-1 deadline', '-1 phiền não',
  '+1 kiên nhẫn', '-1 bug', '+1 lương tâm coder', '+1 sức khỏe', '-1 drama',
]
const MILESTONES: Record<number, string> = {
  10: 'Tâm bắt đầu tĩnh lặng 🌿',
  50: 'Đã mở khóa: AI tu hộ 🤖🙏',
  108: 'Tròn 108 tiếng mõ, phiền não tan biến! 🪷',
  300: 'Công đức dày như tài liệu dự án 📚',
  1000: 'Đạt cảnh giới: code một lần chạy luôn ✨',
}
const FORTUNES = [
  { tier: 'Thượng thượng', text: 'Code push lên là chạy, không một warning. Tháng này sếp khen.' },
  { tier: 'Thượng', text: 'Deadline lùi một tuần. Tranh thủ ngủ bù.' },
  { tier: 'Thượng', text: 'Có quý nhân review PR cho, chỉ góp ý đúng một dòng.' },
  { tier: 'Trung', text: 'Bug hôm nay sửa được, nhưng mai nó quay lại thăm.' },
  { tier: 'Trung', text: 'Wifi chập chờn nhưng tâm vẫn an. Uống trà đá cho mát.' },
  { tier: 'Trung', text: 'Họp dài nhưng có trà sữa. Cân bằng âm dương.' },
  { tier: 'Hạ', text: 'Quên commit trước khi tắt máy. Hãy gõ thêm 108 tiếng mõ để hóa giải.' },
  { tier: 'Hạ', text: 'Sếp nhắn "em ơi" lúc 23h. Bình tĩnh, gõ mõ tiếp.' },
]

interface Float { id: number; text: string; x: number }

function loadCount() {
  try { return Number(localStorage.getItem(KEY)) || 0 } catch { return 0 }
}

/** "Gõ mõ tích công đức": tap the wooden fish, collect merit, draw a fortune stick */
export function MoGame() {
  const [count, setCount] = useState(loadCount)
  const [floats, setFloats] = useState<Float[]>([])
  const [hit, setHit] = useState(0)
  const [auto, setAuto] = useState(false)
  const [note, setNote] = useState('Bấm vào mõ hoặc nhấn phím Space để gõ')
  const [fortune, setFortune] = useState<(typeof FORTUNES)[number] | null>(null)
  const [shaking, setShaking] = useState(false)
  const seq = useRef(0)

  const tap = useCallback(() => {
    sound.playWoodfish()
    setHit(h => h + 1)
    setCount(c => {
      const n = c + 1
      try { localStorage.setItem(KEY, String(n)) } catch { /* private mode: keep it in memory */ }
      if (MILESTONES[n]) { setNote(MILESTONES[n]); sound.playBell(0.45) }
      if (n % 12 === 0) speak('tri-khach', 'Nam mô A Di Đà Phật 🙏')
      return n
    })
    const id = ++seq.current
    setFloats(f => [...f.slice(-10), { id, text: GAINS[Math.floor(Math.random() * GAINS.length)], x: 30 + Math.random() * 40 }])
    setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1100)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); tap() } }
    addEventListener('keydown', onKey, true)
    return () => removeEventListener('keydown', onKey, true)
  }, [tap])

  useEffect(() => {
    if (!auto) return
    const id = setInterval(tap, 650)
    return () => clearInterval(id)
  }, [auto, tap])

  const drawFortune = () => {
    setShaking(true)
    setFortune(null)
    sound.playBeep(300, 0.3)
    setTimeout(() => {
      setShaking(false)
      setFortune(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])
      sound.playBell(0.4)
    }, 1200)
  }

  return (
    <div className="mo-game">
      <div className="mo-count"><span>Công đức</span><b>{count.toLocaleString('vi-VN')}</b></div>
      <button className="mo-fish" onClick={tap} aria-label="Gõ mõ">
        <svg viewBox="0 0 220 180" key={hit} className="mo-svg">
          <defs>
            <radialGradient id="wood" cx="40%" cy="35%" r="70%">
              <stop offset="0" stopColor="#D58A3E" />
              <stop offset="0.6" stopColor="#A35A23" />
              <stop offset="1" stopColor="#6E3512" />
            </radialGradient>
          </defs>
          <ellipse cx="110" cy="164" rx="78" ry="10" fill="rgba(0,0,0,0.18)" />
          <rect x="40" y="140" width="140" height="22" rx="10" fill="#8E2A22" />
          <path d="M30 100 C30 45 75 25 110 25 C150 25 190 45 190 100 C190 140 155 150 110 150 C65 150 30 140 30 100 Z" fill="url(#wood)" />
          <path d="M55 105 C80 122 140 122 165 105" stroke="#3B1A08" strokeWidth="9" strokeLinecap="round" fill="none" />
          <circle cx="62" cy="80" r="7" fill="#3B1A08" />
          <path d="M75 55 C95 45 120 45 140 52" stroke="rgba(255,230,190,0.5)" strokeWidth="6" strokeLinecap="round" fill="none" />
          <g className="mo-mallet">
            <rect x="150" y="-30" width="10" height="80" rx="5" fill="#C99A5B" transform="rotate(35 155 10)" />
            <ellipse cx="135" cy="42" rx="18" ry="14" fill="#E4C08A" />
          </g>
        </svg>
        {floats.map(f => <span key={f.id} className="mo-float" style={{ left: `${f.x}%` }}>{f.text}</span>)}
      </button>
      <p className="mo-note">{note}</p>
      <div className="pc-actions">
        <button className="pc-btn" disabled={count < 50} aria-pressed={auto} onClick={() => setAuto(a => !a)} title={count < 50 ? 'Gõ đủ 50 tiếng để mở khóa' : ''}>
          🤖 {auto ? 'Dừng AI tu hộ' : 'AI tu hộ'}{count < 50 ? ` (còn ${50 - count})` : ''}
        </button>
        <button className="pc-btn" onClick={drawFortune} disabled={shaking}>🎋 Xin quẻ</button>
      </div>
      {(shaking || fortune) && (
        <div className={`mo-fortune${shaking ? ' shaking' : ''}`}>
          {shaking ? <span className="mo-sticks">🎋</span> : fortune && (
            <>
              <b>Quẻ {fortune.tier}</b>
              <p>{fortune.text}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
