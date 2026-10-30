import { useEffect, useState } from 'react'
import { listNotes, online, onGuestbookChange, playerName, postNote, setPlayerName, topScores, type GameKey, type Note, type Score } from '../../net/online'
import { sound } from '../../audio/sound'

const EMOJIS = ['👋', '❤️', '🎉', '🙏', '😂', '🔥', '🌸', '🤖', '🍜', '⚽']
const GAME_NAMES: Record<GameKey, string> = { mo: '🪵 Công đức', dj: '🎧 DJ', pho: '🍜 Phở (xu)', penalty: '⚽ Phạt đền' }

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'vừa xong'
  if (m < 60) return `${m} phút trước`
  if (m < 1440) return `${Math.round(m / 60)} giờ trước`
  return `${Math.round(m / 1440)} ngày trước`
}

export function ModeNote() {
  return online
    ? <p className="social-mode on">🌐 Đang online: mọi người đều thấy lời nhắn và điểm của nhau.</p>
    : <p className="social-mode">💾 Chế độ cục bộ: dữ liệu chỉ lưu trên máy này (chưa kết nối máy chủ chung).</p>
}

/** asks once for the name shown on the wall and the leaderboards */
export function NameField() {
  const [name, setName] = useState(playerName)
  return (
    <label className="social-name">
      Tên của bạn
      <input value={name} maxLength={24} placeholder="Ví dụ: Toàn RoboCorp" onChange={e => { setName(e.target.value); setPlayerName(e.target.value) }} />
    </label>
  )
}

export function Guestbook() {
  const [notes, setNotes] = useState<Note[]>([])
  const [emoji, setEmoji] = useState('👋')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => listNotes().then(setNotes).catch(e => setErr(String(e.message ?? e)))
  useEffect(() => { load(); const off = onGuestbookChange(load); const id = setInterval(load, 20000); return () => { off(); clearInterval(id) } }, [])
  const send = async () => {
    setBusy(true); setErr('')
    try {
      await postNote(playerName(), emoji, msg)
      setMsg('')
      sound.playResult(true)
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <div className="social">
      <ModeNote />
      <NameField />
      <div className="gb-form">
        <div className="gb-emojis">{EMOJIS.map(e => <button key={e} className="pc-btn" aria-pressed={emoji === e} onClick={() => setEmoji(e)}>{e}</button>)}</div>
        <textarea value={msg} maxLength={140} rows={2} placeholder="Để lại lời nhắn cho RoboCity…" onChange={e => setMsg(e.target.value)} />
        <div className="gb-send"><small>{msg.length}/140</small><button className="btn-primary" disabled={busy || !msg.trim()} onClick={send}>✍️ Ký sổ</button></div>
        {err && <p className="gb-err">{err}</p>}
      </div>
      <ul className="gb-list">
        {notes.length ? notes.map(n => (
          <li key={n.id}><span className="gb-emoji">{n.emoji}</span><div><b>{n.name}</b> <small>{ago(n.created_at)}</small><p>{n.message}</p></div></li>
        )) : <li className="muted">Chưa có ai ký sổ. Bạn là người đầu tiên nhé!</li>}
      </ul>
    </div>
  )
}

export function Leaderboards() {
  const [game, setGame] = useState<GameKey>('mo')
  const [rows, setRows] = useState<Score[]>([])
  const [err, setErr] = useState('')
  useEffect(() => { setErr(''); topScores(game).then(setRows).catch(e => setErr(String(e.message ?? e))) }, [game])
  return (
    <div className="social">
      <ModeNote />
      <NameField />
      <div className="pc-actions">{(Object.keys(GAME_NAMES) as GameKey[]).map(g => <button key={g} className="pc-btn" aria-pressed={game === g} onClick={() => setGame(g)}>{GAME_NAMES[g]}</button>)}</div>
      {err && <p className="gb-err">{err}</p>}
      <ol className="lb-list">
        {rows.length ? rows.map((r, i) => (
          <li key={r.id}><span className="lb-rank">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span><b>{r.name}</b><span className="lb-score">{r.score.toLocaleString('vi-VN')}</span></li>
        )) : <li className="muted">Chưa có điểm nào. Đặt tên ở trên rồi chơi để ghi danh!</li>}
      </ol>
    </div>
  )
}
