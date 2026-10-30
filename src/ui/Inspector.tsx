import { useState } from 'react'
import { robots } from '../scene/vis'
import { DEPTS } from '../sim/data'
import { citySim, type CompanyMetrics } from '../sim/citySim'
import { company, viewStatus } from '../sim/engine'
import { clock, money } from '../sim/format'
import { skillsFor } from '../sim/skills'
import type { ViewStatus } from '../sim/types'
import { useUI } from '../store'
import { AgentChatModal } from './AgentChatModal'
import { Icon } from './Icon'

const STATUS: Record<ViewStatus, string> = {
  working: 'Đang làm việc',
  thinking: 'Đang suy nghĩ (LLM)',
  walking: 'Đang đi giao việc',
  idle: 'Rảnh',
  charging: 'Đang sạc pin',
  error: 'Lỗi hệ thống',
}

function CompanyInspector({ comp, onBack }: { comp: CompanyMetrics; onBack: () => void }) {
  const toggleInspector = useUI(s => s.toggleInspector)
  const setDistrict = useUI(s => s.setDistrict)

  return (
    <>
      <div className="ins-head">
        <div className="ins-head-top">
          <span className="eyebrow" style={{ '--c': comp.color } as React.CSSProperties}>
            <i className="dot" />{comp.icon} KHU VỰC DOANH NGHIỆP
          </span>
          <button className="btn-collapse" onClick={toggleInspector} title="Thu gọn bảng">
            <Icon name="chevronRight" size={14} /> Thu gọn
          </button>
        </div>
        <h2>{comp.name}</h2>
        <p className="muted">{comp.tagline}</p>
        <div className="ins-actions-row">
          <span className="pill st-working">Tự hành 100% AI</span>
          <button className="btn-chat-pill" onClick={onBack}>
            <Icon name="chevronRight" size={13} /> Về RoboCorp
          </button>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Quỹ tiền mặt</span>
          <b>{money(comp.cash)}</b>
          <span className="tile-sub good">Doanh thu: {money(comp.revenue)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Đơn hôm nay</span>
          <b>{comp.ordersToday} đơn</b>
          <span className="tile-sub">+{money(comp.todayRevenue)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Hài lòng khách</span>
          <b>{comp.satisfaction}%</b>
          <span className="meter"><i style={{ width: `${comp.satisfaction}%` }} /></span>
        </div>
        <div className="tile">
          <span className="tile-label">Trạng thái</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#10B981' }}>Đang hoạt động tốt</span>
        </div>
      </div>

      <section>
        <h3 className="sec">Hoạt động thời gian thực</h3>
        <p className="thought">“{comp.statusText}”</p>
      </section>

      <section>
        <h3 className="sec">Điều hướng nhanh</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="btn-primary" style={{ justifyContent: 'center' }} onClick={() => setDistrict('all')}>
            🏙️ Xem toàn cảnh RoboCity
          </button>
          <button className="btn-chat-pill" style={{ justifyContent: 'center', padding: '9px 12px' }} onClick={onBack}>
            💻 Bay về Trụ sở RoboCorp
          </button>
        </div>
      </section>

      <p className="hint">Kéo chuột để xoay · Cuộn để phóng to · Bấm nút trên thanh trên cùng để đổi khu vực</p>
    </>
  )
}

function CityOverview({ onSelect }: { onSelect: (id: any) => void }) {
  const toggleInspector = useUI(s => s.toggleInspector)
  const totalGdp = company.cash + citySim.myoffice.cash + citySim.bistro.cash + citySim.pagoda.cash + citySim.club.cash

  return (
    <>
      <div className="ins-head">
        <div className="ins-head-top">
          <span className="eyebrow" style={{ '--c': '#3B82F6' } as React.CSSProperties}>
            <i className="dot" />🏙️ QUY HOẠCH ĐÔ THỊ
          </span>
          <button className="btn-collapse" onClick={toggleInspector} title="Thu gọn bảng">
            <Icon name="chevronRight" size={14} /> Thu gọn
          </button>
        </div>
        <h2>RoboCity Metropolis</h2>
        <p className="muted">Tổ hợp Đô thị AI Đa sắc màu</p>
      </div>

      <div className="tiles">
        <div className="tile wide">
          <span className="tile-label">Tổng ngân quỹ đô thị</span>
          <b style={{ fontSize: '20px', color: '#10B981' }}>{money(totalGdp)}</b>
          <span className="tile-sub">RoboCorp + MyOffice Dev + Phố Ẩm thực + Chùa AI + Vũ trường</span>
        </div>
      </div>

      <section>
        <h3 className="sec">Danh sách địa điểm & Khu vực</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skill-card" style={{ cursor: 'pointer' }} onClick={() => onSelect('robocorp')}>
            <span className="skill-icon">💻</span>
            <div className="skill-body">
              <b>RoboCorp (Công nghệ & Phần cứng)</b>
              <p>Quỹ: {money(company.cash)} · {company.bots.length} robot tự hành</p>
            </div>
          </div>
          <div className="skill-card" style={{ cursor: 'pointer' }} onClick={() => onSelect('myoffice')}>
            <span className="skill-icon">🏢</span>
            <div className="skill-body">
              <b>MyOffice AI Agency (Đại bản doanh Dev)</b>
              <p>Quỹ: {money(citySim.myoffice.cash)} · Đèn Giám đốc, Server Racks & Phòng họp kính</p>
            </div>
          </div>
          <div className="skill-card" style={{ cursor: 'pointer' }} onClick={() => onSelect('bistro')}>
            <span className="skill-icon">🍜</span>
            <div className="skill-body">
              <b>RoboBistro (Phố Ẩm thực Ramen & Bar)</b>
              <p>Quỹ: {money(citySim.bistro.cash)} · Bếp Ramen bốc khói & Khách người thật</p>
            </div>
          </div>
          <div className="skill-card" style={{ cursor: 'pointer' }} onClick={() => onSelect('pagoda')}>
            <span className="skill-icon">🛕</span>
            <div className="skill-body">
              <b>Chùa Khánh An AI (Thiền viện Công nghệ)</b>
              <p>Công đức: {money(citySim.pagoda.cash)} · Tháp lục giác, Tượng Phật Ngọc & Sư Thầy</p>
            </div>
          </div>
          <div className="skill-card" style={{ cursor: 'pointer' }} onClick={() => onSelect('club')}>
            <span className="skill-icon">🪩</span>
            <div className="skill-body">
              <b>Neon Beats Club (Vũ trường Cyber DJ)</b>
              <p>Quỹ: {money(citySim.club.cash)} · DJ Robot, Cột Laser xoay & Dancers người thật</p>
            </div>
          </div>
        </div>
      </section>

      <p className="hint">Bấm vào bất kỳ địa điểm nào để camera tự động bay tới khám phá chi tiết</p>
    </>
  )
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
  const district = useUI(s => s.district)
  const setDistrict = useUI(s => s.setDistrict)
  const toggleInspector = useUI(s => s.toggleInspector)
  const [chatOpen, setChatOpen] = useState(false)

  // When viewing another company district, display its custom company overview
  if (district === 'myoffice') {
    return (
      <aside className="card inspector" aria-live="polite">
        <CompanyInspector comp={citySim.myoffice} onBack={() => setDistrict('robocorp')} />
      </aside>
    )
  }
  if (district === 'bistro') {
    return (
      <aside className="card inspector" aria-live="polite">
        <CompanyInspector comp={citySim.bistro} onBack={() => setDistrict('robocorp')} />
      </aside>
    )
  }
  if (district === 'pagoda') {
    return (
      <aside className="card inspector" aria-live="polite">
        <CompanyInspector comp={citySim.pagoda} onBack={() => setDistrict('robocorp')} />
      </aside>
    )
  }
  if (district === 'club') {
    return (
      <aside className="card inspector" aria-live="polite">
        <CompanyInspector comp={citySim.club} onBack={() => setDistrict('robocorp')} />
      </aside>
    )
  }
  if (district === 'all') {
    return (
      <aside className="card inspector" aria-live="polite">
        <CityOverview onSelect={(id) => setDistrict(id)} />
      </aside>
    )
  }

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
        <div className="ins-head-top">
          <span className="eyebrow" style={{ '--c': dept.color } as React.CSSProperties}><i className="dot" />{dept.icon} {dept.name}</span>
          <button className="btn-collapse" onClick={toggleInspector} title="Thu gọn bảng robot (Ấn lại ở cạnh phải)">
            <Icon name="chevronRight" size={14} /> Thu gọn
          </button>
        </div>
        <h2>{bot.name}</h2>
        <p className="muted">{bot.role} · {bot.persona}</p>
        <div className="ins-actions-row">
          <span className={`pill st-${st}`}>{STATUS[st]}</span>
          <button className="btn-chat-pill" onClick={() => setChatOpen(true)}>
            <Icon name="message" size={13} /> Chat với {bot.name.replace('-Bot', '')}
          </button>
        </div>
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
        <h3 className="sec">Kỹ năng đặc thù (Skills)</h3>
        <div className="skills-list">
          {skillsFor(bot.dept).length ? (
            skillsFor(bot.dept).map(sk => (
              <div key={sk.id} className="skill-card">
                <span className="skill-icon">{sk.icon}</span>
                <div className="skill-body">
                  <b>{sk.name}</b>
                  <p>{sk.desc}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="muted" style={{ fontSize: '11.5px' }}>Robot phụ trách nghiệp vụ cốt lõi.</p>
          )}
        </div>
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
      {chatOpen && <AgentChatModal botId={selected} onClose={() => setChatOpen(false)} />}
    </aside>
  )
}
