import { useEffect, useState } from 'react'
import { camNav } from '../scene/Office'
import { Icon } from './Icon'

export function ZoomControlsOverlay() {
  const [hint, setHint] = useState(true)
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
      {hint && (
        <div className="nav-hint" role="note">
          <b>Kéo chuột trái</b> để di chuyển · <b>chuột phải</b> để xoay · <b>nhấp đúp</b> để bay tới · <b>WASD</b>
          <button onClick={() => setHint(false)} aria-label="Ẩn hướng dẫn"><Icon name="close" size={12} /></button>
        </div>
      )}
    </>
  )
}
