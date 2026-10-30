import { useEffect, useRef, type ReactNode } from 'react'
import { TV_CHANNELS, coffeeFx, tvState } from '../scene/Gadgets'
import { DEPTS } from '../sim/data'
import { company } from '../sim/engine'
import { clock, money } from '../sim/format'
import { useUI, type PropId } from '../store'
import { Icon } from './Icon'

/** tooltip that follows the pointer while it is over clickable furniture */
export function PropTooltip() {
  const hover = useUI(s => s.hoverProp)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate3d(${e.clientX + 14}px, ${e.clientY + 16}px, 0)`
    }
    addEventListener('pointermove', move, { passive: true })
    return () => removeEventListener('pointermove', move)
  }, [])
  return (
    <div ref={ref} className="prop-tip" hidden={!hover} aria-hidden="true">
      <b>{hover?.name}</b>
      <span>{hover?.hint}</span>
    </div>
  )
}

function Rows({ rows }: { rows: [string, ReactNode, ('good' | 'bad')?][] }) {
  return (
    <dl className="pc-rows">
      {rows.map(([k, v, tone]) => (
        <div key={k}><dt>{k}</dt><dd className={tone}>{v}</dd></div>
      ))}
    </dl>
  )
}

function Meter({ value, tone }: { value: number; tone?: 'bad' | 'warn' }) {
  return <span className={`meter wide ${tone === 'bad' ? 'low' : ''}`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>
}

interface CardBody { icon: string; title: string; subtitle: string; body: ReactNode }

function cardFor(id: PropId): CardBody {
  const c = company
  switch (id) {
    case 'tv':
      return {
        icon: '📺', title: 'TV phòng Giám đốc', subtitle: 'Bấm vào TV trong cảnh hoặc chọn kênh ở đây',
        body: (
          <>
            <div className="pc-actions">
              {TV_CHANNELS.map((name, i) => (
                <button key={name} className="pc-btn" aria-pressed={tvState.channel === i} onClick={() => { tvState.channel = i; tvState.redraw() }}>{name}</button>
              ))}
            </div>
            <Rows rows={[
              ['Tiền mặt', money(c.cash)],
              ['Lợi nhuận', money(c.profit), c.profit >= 0 ? 'good' : 'bad'],
              ['Đơn hôm nay', `${c.today.orders} đơn · ${money(c.today.revenue)}`],
              ['Hài lòng khách', `${Math.round(c.satisfaction)}%`],
            ]} />
          </>
        ),
      }
    case 'salesTv': {
      const reps = [c.bot('sales1'), c.bot('sales2')].sort((a, b) => b.done - a.done)
      return {
        icon: '🏆', title: 'Bảng xếp hạng Sales', subtitle: 'Số việc mỗi Sales-Bot đã làm từ đầu ván',
        body: <Rows rows={[...reps.map((b, i) => [`${i === 0 ? '🥇' : '🥈'} ${b.name}`, `${b.done} việc · pin ${Math.round(b.energy)}%`] as [string, string]), ['Hôm nay', `${c.today.orders} đơn · ${money(c.today.revenue)}`]]} />,
      }
    }
    case 'coffee':
      return {
        icon: '☕', title: 'Máy pha cà phê', subtitle: 'Mỗi ấm: +8% pin cho mọi robot không ở trạm sạc',
        body: (
          <>
            <ul className="pc-list">
              {c.bots.slice().sort((a, b) => a.energy - b.energy).map(b => (
                <li key={b.id}><span><i className="dot" style={{ '--c': DEPTS[b.dept].color } as React.CSSProperties} />{b.name}</span><Meter value={b.energy} tone={b.energy < 30 ? 'bad' : undefined} /><b>{Math.round(b.energy)}%</b></li>
              ))}
            </ul>
            <button className="btn-primary" onClick={() => coffeeFx.brew()}>☕ Pha thêm một ấm</button>
          </>
        ),
      }
    case 'ledger':
      return {
        icon: '📒', title: 'Sổ cái kế toán', subtitle: 'Số liệu lũy kế từ đầu ván',
        body: (
          <>
            <Rows rows={[
              ['Doanh thu (511)', money(c.revenue)],
              ['Giá vốn (632)', money(c.cogs)],
              ['Chi phí (641/642)', money(c.expenses)],
              ['Lợi nhuận', money(c.profit), c.profit >= 0 ? 'good' : 'bad'],
              ['Phải thu khách (131)', money(c.receivable)],
              ['Tiền mặt (112)', money(c.cash)],
            ]} />
            <p className="pc-note">Bút toán gần nhất</p>
            <ul className="pc-log">
              {c.logs.filter(e => e.dept === 'acc').slice(0, 4).map(e => <li key={e.id}><time>{clock(e.t)}</time>{e.text}</li>)}
            </ul>
          </>
        ),
      }
    case 'chargers': {
      const charging = c.bots.filter(b => b.status === 'charging')
      return {
        icon: '🔋', title: 'Trạm sạc pin', subtitle: 'HR-Bot đưa robot dưới 28% pin đi sạc 40 phút',
        body: (
          <>
            <Rows rows={[['Đang sạc', charging.length ? charging.map(b => b.name).join(', ') : 'Không có ai'], ['Pin trung bình', `${Math.round(c.avgEnergy)}%`]]} />
            <ul className="pc-list">
              {c.bots.slice().sort((a, b) => a.energy - b.energy).slice(0, 4).map(b => (
                <li key={b.id}><span>{b.name}</span><Meter value={b.energy} tone={b.energy < 30 ? 'bad' : undefined} /><b>{Math.round(b.energy)}%</b></li>
              ))}
            </ul>
          </>
        ),
      }
    }
    case 'stock':
      return {
        icon: '📦', title: 'Kệ hàng', subtitle: 'Vạch trắng là mức đặt lại; thấp hơn thì Buyer tự đặt hàng',
        body: (
          <ul className="pc-list stock-list">
            {c.products.map(p => {
              const low = p.stock <= p.reorderPoint
              return (
                <li key={p.sku}>
                  <span>{p.name}<small>{p.stock} sp · mức đặt {p.reorderPoint}</small></span>
                  <button className="pc-btn" disabled={p.openPO} onClick={() => c.reorderNow(p.sku)}>
                    {p.openPO ? 'Đã đặt PO' : low ? 'Đặt gấp' : 'Đặt thêm'}
                  </button>
                </li>
              )
            })}
          </ul>
        ),
      }
    case 'suppliers':
      return {
        icon: '🗂️', title: 'Hồ sơ nhà cung cấp', subtitle: 'Buyer-Bot chọn NCC rẻ nhất trong số giao kịp',
        body: (
          <table className="pc-table">
            <thead><tr><th>Nhà cung cấp</th><th>Giá</th><th>Giao</th></tr></thead>
            <tbody>
              {c.suppliers.map(s => (
                <tr key={s.name}><td>{s.name}</td><td className={s.factor > 1.05 ? 'bad' : s.factor < 1 ? 'good' : ''}>{Math.round(s.factor * 100)}%</td><td>{s.lead} ngày</td></tr>
              ))}
            </tbody>
          </table>
        ),
      }
    case 'servers': {
      const down = c.t < c.outageUntil
      return {
        icon: '🖥️', title: 'Tủ máy chủ', subtitle: down ? 'CRM đang sập: Sales không tra được tồn kho' : 'Mọi dịch vụ đang chạy',
        body: (
          <>
            <Rows rows={[
              ['CRM', down ? `Sập · còn ~${Math.ceil(c.outageUntil - c.t)} phút` : 'Hoạt động', down ? 'bad' : 'good'],
              ['IT-Bot', c.bot('it').status === 'error' ? 'Đang xử lý sự cố' : 'Sẵn sàng'],
            ]} />
            <div className="pc-actions">
              <button className="btn-primary" onClick={() => c.rebootServers()}>🔁 {down ? 'Khởi động lại ngay (120 $)' : 'Kiểm tra hệ thống'}</button>
              <button className="pc-btn" onClick={() => c.trigger('outage')} disabled={down}>Thử gây sự cố</button>
            </div>
          </>
        ),
      }
    }
    case 'campaign': {
      const slow = c.products.slice().sort((a, b) => a.sold - b.sold)
      return {
        icon: '📣', title: 'Bảng kế hoạch marketing', subtitle: c.frugal ? 'CEO đang yêu cầu tiết kiệm: chiến dịch sẽ bị hoãn' : 'Chiến dịch nhắm vào sản phẩm bán chậm nhất (1.500 $)',
        body: (
          <>
            <ul className="pc-list">
              {slow.map(p => (
                <li key={p.sku}><span>{p.name}{p.demand > 1 && <small className="good">đang chạy chiến dịch</small>}</span><b>{p.sold} đã bán</b></li>
              ))}
            </ul>
            <button className="btn-primary" disabled={c.frugal} onClick={() => c.runCampaign()}>🚀 Chạy chiến dịch ngay</button>
          </>
        ),
      }
    }
    case 'truck': {
      const open = c.products.filter(p => p.openPO)
      return {
        icon: '🚚', title: 'Xe tải RoboCorp', subtitle: 'Mỗi lần giao đơn hoặc nhận hàng, xe ghé cổng một lần',
        body: <Rows rows={[['Đơn chờ hàng', String(c.backorders.length), c.backorders.length ? 'bad' : 'good'], ['Hàng đang về', open.length ? open.map(p => p.name).join(', ') : 'Không có']]} />,
      }
    }
    case 'lounge': {
      const pct = Math.max(0, Math.round((c.profit / c.target) * 100))
      return {
        icon: '🛋️', title: 'Góc tiếp khách', subtitle: 'Vượt mục tiêu lãi tháng thì cả công ty mở tiệc',
        body: (
          <>
            <Rows rows={[['Mục tiêu lãi', money(c.target)], ['Đã đạt', `${money(c.profit)} · ${pct}%`, pct >= 100 ? 'good' : undefined], ['Tiệc mừng', c.partyDone ? 'Đã tổ chức 🎉' : 'Chưa']]} />
            <Meter value={pct} />
          </>
        ),
      }
    }
  }
}

export function PropCard() {
  useUI(s => s.tick)
  const id = useUI(s => s.openProp)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') useUI.setState({ openProp: null }) }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])
  if (!id) return null
  const card = cardFor(id)
  return (
    <aside className="card prop-card" aria-label={card.title}>
      <header>
        <span className="pc-icon" aria-hidden="true">{card.icon}</span>
        <div>
          <h2>{card.title}</h2>
          <p>{card.subtitle}</p>
        </div>
        <button className="pc-close" onClick={() => useUI.setState({ openProp: null })} aria-label="Đóng"><Icon name="close" size={16} /></button>
      </header>
      <div className="pc-body">{card.body}</div>
    </aside>
  )
}
