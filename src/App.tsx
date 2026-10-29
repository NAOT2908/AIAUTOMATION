import { useEffect } from 'react'
import { LabelLayer } from './scene/Labels'
import { Office } from './scene/Office'
import { company } from './sim/engine'
import { useUI } from './store'
import { Feed } from './ui/Feed'
import { Inspector } from './ui/Inspector'
import { TopBar } from './ui/TopBar'

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
  useEffect(() => {
    // panels re-read the simulation 4 times per second; the 3D scene reads it every frame
    const timer = setInterval(() => useUI.setState(s => ({ tick: s.tick + 1 })), 250)
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.code === 'Space' && !/INPUT|TEXTAREA|BUTTON|SELECT/.test(tag)) {
        e.preventDefault()
        useUI.getState().togglePause()
      }
    }
    addEventListener('keydown', onKey)
    return () => { clearInterval(timer); removeEventListener('keydown', onKey) }
  }, [])

  return (
    <div className="stage">
      <div className="scene">
        <Office />
        <LabelLayer />
        <Loading />
      </div>
      <TopBar />
      <Inspector />
      <Feed />
      <Bankrupt />
    </div>
  )
}
