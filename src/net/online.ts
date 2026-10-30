/**
 * Shared guestbook and leaderboards.
 *
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set at build time, everything is stored in
 * Supabase (see supabase/schema.sql) so every visitor sees the same wall and scores. Without
 * them the city still works: entries are kept in this browser only.
 */
export interface Note { id: string; name: string; emoji: string; message: string; created_at: string }
export interface Score { id: string; game: GameKey; name: string; score: number; created_at: string }
export type GameKey = 'mo' | 'dj' | 'pho' | 'penalty'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const online = Boolean(URL_ && KEY)

const NAME_KEY = 'robocity_player_name'
export function playerName() {
  try { return localStorage.getItem(NAME_KEY) ?? '' } catch { return '' }
}
export function setPlayerName(n: string) {
  try { localStorage.setItem(NAME_KEY, n.trim().slice(0, 24)) } catch { /* private mode */ }
}

/** strip control characters and clamp lengths; the database checks the same limits */
const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

function local<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] } catch { return [] }
}
function saveLocal<T>(key: string, rows: T[]) {
  try { localStorage.setItem(key, JSON.stringify(rows.slice(0, 200))) } catch { /* ignore */ }
}
const uid = () => Math.random().toString(36).slice(2, 10)

/* ---------------------------------------------------------------- guestbook */

const listeners = new Set<() => void>()
export function onGuestbookChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

export async function listNotes(limit = 30): Promise<Note[]> {
  if (!online) return local<Note>('robocity_guestbook').slice(0, limit)
  return rest<Note[]>(`guestbook?select=*&order=created_at.desc&limit=${limit}`)
}

export async function postNote(name: string, emoji: string, message: string): Promise<Note> {
  const row = { name: clean(name, 24) || 'Khách ẩn danh', emoji: clean(emoji, 4) || '👋', message: clean(message, 140) }
  if (!row.message) throw new Error('Lời nhắn đang trống')
  let saved: Note
  if (!online) {
    saved = { ...row, id: uid(), created_at: new Date().toISOString() }
    saveLocal('robocity_guestbook', [saved, ...local<Note>('robocity_guestbook')])
  } else {
    saved = (await rest<Note[]>('guestbook', { method: 'POST', body: JSON.stringify(row) }))[0]
  }
  listeners.forEach(l => l())
  return saved
}

/* ---------------------------------------------------------------- leaderboards */

export async function topScores(game: GameKey, limit = 10): Promise<Score[]> {
  if (!online) return local<Score>('robocity_scores').filter(s => s.game === game).sort((a, b) => b.score - a.score).slice(0, limit)
  return rest<Score[]>(`scores?select=*&game=eq.${game}&order=score.desc&limit=${limit}`)
}

/** records a score under the visitor's name (skipped until they have chosen one) */
export async function submitScore(game: GameKey, score: number) {
  const name = playerName()
  if (!name || !Number.isFinite(score) || score <= 0) return
  const row = { game, name, score: Math.round(score) }
  if (!online) {
    saveLocal('robocity_scores', [{ ...row, id: uid(), created_at: new Date().toISOString() }, ...local<Score>('robocity_scores')])
    return
  }
  try { await rest('scores', { method: 'POST', body: JSON.stringify(row) }) } catch (e) { console.warn('score not saved', e) }
}
