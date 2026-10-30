import { useEffect, useRef, useState } from 'react'
import { sound } from '../audio/sound'
import { CHAOS } from '../sim/data'
import { company } from '../sim/engine'
import { clock, money } from '../sim/format'
import { useUI, type District } from '../store'
import { AISettingsModal } from './AISettingsModal'
import { Icon, type IconName } from './Icon'

const SPEEDS = [0, 1, 2, 5]

const DISTRICTS: { id: District; name: string; icon: string }[] = [
  { id: 'all', name: 'Thành phố', icon: '🏙️' },
  { id: 'robocorp', name: 'RoboCorp', icon: '💻' },
  { id: 'myoffice', name: 'MyOffice AI', icon: '🏢' },
  { id: 'bistro', name: 'Quán ăn & Bar', icon: '🍜' },
  { id: 'pagoda', name: 'Chùa Khánh An', icon: '🛕' },
  { id: 'club', name: 'Vũ trường DJ', icon: '🪩' },
]

function Kpi({ icon, label, value, sub, tone }: { icon: IconName; label: string; value: string; sub: React.ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="card kpi">
      <span className="kpi-icon"><Icon name={icon} /></span>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <b className="kpi-value">{value}</b>
        <span className={`kpi-sub ${tone ?? ''}`}>{sub}</span>
      </div>
    </div>
  )
}

function ChaosMenu() {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  return (
    <div className="chaos" ref={wrap}>
      <button className="btn-primary" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Icon name="bolt" size={16} /> Tung sự kiện
      </button>
      {open && (
        <div className="menu" role="menu">
          {CHAOS.map(c => (
            <button key={c.id} role="menuitem" onClick={() => { company.trigger(c.id); setOpen(false) }}>
              <span>{c.label}</span>
              <small>{c.hint}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TopBar() {
  useUI(s => s.tick)
  const speed = useUI(s => s.speed)
  const setSpeed = useUI(s => s.setSpeed)
  const quality = useUI(s => s.quality)
  const setQuality = useUI(s => s.setQuality)
  const zenMode = useUI(s => s.zenMode)
  const toggleZenMode = useUI(s => s.toggleZenMode)
  const district = useUI(s => s.district)
  const setDistrict = useUI(s => s.setDistrict)

  const [sfxMuted, setSfxMuted] = useState(() => sound.isSfxMuted())
  const [bgmMuted, setBgmMuted] = useState(() => sound.isBgmMuted())
  const [aiModalOpen, setAiModalOpen] = useState(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    return params ? params.get('ai') === '1' || params.get('settings') === '1' : false
  })

  const toggleSfx = () => {
    const next = sound.toggleSfx()
    setSfxMuted(next)
  }

  const toggleBgm = () => {
    const next = sound.toggleBgm()
    setBgmMuted(next)
  }

  const hist = company.cashHistory
  const dayAgo = hist[Math.max(0, hist.length - 31)]
  const delta = company.cash - dayAgo
  const pct = Math.max(0, Math.min(100, Math.round((company.profit / company.target) * 100)))
  const charging = company.bots.filter(b => b.status === 'charging').length
  const sat = Math.round(company.satisfaction)
  const energy = Math.round(company.avgEnergy)

  return (
    <header className="hud">
      <div className="card brand">
        <div className="brand-mark" aria-hidden="true"><i /><i /></div>
        <div className="brand-text">
          <h1>RoboCorp</h1>
          <span className="clock">Ngày <b>{company.day}</b> · <b>{clock(company.t)}</b></span>
        </div>
        <div className="seg" role="group" aria-label="Tốc độ mô phỏng">
          {SPEEDS.map(s => (
            <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)} title={s ? `Tốc độ x${s}` : 'Tạm dừng (phím Space)'}>
              {s ? `x${s}` : '❚❚'}
            </button>
          ))}
        </div>
      </div>

      <nav className="card district-nav" aria-label="Chọn công ty / Khu vực">
        {DISTRICTS.map(d => (
          <button
            key={d.id}
            className={`dist-tab ${district === d.id ? 'active' : ''}`}
            onClick={() => setDistrict(d.id)}
            title={`Xem ${d.name}`}
          >
            <span className="dist-tab-icon">{d.icon}</span>
            <span className="dist-tab-label">{d.name}</span>
          </button>
        ))}
      </nav>

      <div className="kpis">
        <Kpi icon="cash" label="Tiền mặt" value={money(company.cash)} tone={delta >= 0 ? 'good' : 'bad'}
          sub={`${delta >= 0 ? '▲' : '▼'} ${money(Math.abs(delta))} / 24h`} />
        <Kpi icon="trend" label="Lợi nhuận" value={money(company.profit)} tone={company.profit >= 0 ? 'good' : 'bad'}
          sub={<><span className="meter"><i style={{ width: `${pct}%` }} /></span>{pct}% mục tiêu</>} />
        <Kpi icon="box" label="Tồn kho" value={`${company.stockUnits.toLocaleString('vi-VN')} sp`} tone={company.backorders.length ? 'bad' : undefined}
          sub={company.backorders.length ? `${company.backorders.length} đơn chờ hàng` : 'Không có đơn chờ'} />
        <Kpi icon="smile" label="Hài lòng KH" value={`${sat}%`} tone={sat < 70 ? 'bad' : 'good'}
          sub={sat >= 85 ? 'Rất tốt' : sat >= 70 ? 'Ổn định' : 'Cần cải thiện'} />
        <Kpi icon="battery" label="Pin trung bình" value={`${energy}%`} tone={energy < 40 ? 'bad' : undefined}
          sub={charging ? `${charging} robot đang sạc` : 'Không ai đang sạc'} />
      </div>

      <div className="card controls">
        <div className="seg" role="group" aria-label="Âm thanh và Nhạc">
          <button
            onClick={toggleSfx}
            title={sfxMuted ? 'Bật hiệu ứng âm thanh' : 'Tắt hiệu ứng âm thanh'}
            aria-pressed={!sfxMuted}
          >
            <Icon name={sfxMuted ? 'volumeX' : 'volume'} size={15} />
          </button>
          <button
            onClick={toggleBgm}
            title={bgmMuted ? 'Bật nhạc nền Lo-fi' : 'Tắt nhạc nền Lo-fi'}
            aria-pressed={!bgmMuted}
          >
            <Icon name="music" size={15} /> {bgmMuted ? 'Nhạc' : '♫ Bật'}
          </button>
        </div>

        <button className="btn-ai-pill" onClick={() => setAiModalOpen(true)} title="Cài đặt Não bộ AI (Google Gemini)">
          <Icon name="sparkles" size={14} /> Não bộ AI
        </button>

        <button
          className={`btn-zen-pill ${zenMode ? 'active' : ''}`}
          onClick={toggleZenMode}
          title="Toàn cảnh 3D / Ẩn tất cả tab (Phím H)"
        >
          <Icon name={zenMode ? 'minimize' : 'fullscreen'} size={14} /> Toàn cảnh
        </button>

        <div className="seg" role="group" aria-label="Chất lượng đồ họa">
          <button aria-pressed={quality === 'high'} onClick={() => setQuality('high')}>Đẹp</button>
          <button aria-pressed={quality === 'low'} onClick={() => setQuality('low')}>Nhanh</button>
        </div>
        <ChaosMenu />
      </div>

      <AISettingsModal open={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </header>
  )
}
