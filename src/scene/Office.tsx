import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { NeutralToneMapping, OrthographicCamera } from 'three'
import { BOT_DEFS, MIN_PER_SEC } from '../sim/data'
import { company } from '../sim/engine'
import { useUI } from '../store'
import { Effects, Packets, Truck } from './Fx'
import { LabelSync } from './Labels'
import { Robot } from './Robot'
import { Rooms } from './Rooms'
import { useSceneTheme } from './theme'
import { fx } from './vis'
import { World } from './World'

/** advances the simulation in lock-step with rendering */
function SimDriver() {
  useFrame((_, dt) => {
    const { speed } = useUI.getState()
    if (speed > 0) company.advance(Math.min(dt, 0.1) * speed * MIN_PER_SEC)
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

/**
 * Fits the office into the free area between the floating panels: on wide screens the
 * view is shifted left/up so the inspector and activity log don't cover the floor.
 */
function Rig() {
  const camera = useThree(s => s.camera) as OrthographicCamera
  const size = useThree(s => s.size)
  const wide = size.width >= 900
  const freeW = wide ? size.width - 400 : size.width
  const freeH = wide ? size.height - 340 : size.height
  const fit = Math.max(8, Math.min(freeW / 18, freeH / 12.5))
  useEffect(() => {
    camera.zoom = fit
    if (wide) camera.setViewOffset(size.width, size.height, 190, 60, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }, [camera, fit, wide, size.width, size.height])
  return (
    <OrbitControls
      makeDefault enableDamping dampingFactor={0.08} target={[0, 0, 0.8]}
      minPolarAngle={0.45} maxPolarAngle={1.15} minZoom={fit * 0.6} maxZoom={fit * 3.5}
    />
  )
}

function Lights({ dark }: { dark: boolean }) {
  return (
    <>
      <hemisphereLight args={['#ffffff', dark ? '#1a2638' : '#b4c2d6', dark ? 0.3 : 0.45]} />
      <directionalLight
        position={[10, 18, 8]} intensity={dark ? 1.0 : 1.75} color={dark ? '#c8d6ff' : '#fff6ea'} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
      >
        <orthographicCamera attach="shadow-camera" args={[-16, 16, 16, -16, 1, 50]} />
      </directionalLight>
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={dark ? 0.4 : 0.8} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[24, 24, 1]} />
        <Lightformer intensity={0.55} color="#ffe9cf" position={[-10, 4, 6]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer intensity={0.45} color="#cfe3ff" position={[10, 4, -6]} rotation-y={-Math.PI / 2} scale={[12, 4, 1]} />
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
      camera={{ position: [24, 21, 24], zoom: 30, near: 0.1, far: 200 }}
      gl={{ antialias: !high, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = NeutralToneMapping; useUI.setState({ ready: true }) }}
    >
      <color attach="background" args={[theme.bg]} />
      <SimDriver />
      <Rig />
      <Lights dark={theme.dark} />
      <World theme={theme} />
      <Rooms />
      {BOT_DEFS.map(b => <Robot key={b.id} id={b.id} />)}
      <LabelSync />
      <Packets />
      <Truck />
      <ShadowBaker />
      {high && <Effects />}
      {high && <PerformanceMonitor onDecline={() => setQuality('low')} />}
    </Canvas>
  )
}
