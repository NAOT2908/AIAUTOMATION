import { useEffect } from 'react'
import { LabelLayer } from './scene/Labels'
import { Office } from './scene/Office'
import { company } from './sim/engine'
import { useUI } from './store'
import { Feed } from './ui/Feed'
import { Icon } from './ui/Icon'
import { Inspector } from './ui/Inspector'
import { PropCard, PropTooltip } from './ui/PropCard'
import { TopBar } from './ui/TopBar'
import { ZenFloatingBar } from './ui/ZenFloatingBar'
import { ZoomControlsOverlay } from './ui/ZoomControls'

function Bankrupt() {
  useUI(s => s.tick)
  if (!company.bankrupt) return null
  return (
    <div className="modal-backdrop">
      <div className="card modal" role="alertdialog" aria-labelledby="bk-title">
        <h2 id="bk-title">Phá sản!</h2>
        <p>Tiền mặt đã âm {Math.round(-company.cash).toLocaleString('vi-VN')} $. Các robot đang ngồi nhìn nhau.</p>
        <button className="btn-primary" onClick={() => company.reset()}>Chơi lại từ đầu</button>
      </div>
    </div>
  )
}

function Loading() {
  const ready = useUI(s => s.ready)
  if (ready) return null
  return <div className="loading"><span className="spinner" aria-hidden="true" />Đang dựng văn phòng 3D…</div>
}

export function App() {
  const zenMode = useUI(s => s.zenMode)
  const showInspector = useUI(s => s.showInspector)
  const showFeed = useUI(s => s.showFeed)
  const toggleInspector = useUI(s => s.toggleInspector)
  const toggleFeed = useUI(s => s.toggleFeed)

  useEffect(() => {
    // panels re-read the simulation 4 times per second; the 3D scene reads it every frame
    const timer = setInterval(() => useUI.setState(s => ({ tick: s.tick + 1 })), 250)
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (/INPUT|TEXTAREA|BUTTON|SELECT/.test(tag)) return

      if (e.code === 'Space') {
        e.preventDefault()
        useUI.getState().togglePause()
      } else if (e.code === 'KeyH' || e.code === 'KeyF') {
        e.preventDefault()
        useUI.getState().toggleZenMode()
      } else if (e.code === 'Escape' && useUI.getState().zenMode) {
        e.preventDefault()
        useUI.getState().toggleZenMode()
      }
    }
    addEventListener('keydown', onKey)
    // the top bar wraps onto a second row on narrower screens: panels below it follow its real height
    const hud = document.querySelector('.hud')
    const ro = new ResizeObserver(() => {
      if (hud) document.documentElement.style.setProperty('--hud-h', `${Math.round(hud.getBoundingClientRect().height)}px`)
    })
    if (hud) ro.observe(hud)
    return () => { clearInterval(timer); removeEventListener('keydown', onKey); ro.disconnect() }
  }, [])

  return (
    <div className={`stage ${zenMode ? 'is-zen' : ''} ${!showInspector ? 'hide-inspector' : ''} ${!showFeed ? 'hide-feed' : ''}`}>
      <div className="scene">
        <Office />
        <LabelLayer />
        <Loading />
      </div>

      <TopBar />
      <Inspector />
      <Feed />
      <PropCard />
      <PropTooltip />
      <ZoomControlsOverlay />

      {/* Floating edge tabs when panels are collapsed */}
      {!zenMode && !showInspector && (
        <button className="floating-edge-tab right" onClick={toggleInspector} title="Hiện bảng Robot">
          <Icon name="layout" size={14} /> <span>Robot</span>
        </button>
      )}

      {!zenMode && !showFeed && (
        <button className="floating-edge-tab bottom" onClick={toggleFeed} title="Hiện Nhật ký">
          <Icon name="chevronUp" size={14} /> <span>Nhật ký</span>
        </button>
      )}

      {/* Floating toolbar when in Zen/Fullscreen mode */}
      {zenMode && <ZenFloatingBar />}

      <Bankrupt />
    </div>
  )
}
