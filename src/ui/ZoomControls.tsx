import { useUI } from '../store'
import { Icon } from './Icon'

export function ZoomControlsOverlay() {
  const district = useUI(s => s.district)
  const setDistrict = useUI(s => s.setDistrict)

  const handleZoom = (delta: number) => {
    // Find canvas and camera
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    // Dispatch wheel event to OrbitControls
    canvas.dispatchEvent(new WheelEvent('wheel', {
      deltaY: delta,
      bubbles: true,
      cancelable: true,
    }))
  }

  const handleReset = () => {
    setDistrict(district)
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 0 }))
  }

  return (
    <div className="zoom-floating-controls" role="toolbar" aria-label="Điều khiển phóng to thu nhỏ">
      <button
        className="zoom-btn"
        onClick={() => handleZoom(-300)}
        title="Phóng to (+ / Cuộn chuột lên)"
      >
        <Icon name="plus" size={15} />
      </button>

      <button
        className="zoom-btn"
        onClick={handleReset}
        title="Đặt lại góc nhìn chuẩn khu vực"
      >
        <Icon name="refresh" size={13} />
      </button>

      <button
        className="zoom-btn"
        onClick={() => handleZoom(300)}
        title="Thu nhỏ (- / Cuộn chuột xuống)"
      >
        <Icon name="minus" size={15} />
      </button>
    </div>
  )
}
