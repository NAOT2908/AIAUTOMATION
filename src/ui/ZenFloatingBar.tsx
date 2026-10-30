import { useState } from 'react'
import { sound } from '../audio/sound'
import { company } from '../sim/engine'
import { clock } from '../sim/format'
import { useUI, type District } from '../store'
import { Icon } from './Icon'

const ZEN_DISTRICTS: { id: District; label: string; icon: string }[] = [
  { id: 'all', label: 'RoboCity', icon: '🏙️' },
  { id: 'robocorp', label: 'RoboCorp', icon: '💻' },
  { id: 'myoffice', label: 'MyOffice', icon: '🏢' },
  { id: 'bistro', label: 'Ẩm thực', icon: '🍜' },
  { id: 'pagoda', label: 'Chùa AI', icon: '🛕' },
  { id: 'club', label: 'Club DJ', icon: '🪩' },
]

export function ZenFloatingBar() {
  useUI(s => s.tick)
  const speed = useUI(s => s.speed)
  const setSpeed = useUI(s => s.setSpeed)
  const togglePause = useUI(s => s.togglePause)
  const toggleZenMode = useUI(s => s.toggleZenMode)
  const district = useUI(s => s.district)
  const setDistrict = useUI(s => s.setDistrict)

  const [sfxMuted, setSfxMuted] = useState(() => sound.isSfxMuted())
  const [bgmMuted, setBgmMuted] = useState(() => sound.isBgmMuted())

  const toggleSfx = () => {
    const next = sound.toggleSfx()
    setSfxMuted(next)
  }

  const toggleBgm = () => {
    const next = sound.toggleBgm()
    setBgmMuted(next)
  }

  const toggleFullscreenNative = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  return (
    <div className="zen-floating-bar" role="toolbar" aria-label="Điều khiển toàn cảnh 3D">
      <div className="zen-time-badge">
        <span className="dot-live" />
        <b>Ngày {company.day}</b> · {clock(company.t)}
      </div>

      <div className="zen-btn-group" role="group" aria-label="Chuyển công ty">
        {ZEN_DISTRICTS.map(d => (
          <button
            key={d.id}
            className={`zen-btn ${district === d.id ? 'active' : ''}`}
            onClick={() => setDistrict(d.id)}
            title={`Xem ${d.label}`}
          >
            <span>{d.icon}</span> <small style={{ fontSize: '11px', fontWeight: 600 }}>{d.label}</small>
          </button>
        ))}
      </div>

      <div className="zen-btn-group">
        <button
          className="zen-btn"
          onClick={togglePause}
          title={speed ? 'Tạm dừng (Phím Space)' : 'Tiếp tục (Phím Space)'}
        >
          {speed ? '❚❚' : '▶'}
        </button>
        {[1, 2, 5].map(s => (
          <button
            key={s}
            className={`zen-btn ${speed === s ? 'active' : ''}`}
            onClick={() => setSpeed(s)}
            title={`Tốc độ x${s}`}
          >
            x{s}
          </button>
        ))}
      </div>

      <div className="zen-btn-group">
        <button
          className={`zen-btn ${!sfxMuted ? 'active' : ''}`}
          onClick={toggleSfx}
          title={sfxMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          <Icon name={sfxMuted ? 'volumeX' : 'volume'} size={14} />
        </button>
        <button
          className={`zen-btn ${!bgmMuted ? 'active' : ''}`}
          onClick={toggleBgm}
          title={bgmMuted ? 'Bật nhạc nền' : 'Tắt nhạc nền'}
        >
          <Icon name="music" size={14} />
        </button>
      </div>

      <button className="zen-btn" onClick={toggleFullscreenNative} title="Toàn màn hình trình duyệt">
        <Icon name="fullscreen" size={14} />
      </button>

      <button className="zen-btn-primary" onClick={toggleZenMode} title="Hiện lại giao diện đầy đủ (Phím H)">
        <Icon name="eye" size={14} /> Hiện giao diện
      </button>
    </div>
  )
}
