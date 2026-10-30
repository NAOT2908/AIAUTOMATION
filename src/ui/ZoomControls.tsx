import { useEffect, useState } from 'react'
import { world } from '../scene/Atmosphere'
import { roofControl } from '../scene/Districts'
import { startFire, startFireworks } from '../scene/Services'
import { camNav } from '../scene/Office'
import { Icon } from './Icon'
import { useUI } from '../store'

const TIME_NEXT = { auto: 'day', day: 'night', night: 'auto' } as const
const TIME_LABEL = { auto: '🔁 Tự động', day: '☀️ Ngày', night: '🌙 Đêm' }
const RAIN_NEXT = { auto: 'on', on: 'off', off: 'auto' } as const
const RAIN_LABEL = { auto: '🌦️ Tự động', on: '🌧️ Mưa', off: '☀️ Tạnh' }

export function ZoomControlsOverlay() {
  const [hint, setHint] = useState(true)
  const diorama = useUI(s => s.diorama)
  const [time, setTime] = useState(world.mode)
  const [rain, setRain] = useState(world.rainMode)
  useEffect(() => {
    const t = setTimeout(() => setHint(false), 12000)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <div className="zoom-floating-controls" role="toolbar" aria-label="Điều khiển bản đồ">
        <button className="zoom-btn" onClick={() => camNav.zoomBy(1.35)} title="Phóng to (cuộn chuột lên)">
          <Icon name="plus" size={15} />
        </button>
        <button className="zoom-btn" onClick={() => camNav.reset()} title="Về góc nhìn chuẩn của khu vực">
          <Icon name="refresh" size={13} />
        </button>
        <button className="zoom-btn" onClick={() => camNav.zoomBy(1 / 1.35)} title="Thu nhỏ (cuộn chuột xuống)">
          <Icon name="minus" size={15} />
        </button>
      </div>
      <div className="world-controls" role="toolbar" aria-label="Thời gian và thời tiết">
        <button className="pc-btn" title="Thời gian trong ngày: tự động / ngày / đêm"
          onClick={() => { const m = TIME_NEXT[time]; world.mode = m; setTime(m) }}>{TIME_LABEL[time]}</button>
        <button className="pc-btn" title="Thời tiết: tự động / mưa / tạnh"
          onClick={() => { const m = RAIN_NEXT[rain]; world.rainMode = m; setRain(m) }}>{RAIN_LABEL[rain]}</button>
        <button className="pc-btn" title="Mở/đóng mái chính điện chùa để nhìn tượng Phật bên trong (tự đóng sau 20 giây)"
          onClick={() => roofControl.toggle(roofControl.isOpen)}>🏯 Mái chùa</button>
        <button className="pc-btn" title="Một căn nhà ở phố ẩm thực bốc cháy, xe cứu hỏa sẽ tới" onClick={() => startFire()}>🚒 Báo cháy</button>
        <button className="pc-btn" title="Bắn pháo hoa (đẹp nhất vào ban đêm)" onClick={() => startFireworks(20)}>🎆 Pháo hoa</button>
        <button className="pc-btn" aria-pressed={diorama} title="Hiệu ứng sa bàn: nhòe hai mép khung hình như chụp mô hình thu nhỏ (chế độ Đẹp)"
          onClick={() => useUI.getState().toggleDiorama()}>🔭 Sa bàn</button>
        <button className="pc-btn game-launch" onClick={() => useUI.setState({ game: 'hub' })}>🎮 Trò chơi</button>
      </div>
      {hint && (
        <div className="nav-hint" role="note">
          <b>Kéo chuột trái</b> để di chuyển · <b>chuột phải</b> để xoay · <b>nhấp đúp</b> để bay tới · <b>WASD</b>
          <button onClick={() => setHint(false)} aria-label="Ẩn hướng dẫn"><Icon name="close" size={12} /></button>
        </div>
      )}
    </>
  )
}
