import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { NeutralToneMapping, OrthographicCamera } from 'three'
import { BOT_DEFS, MIN_PER_SEC } from '../sim/data'
import { citySim } from '../sim/citySim'
import { company } from '../sim/engine'
import { useUI, type District } from '../store'
import { RoboCityCampus } from './Districts'
import { Effects, Packets, Truck } from './Fx'
import { LabelSync } from './Labels'
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
 * Fits the office into the free area between the floating panels: on wide screens the
 * view is shifted left/up so the inspector and activity log don't cover the floor.
 * Smoothly interpolates OrbitControls target & zoom when switching districts.
 */
function Rig() {
  const camera = useThree(s => s.camera) as OrthographicCamera
  const size = useThree(s => s.size)
  const district = useUI(s => s.district)
  const controlsRef = useRef<any>(null)
  const wide = size.width >= 900
  const freeW = wide ? size.width - 400 : size.width
  const freeH = wide ? size.height - 340 : size.height
  const fit = Math.max(8, Math.min(freeW / 18, freeH / 12.5))
  const lastDistrict = useRef<string>(district)

  useEffect(() => {
    if (district === 'all') {
      camera.clearViewOffset()
    } else if (wide) {
      camera.setViewOffset(size.width, size.height, 190, 60, size.width, size.height)
    } else {
      camera.clearViewOffset()
    }
    camera.updateProjectionMatrix()
  }, [camera, district, wide, size.width, size.height])

  useFrame((_, dt) => {
    if (!controlsRef.current) return

    // Khi người dùng bấm đổi district (hoặc lần đầu load)
    if (lastDistrict.current !== district) {
      lastDistrict.current = district
      const [tx, ty, tz, zoomMul] = DISTRICT_TARGETS[district] || DISTRICT_TARGETS.robocorp
      const targetZoom = fit * zoomMul
      const step = Math.min(1, dt * 8.0)
      
      controlsRef.current.target.x += (tx - controlsRef.current.target.x) * step
      controlsRef.current.target.y += (ty - controlsRef.current.target.y) * step
      controlsRef.current.target.z += (tz - controlsRef.current.target.z) * step
      
      if (Math.abs(camera.zoom - targetZoom) > 0.05) {
        camera.zoom += (targetZoom - camera.zoom) * step
        camera.updateProjectionMatrix()
      }
    }
    controlsRef.current.update()
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.10}
      panSpeed={2.2}
      rotateSpeed={1.0}
      zoomSpeed={1.8}
      target={[0, 0, 0.8]}
      minPolarAngle={0.25}
      maxPolarAngle={1.35}
      minZoom={8}
      maxZoom={180}
    />
  )
}

function Lights({ dark }: { dark: boolean }) {
  return (
    <>
      <hemisphereLight args={['#ffffff', dark ? '#1a2638' : '#b4c2d6', dark ? 0.3 : 0.45]} />
      <directionalLight
        position={[24, 32, 24]} intensity={dark ? 1.0 : 1.75} color={dark ? '#c8d6ff' : '#fff6ea'} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
      >
        <orthographicCamera attach="shadow-camera" args={[-36, 36, 36, -36, 1, 90]} />
      </directionalLight>
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={dark ? 0.4 : 0.8} position={[12, 10, 14]} rotation-x={Math.PI / 2} scale={[36, 36, 1]} />
        <Lightformer intensity={0.55} color="#ffe9cf" position={[-10, 4, 6]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer intensity={0.45} color="#cfe3ff" position={[28, 4, 14]} rotation-y={-Math.PI / 2} scale={[16, 4, 1]} />
      </Environment>
    </>
  )
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
      camera={{ position: [34, 30, 34], zoom: 30, near: 0.1, far: 300 }}
      gl={{ antialias: !high, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = NeutralToneMapping; useUI.setState({ ready: true }) }}
    >
      <color attach="background" args={[theme.bg]} />
      <SimDriver />
      <Rig />
      <Lights dark={theme.dark} />
      <World theme={theme} />
      <RoboCityCampus />
      <MyOfficeCompany />
      <Rooms />
      {BOT_DEFS.map(b => <Robot key={b.id} id={b.id} />)}
      <OfficeCat startPos={[-2, 0, 3]} />
      <RobotVacuum />
      <StreetTraffic />
      <LabelSync />
      <Packets />
      <Truck />
      <ShadowBaker />
      {high && <Effects />}
      {high && <PerformanceMonitor onDecline={() => setQuality('low')} />}
    </Canvas>
  )
}
