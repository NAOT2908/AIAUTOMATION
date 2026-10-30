import { useEffect } from 'react'
import { camNav } from '../../scene/Office'
import { useUI, type GameId } from '../../store'
import { Icon } from '../Icon'
import { DjGame } from './DjGame'
import { MoGame } from './MoGame'
import { PenaltyGame } from './PenaltyGame'
import { PhoGame } from './PhoGame'
import { Guestbook, Leaderboards } from './Social'

const GAMES: { id: Exclude<GameId, 'hub'>; icon: string; title: string; place: string; hint: string; at: [number, number] }[] = [
  { id: 'mo', icon: '🪵', title: 'Gõ mõ tích công đức', place: 'Chùa Khánh An · bấm vào mõ', hint: 'Gõ mõ, nhận công đức, xin quẻ vui', at: [-1, 33] },
  { id: 'dj', icon: '🎧', title: 'DJ nhịp điệu', place: 'Vũ trường · bấm vào bàn DJ', hint: 'Bấm D F J K đúng nhịp nhạc', at: [24, 31] },
  { id: 'pho', icon: '🍜', title: 'Nấu phở thần tốc', place: 'Phố ẩm thực · bấm vào xe phở', hint: 'Đúng món, đúng giờ, đừng bỏ kem!', at: [21, 1] },
  { id: 'penalty', icon: '⚽', title: 'Sút phạt đền', place: 'Sân bóng · bấm vào khung thành', hint: '5 quả đấu thủ môn robot', at: [-18, -28] },
]

function Hub() {
  return (
    <div className="game-hub">
      <div className="hub-social">
        <button className="pc-btn" onClick={() => useUI.setState({ game: 'guestbook' })}>📖 Sổ lưu bút</button>
        <button className="pc-btn" onClick={() => useUI.setState({ game: 'scores' })}>🏆 Bảng xếp hạng</button>
      </div>
      {GAMES.map(g => (
        <div key={g.id} className="hub-card">
          <span className="hub-icon">{g.icon}</span>
          <div>
            <b>{g.title}</b>
            <small>{g.place}</small>
            <p>{g.hint}</p>
          </div>
          <div className="hub-actions">
            <button className="btn-primary" onClick={() => useUI.setState({ game: g.id })}>Chơi</button>
            <button className="pc-btn" onClick={() => { camNav.flyTo(g.at[0], g.at[1], 70); useUI.setState({ game: null }) }}>Bay tới</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function GameModal() {
  const game = useUI(s => s.game)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') useUI.setState({ game: null }) }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])
  if (!game) return null
  const meta = GAMES.find(g => g.id === game)
  const title = meta ? `${meta.icon} ${meta.title}` : game === 'guestbook' ? '📖 Sổ lưu bút RoboCity' : game === 'scores' ? '🏆 Bảng xếp hạng' : '🎮 Trò chơi trong RoboCity'
  const close = () => useUI.setState({ game: null })
  return (
    <div className="game-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) close() }}>
      <section className={`card game-window game-${game}`} role="dialog" aria-label={title}>
        <header>
          {game !== 'hub' && <button className="pc-close" onClick={() => useUI.setState({ game: 'hub' })} aria-label="Danh sách trò chơi">‹</button>}
          <h2>{title}</h2>
          <button className="pc-close" onClick={close} aria-label="Đóng"><Icon name="close" size={16} /></button>
        </header>
        <div className="game-body">
          {game === 'hub' && <Hub />}
          {game === 'mo' && <MoGame />}
          {game === 'dj' && <DjGame />}
          {game === 'pho' && <PhoGame />}
          {game === 'penalty' && <PenaltyGame />}
          {game === 'guestbook' && <Guestbook />}
          {game === 'scores' && <Leaderboards />}
        </div>
      </section>
    </div>
  )
}
