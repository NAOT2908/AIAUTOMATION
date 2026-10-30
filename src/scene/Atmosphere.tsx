import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending, Color, DirectionalLight, Fog, HemisphereLight, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PMREMGenerator, type Scene,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useUI } from '../store'

/** shared time-of-day and weather state, read by anything that lights up at night */
export const world = {
  /** 0 = midday, 1 = deep night */
  night: 0,
  /** 0 = dry, 1 = pouring */
  rain: 0,
  mode: 'auto' as 'auto' | 'day' | 'night',
  rainMode: 'auto' as 'auto' | 'on' | 'off',
  /** visual day cycle, 0..1 */
  phase: 0.2,
}

// ?time=day|night and ?rain=on|off open the city in that mood (handy for sharing a view)
{
  const q = new URLSearchParams(location.search)
  const t = q.get('time'), r = q.get('rain')
  if (t === 'day' || t === 'night') { world.mode = t; world.night = t === 'night' ? 1 : 0 }
  if (r === 'on' || r === 'off') { world.rainMode = r; world.rain = r === 'on' ? 1 : 0 }
}

/** one full day at x1 speed, in seconds */
const DAY_SECONDS = 240
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
/** night amount over the visual day: day, dusk, night, dawn */
function nightAt(p: number) {
  if (p < 0.55) return 0
  if (p < 0.66) return smooth(0.55, 0.66, p)
  if (p < 0.88) return 1
  return 1 - smooth(0.88, 1, p)
}

const SUN_DAY = new Color('#FFF0D6'), SUN_DUSK = new Color('#FFB27A'), MOON = new Color('#9DB4FF')
const SKY_NIGHT = new Color('#0B1426'), SKY_RAIN = new Color('#B7C1CC')
const HEMI_DAY = new Color('#FFF4DC'), HEMI_NIGHT = new Color('#7F93C9')

/**
 * Lighting after khanh020905/my-office (studio room IBL, warm sun and sky) plus a day/night
 * cycle and rain. Static shadows stay baked; only light colours and intensities change.
 */
export function Atmosphere({ dark, bg }: { dark: boolean; bg: string }) {
  const gl = useThree(s => s.gl)
  const scene = useThree(s => s.scene) as Scene
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const dayBg = useMemo(() => new Color(bg), [bg])
  const rainTimer = useRef({ next: 40, on: false })

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    // aerial perspective: the far skyline fades into the sky colour
    scene.fog = new Fog(bg, 250, 400)
    return () => { scene.environment = null; scene.fog = null; env.dispose(); pmrem.dispose() }
  }, [gl, scene]) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const speed = useUI.getState().speed
    world.phase = (world.phase + (dt * speed) / DAY_SECONDS) % 1
    const auto = nightAt(world.phase)
    const target = world.mode === 'day' ? 0 : world.mode === 'night' ? 1 : auto
    world.night += (target - world.night) * Math.min(1, dt * 1.6)

    // weather: a shower now and then
    const rt = rainTimer.current
    rt.next -= dt * Math.max(speed, 0.2)
    if (rt.next <= 0) { rt.on = !rt.on && Math.random() < 0.45; rt.next = rt.on ? 25 + Math.random() * 25 : 50 + Math.random() * 60 }
    const rainTarget = world.rainMode === 'on' ? 1 : world.rainMode === 'off' ? 0 : rt.on ? 1 : 0
    world.rain += (rainTarget - world.rain) * Math.min(1, dt * 0.8)

    const n = dark ? Math.max(world.night, 0.55) : world.night, r = world.rain
    const dusk = Math.sin(Math.min(1, n) * Math.PI) // strongest in between
    if (hemi.current) {
      hemi.current.intensity = (0.7 - 0.55 * n) * (1 - r * 0.35)
      hemi.current.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, n)
    }
    if (sun.current) {
      sun.current.intensity = (1.6 - 1.38 * n) * (1 - r * 0.55)
      sun.current.color.copy(SUN_DAY).lerp(SUN_DUSK, dusk * 0.8).lerp(MOON, Math.max(0, n - 0.5) * 2)
    }
    scene.environmentIntensity = (0.35 - 0.28 * n) * (1 - r * 0.3)
    if (scene.background instanceof Color) {
      scene.background.copy(dayBg).lerp(SKY_RAIN, r * 0.45 * (1 - n)).lerp(SKY_NIGHT, n)
      if (scene.fog instanceof Fog) scene.fog.color.copy(scene.background)
    }
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#FFF4DC', '#A9B98A', 0.7]} />
      <directionalLight
        ref={sun} position={[24, 32, 20]} intensity={1.6} color="#FFF0D6" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-60, 60, 60, -60, 1, 150]} />
      </directionalLight>
      <StreetLamps />
      <Rain />
    </>
  )
}

/* ---------------------------------------------------------------- street lamps */

const BOULEVARD_Z = 14, AVENUE_X = 13.4

function lampSpots() {
  const out: [number, number, number][] = [] // x, z, arm direction (radians)
  for (let x = -44; x <= 70; x += 8) {
    if (Math.abs(x - AVENUE_X) < 4 || Math.abs(x - 6.2) < 2) continue
    out.push([x, BOULEVARD_Z - 2.25, 0], [x + 4, BOULEVARD_Z + 2.25, Math.PI])
  }
  for (let z = -40; z <= 70; z += 8) {
    if (Math.abs(z - BOULEVARD_Z) < 4) continue
    out.push([AVENUE_X - 2.25, z, Math.PI / 2], [AVENUE_X + 2.25, z + 4, -Math.PI / 2])
  }
  return out
}

function StreetLamps() {
  const poles = useRef<InstancedMesh>(null)
  const heads = useRef<InstancedMesh>(null)
  const arms = useRef<InstancedMesh>(null)
  const pools = useRef<InstancedMesh>(null)
  const spots = useMemo(lampSpots, [])
  const headMat = useMemo(() => new MeshStandardMaterial({ color: '#FFF3D0', emissive: new Color('#FFC266'), emissiveIntensity: 0, toneMapped: false }), [])
  const poolMat = useMemo(() => new MeshBasicMaterial({ color: '#FFB75E', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }), [])
  useEffect(() => {
    const o = new Object3D()
    spots.forEach(([x, z, a], i) => {
      o.rotation.set(0, 0, 0)
      o.position.set(x, 1.6, z); o.updateMatrix(); poles.current!.setMatrixAt(i, o.matrix)
      // the head hangs over the road, at the end of the arm
      const hx = x + Math.sin(a) * 0.9, hz = z + Math.cos(a) * 0.9
      o.position.set(hx, 3.15, hz); o.updateMatrix(); heads.current!.setMatrixAt(i, o.matrix)
      o.position.set((x + hx) / 2, 3.25, (z + hz) / 2); o.rotation.set(0, a, 0); o.updateMatrix(); arms.current!.setMatrixAt(i, o.matrix)
      o.position.set(hx, -0.08, hz); o.rotation.set(-Math.PI / 2, 0, 0); o.updateMatrix(); pools.current!.setMatrixAt(i, o.matrix)
    })
    for (const m of [poles.current!, heads.current!, arms.current!, pools.current!]) m.instanceMatrix.needsUpdate = true
  }, [spots])
  useFrame(() => {
    const on = smooth(0.3, 0.7, world.night + world.rain * 0.25)
    headMat.emissiveIntensity = on * 3.2
    poolMat.opacity = on * 0.28
  })
  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, spots.length]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 3.4, 8]} />
        <meshStandardMaterial color="#3A4250" roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[undefined, undefined, spots.length]}>
        <boxGeometry args={[0.06, 0.06, 0.95]} />
        <meshStandardMaterial color="#3A4250" roughness={0.5} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, spots.length]} material={headMat}>
        <boxGeometry args={[0.36, 0.1, 0.36]} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[undefined, undefined, spots.length]} material={poolMat} frustumCulled={false}>
        <circleGeometry args={[2.2, 24]} />
      </instancedMesh>
    </group>
  )
}

/* ---------------------------------------------------------------- rain */

const DROPS = 900
const AREA = 70

function Rain() {
  const ref = useRef<InstancedMesh>(null)
  const controls = useThree(s => s.controls) as unknown as { target?: { x: number; z: number } } | null
  const drops = useMemo(() => Array.from({ length: DROPS }, () => ({ x: (Math.random() - 0.5) * AREA, y: Math.random() * 24, z: (Math.random() - 0.5) * AREA, v: 22 + Math.random() * 8 })), [])
  const mat = useMemo(() => new MeshBasicMaterial({ color: '#C9D8EE', transparent: true, opacity: 0, depthWrite: false }), [])
  const o = useMemo(() => new Object3D(), [])
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    m.visible = world.rain > 0.03
    if (!m.visible) return
    mat.opacity = world.rain * 0.55
    const cx = controls?.target?.x ?? 0, cz = controls?.target?.z ?? 0
    drops.forEach((d, i) => {
      d.y -= d.v * dt
      if (d.y < 0) { d.y = 20 + Math.random() * 4; d.x = (Math.random() - 0.5) * AREA; d.z = (Math.random() - 0.5) * AREA }
      o.position.set(cx + d.x, d.y, cz + d.z)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, DROPS]} material={mat} frustumCulled={false}>
      <boxGeometry args={[0.025, 0.7, 0.025]} />
    </instancedMesh>
  )
}
