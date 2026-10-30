import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { ACESFilmicToneMapping, MOUSE, OrthographicCamera, TOUCH, Vector3 } from 'three'
import { BOT_DEFS, MIN_PER_SEC } from '../sim/data'
import { citySim } from '../sim/citySim'
import { company } from '../sim/engine'
import { useUI, type District } from '../store'
import { Atmosphere } from './Atmosphere'
import { ChargingStation, FootballPitch, Market, School } from './Civic'
import { RoboCityCampus } from './Districts'
import { Metro } from './Metro'
import { Downtown } from './Downtown'
import { Mountains } from './Mountains'
import { FireIncident, FireStation, Fireworks, Hospital, PoliceStation } from './Services'
import { LakePark } from './Park'
import { Pedestrians, Sky } from './CityLife'
import { Effects, Packets, Truck } from './Fx'
import { LabelSync } from './Labels'
import { CitySpeech } from './Speech'
import { MyOfficeCompany } from './MyOffice'
import { OfficeCat, RobotVacuum, StreetTraffic } from './OfficeLife'
import { Robot } from './Robot'
import { Rooms } from './Rooms'
import { useSceneTheme } from './theme'
import { fx } from './vis'
import { World } from './World'

/** advances both company and city simulation in lock-step with rendering */
function SimDriver() {
  useFrame((_, dt) => {
    const { speed } = useUI.getState()
    if (speed > 0) {
      const gameMin = Math.min(dt, 0.1) * speed * MIN_PER_SEC
      company.advance(gameMin)
      citySim.advance(gameMin)
    }
  })
  return null
}

/**
 * Static props cast shadows once; the map is only re-rendered when something static
 * changes (e.g. warehouse crates). Moving things use blob shadows instead.
 */
function ShadowBaker() {
  const gl = useThree(s => s.gl)
  const frames = useRef(0)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => { gl.shadowMap.autoUpdate = true }
  }, [gl])
  useFrame(() => {
    if (frames.current < 20 || fx.shadowsDirty) {
      gl.shadowMap.needsUpdate = true
      fx.shadowsDirty = false
      frames.current++
    }
  })
  return null
}

const DISTRICT_TARGETS: Record<District, [number, number, number, number]> = {
  all: [12, 0, 16, 0.40],
  robocorp: [0, 0, 0.8, 1.0],
  myoffice: [28, 0, -22, 1.05],
  bistro: [26, 0, 0, 1.15],
  pagoda: [-2, 0, 31, 1.05],
  club: [26, 0, 31, 1.15],
}

/**
 * Keeps the canvas the size of its box. After a fullscreen switch or a window resize the
 * measured size can go stale, leaving a blank band; this re-measures whenever they disagree.
 */
function CanvasSizeGuard() {
  const gl = useThree(s => s.gl)
  const setSize = useThree(s => s.setSize)
  const size = useThree(s => s.size)
  const last = useRef(0)
  useEffect(() => {
    const fit = () => {
      const box = gl.domElement.parentElement
      if (box && (Math.abs(box.clientWidth - size.width) > 1 || Math.abs(box.clientHeight - size.height) > 1)) setSize(box.clientWidth, box.clientHeight)
    }
    const later = () => { fit(); setTimeout(fit, 150); setTimeout(fit, 600) }
    addEventListener('resize', later)
    document.addEventListener('fullscreenchange', later)
    return () => { removeEventListener('resize', later); document.removeEventListener('fullscreenchange', later) }
  }, [gl, setSize, size.width, size.height])
  useFrame(() => {
    const now = performance.now()
    if (now - last.current < 500) return
    last.current = now
    const box = gl.domElement.parentElement
    if (box && box.clientWidth && (Math.abs(box.clientWidth - size.width) > 1 || Math.abs(box.clientHeight - size.height) > 1)) setSize(box.clientWidth, box.clientHeight)
  })
  return null
}

/** imperative camera commands for the UI (zoom buttons, reset) and double-click travel */
export const camNav = {
  flyTo: (_x: number, _z: number, _zoom?: number) => {},
  zoomBy: (_factor: number) => {},
  reset: () => {},
}
const BOUNDS = { minX: -54, maxX: 58, minZ: -96, maxZ: 54 }
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/**
 * Map-style camera: left-drag pans along the ground, right-drag orbits, the wheel zooms toward
 * the pointer; one finger pans and two fingers rotate/zoom on touch screens; WASD/arrows pan.
 * District tabs and double-clicks fly the camera there smoothly.
 */
function Rig() {
  const camera = useThree(s => s.camera) as OrthographicCamera
  const size = useThree(s => s.size)
  const district = useUI(s => s.district)
  const controlsRef = useRef<any>(null)
  const flight = useRef<{ x: number; z: number; zoom: number | null } | null>(null)
  const keys = useRef(new Set<string>())
  const wide = size.width >= 900
  const freeW = wide ? size.width - 400 : size.width
  const freeH = wide ? size.height - 340 : size.height
  const fit = Math.max(8, Math.min(freeW / 18, freeH / 12.5))

  const showInspector = useUI(s => s.showInspector)
  const showFeed = useUI(s => s.showFeed)
  const zen = useUI(s => s.zenMode)
  useEffect(() => {
    // centre the view in the space the floating panels leave free
    const ox = wide && showInspector && !zen ? 190 : 0
    const oy = wide && !zen ? (showFeed ? 118 : 0) - 70 : 0
    if (ox || oy) camera.setViewOffset(size.width, size.height, ox, oy, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }, [camera, wide, showInspector, showFeed, zen, size.width, size.height])

  const districtTarget = () => {
    const [tx, , tz, zm] = DISTRICT_TARGETS[useUI.getState().district] || DISTRICT_TARGETS.robocorp
    return { x: tx, z: tz, zoom: fit * zm }
  }
  useEffect(() => {
    // ?cam=x,z,zoom opens straight onto a view (handy for sharing a spot); zoom is relative to the fit
    const cam = new URLSearchParams(location.search).get('cam')?.split(',').map(Number)
    const c = controlsRef.current
    if (cam && cam.length >= 2 && cam.every(Number.isFinite) && c && !c.userData?.camApplied) {
      c.userData = { camApplied: true }
      const dx = cam[0] - c.target.x, dz = cam[1] - c.target.z
      c.target.x += dx; c.target.z += dz
      camera.position.x += dx; camera.position.z += dz
      camera.zoom = fit * (cam[2] ?? 1)
      camera.updateProjectionMatrix()
      flight.current = null
      return
    }
    flight.current = districtTarget()
  }, [district]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    camNav.flyTo = (x, z, zoom) => { flight.current = { x: clamp(x, BOUNDS.minX, BOUNDS.maxX), z: clamp(z, BOUNDS.minZ, BOUNDS.maxZ), zoom: zoom ?? null } }
    camNav.zoomBy = f => {
      const c = controlsRef.current
      if (c) flight.current = { x: c.target.x, z: c.target.z, zoom: clamp(camera.zoom * f, 14, 180) }
    }
    camNav.reset = () => { flight.current = districtTarget() }
  })

  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    const stop = () => { flight.current = null }
    c.addEventListener('start', stop)
    const down = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return
      if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)) { keys.current.add(e.code); flight.current = null }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    addEventListener('keydown', down)
    addEventListener('keyup', up)
    addEventListener('blur', () => keys.current.clear())
    return () => { c.removeEventListener('start', stop); removeEventListener('keydown', down); removeEventListener('keyup', up) }
  }, [])

  const fwd = useRef(new Vector3())
  useFrame((_, dt) => {
    const c = controlsRef.current
    if (!c) return
    let dx = 0, dz = 0
    // keyboard: move relative to where the camera looks, faster when zoomed out
    if (keys.current.size) {
      camera.getWorldDirection(fwd.current)
      fwd.current.y = 0
      fwd.current.normalize()
      const k = keys.current, speed = (900 / camera.zoom) * dt
      const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
      const r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
      dx += (fwd.current.x * f - fwd.current.z * r) * speed
      dz += (fwd.current.z * f + fwd.current.x * r) * speed
    }
    const fl = flight.current
    if (fl) {
      const k = 1 - Math.exp(-dt * 4.5)
      dx += (fl.x - c.target.x) * k
      dz += (fl.z - c.target.z) * k
      if (fl.zoom !== null) {
        camera.zoom += (fl.zoom - camera.zoom) * k
        camera.updateProjectionMatrix()
      }
      if (Math.hypot(fl.x - c.target.x, fl.z - c.target.z) < 0.03 && (fl.zoom === null || Math.abs(fl.zoom - camera.zoom) < 0.1)) flight.current = null
    }
    // keep the camera over the city
    dx += clamp(c.target.x + dx, BOUNDS.minX, BOUNDS.maxX) - (c.target.x + dx)
    dz += clamp(c.target.z + dz, BOUNDS.minZ, BOUNDS.maxZ) - (c.target.z + dz)
    if (dx || dz) {
      c.target.x += dx; c.target.z += dz
      camera.position.x += dx; camera.position.z += dz
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      screenSpacePanning={false}
      zoomToCursor
      mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
      touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }}
      panSpeed={1.0}
      rotateSpeed={0.8}
      zoomSpeed={1.4}
      target={[0, 0, 0.8]}
      minPolarAngle={0.35}
      maxPolarAngle={1.25}
      minZoom={14}
      maxZoom={180}
    />
  )
}

/**
 * Frame budget (also from my-office): the office is something you leave open, so it renders at
 * 60 fps only while you interact, 30 while it just runs, and 8 when the window is in the background.
 */
function FrameBudget() {
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => {
    let lastInput = 0, last = 0, raf = 0
    const touch = () => { lastInput = performance.now() }
    const events = ['pointerdown', 'pointermove', 'wheel', 'keydown'] as const
    events.forEach(e => addEventListener(e, touch, { passive: true }))
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const gap = !document.hasFocus() ? 1000 / 8 : now - lastInput < 1500 ? 1000 / 60 : 1000 / 30
      if (now - last >= gap - 2) {
        last = now
        invalidate()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      events.forEach(e => removeEventListener(e, touch))
    }
  }, [invalidate])
  return null
}

export function Office() {
  const quality = useUI(s => s.quality)
  const setQuality = useUI(s => s.setQuality)
  const theme = useSceneTheme()
  const high = quality === 'high'
  return (
    <Canvas
      key={quality}
      className="canvas"
      shadows="soft"
      orthographic
      dpr={high ? [1, 1.5] : 1}
      frameloop="demand"
      camera={{ position: [136, 120, 136], zoom: 30, near: 1, far: 900 }}
      gl={{ antialias: !high, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
        useUI.setState({ ready: true })
      }}
    >
      <color attach="background" args={[theme.bg]} />
      <FrameBudget />
      <CanvasSizeGuard />
      <SimDriver />
      <Rig />
      <Atmosphere dark={theme.dark} bg={theme.bg} />
      <group onDoubleClick={e => { e.stopPropagation(); camNav.flyTo(e.point.x, e.point.z) }}>
      <World theme={theme} />
      <RoboCityCampus />
      <MyOfficeCompany />
      <Rooms />
      {BOT_DEFS.map(b => <Robot key={b.id} id={b.id} />)}
      <OfficeCat startPos={[-2, 0, 3]} />
      <RobotVacuum />
      <StreetTraffic />
      <Pedestrians />
      <Sky />
      <LakePark />
      <Metro />
      <FootballPitch />
      <School />
      <Market />
      <ChargingStation />
      <Downtown />
      <Mountains />
      <FireStation />
      <PoliceStation />
      <Hospital />
      <FireIncident />
      <Fireworks />
      </group>
      <LabelSync />
      <CitySpeech />
      <Packets />
      <Truck />
      <ShadowBaker />
      {high && <Effects />}
      {high && <PerformanceMonitor onDecline={() => setQuality('low')} />}
    </Canvas>
  )
}
