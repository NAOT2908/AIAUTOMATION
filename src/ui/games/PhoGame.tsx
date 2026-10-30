import { useEffect, useRef, useState } from 'react'
import { sound } from '../../audio/sound'
import { speak } from '../../scene/chatter'
import { submitScore } from '../../net/online'

interface Item { id: string; icon: string; name: string; decoy?: boolean }
const ITEMS: Item[] = [
  { id: 'banh', icon: '🍜', name: 'Bánh phở' },
  { id: 'nuoc', icon: '🥣', name: 'Nước dùng' },
  { id: 'tai', icon: '🥩', name: 'Bò tái' },
  { id: 'chin', icon: '🍖', name: 'Bò chín' },
  { id: 'ga', icon: '🍗', name: 'Thịt gà' },
  { id: 'hanh', icon: '🧅', name: 'Hành' },
  { id: 'rau', icon: '🌿', name: 'Rau thơm' },
  { id: 'ot', icon: '🌶️', name: 'Ớt' },
  { id: 'chanh', icon: '🍋', name: 'Chanh' },
  { id: 'kem', icon: '🍦', name: 'Kem', decoy: true },
  { id: 'socola', icon: '🍫', name: 'Socola', decoy: true },
  { id: 'phomai', icon: '🧀', name: 'Phô mai', decoy: true },
]
const DISHES = [
  { name: 'Phở bò tái', need: ['banh', 'nuoc', 'tai', 'hanh'] },
  { name: 'Phở bò chín', need: ['banh', 'nuoc', 'chin', 'hanh'] },
  { name: 'Phở tái chín', need: ['banh', 'nuoc', 'tai', 'chin', 'rau'] },
  { name: 'Phở gà', need: ['banh', 'nuoc', 'ga', 'hanh', 'chanh'] },
  { name: 'Phở bò cay', need: ['banh', 'nuoc', 'tai', 'ot', 'rau'] },
]
const CUSTOMERS = ['Anh dev đói bụng', 'Chị kế toán', 'Bác xe ôm', 'Em sinh viên', 'Robot giao hàng', 'Sếp RoboCorp']
const HAPPY = ['Ngon tuyệt cú mèo! 😋', 'Đúng vị Hà Nội luôn!', 'Mai mình lại ghé nha!', 'Nước dùng đỉnh thật sự 👌']
const ANGRY: Record<string, string> = {
  kem: 'Phở có KEM?? Fusion vậy ai chịu nổi! 🍦',
  socola: 'Socola trong phở… em đang thử thách anh à? 🍫',
  phomai: 'Phở phô mai… chắc đây là phở Ý? 🧀',
  missing: 'Thiếu món rồi em ơi, tô phở buồn quá 😢',
  extra: 'Ủa sao lại có cái này, anh đâu có gọi 🤔',
  late: 'Thôi anh đi ăn bún chả vậy… 😤',
}
const PATIENCE = 14
const BEST = 'robocity_pho_best'

function newOrder() {
  return { dish: DISHES[Math.floor(Math.random() * DISHES.length)], who: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)], at: performance.now() }
}

export function PhoGame() {
  const [order, setOrder] = useState(newOrder)
  const [bowl, setBowl] = useState<string[]>([])
  const [coins, setCoins] = useState(0)
  const [served, setServed] = useState(0)
  const [say, setSay] = useState<{ text: string; good: boolean } | null>(null)
  const [left, setLeft] = useState(1)
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(BEST)) || 0 } catch { return 0 } })
  const busy = useRef(false)

  const next = () => { setOrder(newOrder()); setBowl([]); busy.current = false }

  const finish = (text: string, good: boolean, tip = 0) => {
    busy.current = true
    setSay({ text, good })
    sound.playResult(good)
    if (good) {
      setCoins(c => {
        const n = c + tip
        if (n > best) { setBest(n); try { localStorage.setItem(BEST, String(n)) } catch { /* ignore */ } }
        if (n >= 100 && Math.floor(n / 100) > Math.floor(c / 100)) submitScore('pho', n)
        return n
      })
      setServed(s => s + 1)
      speak('phuc-vu', `${order.dish} của anh chị đây ạ! 🍜`)
    }
    setTimeout(() => { setSay(null); next() }, 1800)
  }

  useEffect(() => {
    const id = setInterval(() => {
      if (busy.current) return
      const l = 1 - (performance.now() - order.at) / 1000 / PATIENCE
      setLeft(Math.max(0, l))
      if (l <= 0) finish(ANGRY.late, false)
    }, 100)
    return () => clearInterval(id)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const add = (it: Item) => {
    if (busy.current || bowl.includes(it.id)) return
    sound.playBeep(500 + bowl.length * 80, 0.06)
    setBowl(b => [...b, it.id])
  }

  const serve = () => {
    if (busy.current) return
    const decoy = bowl.find(id => ITEMS.find(i => i.id === id)?.decoy)
    if (decoy) return finish(ANGRY[decoy], false)
    if (order.dish.need.some(id => !bowl.includes(id))) return finish(ANGRY.missing, false)
    if (bowl.some(id => !order.dish.need.includes(id))) return finish(ANGRY.extra, false)
    const tip = 20 + Math.round(left * 30)
    finish(`${HAPPY[Math.floor(Math.random() * HAPPY.length)]} (+${tip} xu)`, true, tip)
  }

  return (
    <div className="pho-game">
      <div className="pho-hud">
        <span>Xu <b>{coins}</b></span>
        <span>Đã phục vụ <b>{served}</b></span>
        <span>Kỷ lục <b>{best}</b></span>
      </div>
      <div className="pho-order">
        <div className="pho-customer">🧑‍🍳 <b>{order.who}</b> gọi: <span className="pho-dish">{order.dish.name}</span></div>
        <div className="pho-patience"><i style={{ width: `${left * 100}%`, background: left < 0.3 ? 'var(--bad)' : left < 0.6 ? 'var(--warn)' : 'var(--good)' }} /></div>
        {say && <div className={`pho-say ${say.good ? 'good' : 'bad'}`}>{say.text}</div>}
      </div>
      <div className="pho-bowl" aria-label="Tô phở">
        <span className="pho-bowl-base">🥣</span>
        <div className="pho-bowl-items">{bowl.map(id => <span key={id}>{ITEMS.find(i => i.id === id)!.icon}</span>)}</div>
      </div>
      <div className="pho-items">
        {ITEMS.map(it => (
          <button key={it.id} className="pc-btn" disabled={bowl.includes(it.id)} onClick={() => add(it)}>
            <span>{it.icon}</span>{it.name}
          </button>
        ))}
      </div>
      <div className="pc-actions">
        <button className="pc-btn" onClick={() => setBowl([])}>🗑️ Đổ tô làm lại</button>
        <button className="btn-primary" onClick={serve} disabled={!bowl.length}>🛎️ Bưng ra!</button>
      </div>
    </div>
  )
}
