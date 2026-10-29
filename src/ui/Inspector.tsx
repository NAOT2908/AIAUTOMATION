import { robots } from '../scene/vis'
import { DEPTS } from '../sim/data'
import { company, viewStatus } from '../sim/engine'
import { clock, money } from '../sim/format'
import type { ViewStatus } from '../sim/types'
import { useUI } from '../store'

const STATUS: Record<ViewStatus, string> = {
  working: 'Đang làm việc',
  thinking: 'Đang suy nghĩ (LLM)',
  walking: 'Đang đi giao việc',
  idle: 'Rảnh',
  charging: 'Đang sạc pin',
  error: 'Lỗi hệ thống',
}

function Sparkline({ data }: { data: number[] }) {
  const W = 300, H = 70
  const lo = Math.min(0, ...data), hi = Math.max(...data) * 1.08 || 1
  const x = (i: number) => (i / Math.max(1, data.length - 1)) * W
  const y = (v: number) => H - 6 - ((v - lo) / (hi - lo)) * (H - 12)
  const line = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = data[data.length - 1]
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Biểu đồ tiền mặt">
      {[0.33, 0.66].map(f => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="spark-grid" />)}
      <polygon points={`0,${H} ${line} ${W},${H}`} className="spark-area" />
      <polyline points={line} className="spark-line" />
      <circle cx={x(data.length - 1)} cy={y(last)} r="3.5" className="spark-dot" />
    </svg>
  )
}

export function Inspector() {
  useUI(s => s.tick)
  const selected = useUI(s => s.selected)
  const select = useUI(s => s.select)
  const bot = company.bot(selected)
  const dept = DEPTS[bot.dept]
  const walking = (robots.get(bot.id)?.path.length ?? 0) > 0
  const st = viewStatus(bot, company.t, walking)

  return (
    <aside className="card inspector" aria-live="polite">
      <nav className="roster" aria-label="Chọn robot">
        {company.bots.map(b => (
          <button key={b.id} aria-pressed={b.id === selected} onClick={() => select(b.id)} title={b.name} style={{ '--c': DEPTS[b.dept].color } as React.CSSProperties}>
            <i />{b.name.replace('-Bot', '')}
          </button>
        ))}
      </nav>

      <div className="ins-head">
        <span className="eyebrow" style={{ '--c': dept.color } as React.CSSProperties}><i className="dot" />{dept.icon} {dept.name}</span>
        <h2>{bot.name}</h2>
        <p className="muted">{bot.role} · {bot.persona}</p>
        <span className={`pill st-${st}`}>{STATUS[st]}</span>
      </div>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Pin</span>
          <b>{Math.round(bot.energy)}%</b>
          <span className={`meter ${bot.energy < 30 ? 'low' : ''}`}><i style={{ width: `${bot.energy}%` }} /></span>
        </div>
        <div className="tile">
          <span className="tile-label">Việc đã làm</span>
          <b>{bot.done}</b>
          <span className="tile-sub">từ đầu ván</span>
        </div>
        <div className="tile wide">
          <span className="tile-label">Bộ não</span>
          <span>{bot.brain}</span>
        </div>
      </div>

      <section>
        <h3 className="sec">Đang nghĩ</h3>
        <p className="thought">“{bot.thought}”</p>
      </section>

      <section>
        <h3 className="sec">Gần đây</h3>
        <ul className="recent">
          {bot.history.length ? bot.history.map(e => (
            <li key={e.id}><time>{clock(e.t)}</time><span>{e.text}</span></li>
          )) : <li className="muted">Chưa có hoạt động.</li>}
        </ul>
      </section>

      <section>
        <h3 className="sec">Kho hàng</h3>
        <ul className="stock">
          {company.products.map(p => {
            const [cls, label] = p.openPO ? ['po', 'Đã đặt PO'] : p.stock <= p.reorderPoint ? ['low', 'Sắp hết'] : ['ok', 'Còn hàng']
            return (
              <li key={p.sku}>
                <span className="sku">{p.sku}</span>
                <span className="pname">{p.name}</span>
                <b>{p.stock.toLocaleString('vi-VN')}</b>
                <span className={`badge ${cls}`}>{label}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h3 className="sec">Tiền mặt · {money(company.cash)}</h3>
        <Sparkline data={company.cashHistory.concat(company.cash)} />
      </section>

      <p className="hint">Kéo để xoay · cuộn để phóng to · bấm vào robot hoặc phòng để xem chi tiết</p>
    </aside>
  )
}
