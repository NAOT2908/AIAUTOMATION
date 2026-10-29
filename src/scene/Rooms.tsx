import { Billboard, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, Group, InstancedMesh, Object3D } from 'three'
import { BOT_DEFS, DEPTS } from '../sim/data'
import { company } from '../sim/engine'
import type { DeptId } from '../sim/types'
import { useUI } from '../store'
import { CHARGERS, DESK_Z, ROOM_D, ROOM_W, deptPos } from './layout'
import { M, glow, signTexture, tint } from './materials'
import { Bollard, Bookshelf, Cabinet, CoinStacks, Desk, Forklift, Pallet, Plant, Rug, Sofa, Whiteboard } from './Props'
import { fx } from './vis'

const deskX = (id: string) => BOT_DEFS.find(b => b.id === id)!.desk

function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => alive && setReady(true))
    const t = setTimeout(() => alive && setReady(true), 2000)
    return () => { alive = false; clearTimeout(t) }
  }, [])
  return ready
}

function Sign({ dept }: { dept: DeptId }) {
  const d = DEPTS[dept]
  const fonts = useFontsReady()
  const tex = useMemo(() => signTexture(d.icon, d.name, d.color), [d, fonts])
  return (
    <Billboard position={[0, 2.6, -ROOM_D / 2 + 0.35]}>
      <mesh>
        <planeGeometry args={[4.6, 0.98]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </Billboard>
  )
}

/** blue map pin that pops up over a department while it is busy */
function Pin({ dept }: { dept: DeptId }) {
  const ref = useRef<Group>(null)
  const mat = useMemo(() => tint(DEPTS[dept].color, 0.35), [dept])
  useFrame(state => {
    const g = ref.current
    if (!g) return
    const age = (performance.now() - (fx.pins[dept] ?? -1e9)) / 1000
    const target = age < 2.5 ? 1 : 0
    const s = g.scale.x + (target - g.scale.x) * 0.15
    g.scale.setScalar(s)
    g.visible = s > 0.02
    g.position.y = 3.35 + Math.sin(state.clock.elapsedTime * 3) * 0.08
    g.rotation.y += 0.02
  })
  return (
    <group ref={ref} position={[0, 3.35, -ROOM_D / 2 + 0.35]} scale={0}>
      <mesh position={[0, 0.28, 0]} material={mat}><sphereGeometry args={[0.24, 20, 16]} /></mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={Math.PI} material={mat}><coneGeometry args={[0.2, 0.42, 20]} /></mesh>
      <mesh position={[0, 0.3, 0.2]} material={M.white}><sphereGeometry args={[0.09, 12, 10]} /></mesh>
    </group>
  )
}

function RoomShell({ dept, children }: { dept: DeptId; children?: React.ReactNode }) {
  const [x, z] = deptPos(dept)
  const floor = useMemo(() => tint('#' + new Color(DEPTS[dept].color).lerp(new Color('#FFFFFF'), 0.68).getHexString(), 0.85), [dept])
  const select = useUI(s => s.select)
  const first = BOT_DEFS.find(b => b.dept === dept)
  return (
    <group position={[x, 0, z]}>
      <RoundedBox
        args={[ROOM_W, 0.05, ROOM_D]} radius={0.02} position={[0, 0.025, 0]} material={floor} receiveShadow
        onClick={e => { if (first) { e.stopPropagation(); select(first.id) } }}
      />
      {children}
      <Sign dept={dept} />
      <Pin dept={dept} />
    </group>
  )
}

/** warehouse racks whose crates follow the real stock level */
function WarehouseStock() {
  const ref = useRef<InstancedMesh>(null)
  const slots = useMemo(() => {
    const out: [number, number, number][] = []
    for (const rz of [-1.55, -0.65]) for (const y of [0.33, 1.03]) for (let i = 0; i < 4; i++) out.push([0.6 + i * 0.47, y, rz])
    return out
  }, [])
  const last = useRef(-1)
  useEffect(() => {
    const m = ref.current!
    const o = new Object3D()
    slots.forEach(([sx, sy, sz], i) => {
      o.position.set(sx, sy, sz)
      o.rotation.y = (i % 3) * 0.06
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [slots])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const score = company.products.reduce((s, p) => s + p.stock * (p.sku === 'LAP' || p.sku === 'MON' ? 4 : 0.4), 0)
    const n = Math.max(0, Math.min(slots.length, Math.round(score / 52)))
    if (n !== last.current) {
      last.current = n
      m.count = n
      fx.shadowsDirty = true
    }
  })
  return (
    <group>
      {[-1.55, -0.65].map(rz => (
        <group key={rz} position={[1.3, 0, rz]}>
          {[-0.98, 0.98].flatMap(px => [-0.25, 0.25].map(pz => (
            <mesh key={`${px}${pz}`} position={[px, 0.8, pz]} material={M.brand} castShadow><boxGeometry args={[0.06, 1.6, 0.06]} /></mesh>
          )))}
          {[0.1, 0.8, 1.5].map(y => (
            <mesh key={y} position={[0, y, 0]} material={M.yellow} castShadow receiveShadow><boxGeometry args={[2.0, 0.05, 0.56]} /></mesh>
          ))}
        </group>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, slots.length]} material={M.cardboard} castShadow>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
      </instancedMesh>
    </group>
  )
}

function ServerRacks() {
  const ref = useRef<InstancedMesh>(null)
  const color = useMemo(() => new Color(), [])
  const n = 15
  useEffect(() => {
    const m = ref.current!
    const o = new Object3D()
    for (let i = 0; i < n; i++) {
      o.position.set(-1.6, 0.5 + (i % 5) * 0.25, -1.5 + Math.floor(i / 5) * 0.75)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, color.set('#3DCB8E'))
    }
    m.instanceMatrix.needsUpdate = true
  }, [color])
  useFrame(state => {
    const m = ref.current
    if (!m?.instanceColor) return
    const T = state.clock.elapsedTime
    const down = company.t < company.outageUntil
    for (let i = 0; i < n; i++) {
      const on = Math.sin(T * (down ? 10 : 2.5) + i * 1.7) > (down ? 0 : -0.5)
      color.set(down ? (on ? '#FF4040' : '#401010') : on ? '#3DFF9E' : '#174A33').multiplyScalar(on ? 2 : 1)
      m.setColorAt(i, color)
    }
    m.instanceColor.needsUpdate = true
  })
  return (
    <group>
      {[-1.5, -0.75, 0].map(rz => (
        <RoundedBox key={rz} args={[0.6, 1.7, 0.62]} radius={0.03} position={[-1.92, 0.85, rz]} material={M.screenFrame} castShadow receiveShadow />
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[0.02, 0.05, 0.42]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

function Chargers() {
  const pad = useMemo(() => glow('#3DCB8E', 1.1), [])
  const [hx, hz] = deptPos('hr')
  return (
    <group>
      {CHARGERS.map(c => (
        <group key={c.x} position={[c.x - hx, 0, c.z - hz]}>
          <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2} material={pad}><ringGeometry args={[0.24, 0.32, 32]} /></mesh>
          <mesh position={[0, 0.055, 0]} rotation-x={-Math.PI / 2} material={M.offWhite}><circleGeometry args={[0.24, 32]} /></mesh>
          <RoundedBox args={[0.14, 1.0, 0.14]} radius={0.04} position={[0, 0.5, -0.45]} material={M.white} castShadow />
          <mesh position={[0, 0.9, -0.37]} material={pad}><boxGeometry args={[0.08, 0.12, 0.02]} /></mesh>
        </group>
      ))}
    </group>
  )
}

function DockMarkings() {
  const stripe = useMemo(() => tint('#F6B826', 0.6), [])
  return (
    <group>
      {[-0.9, 0.9].map(x => (
        <mesh key={x} position={[x, 0.056, 0.4]} rotation-x={-Math.PI / 2} material={stripe}><planeGeometry args={[0.08, 3.2]} /></mesh>
      ))}
    </group>
  )
}

export function Rooms() {
  const c = (d: DeptId) => DEPTS[d].color
  return (
    <>
      <RoomShell dept="ceo">
        <Rug x={0} z={-0.7} w={3.2} d={2.3} color="#C9C0E6" />
        <Desk x={deskX('ceo')} z={DESK_Z} color={c('ceo')} wide />
        <Bookshelf x={-1.7} z={-1.82} />
        <Sofa x={1.75} z={0.95} rot={-Math.PI / 2} />
        <Plant x={1.95} z={-1.7} s={1.1} />
        <Plant x={-2.1} z={1.65} />
      </RoomShell>

      <RoomShell dept="acc">
        <Desk x={deskX('acc')} z={DESK_Z} color={c('acc')} />
        <Cabinet x={-1.95} z={-1.7} />
        <Cabinet x={-1.3} z={-1.7} />
        <CoinStacks x={1.5} z={-1.75} />
        <Plant x={2.05} z={1.6} />
      </RoomShell>

      <RoomShell dept="hr">
        <Desk x={deskX('hr')} z={DESK_Z} color={c('hr')} />
        <Chargers />
        <Bookshelf x={1.35} z={-1.82} />
        <Plant x={-2.1} z={1.6} />
      </RoomShell>

      <RoomShell dept="sales">
        <Desk x={deskX('sales1')} z={DESK_Z} color={c('sales')} />
        <Desk x={deskX('sales2')} z={DESK_Z} color={c('sales')} />
        <Plant x={0} z={-1.88} s={0.75} />
        <Plant x={2.1} z={1.6} />
        <Plant x={-2.1} z={1.6} s={0.9} />
      </RoomShell>

      <RoomShell dept="wh">
        <Desk x={deskX('wh')} z={DESK_Z} color={c('wh')} />
        <WarehouseStock />
        <Pallet x={-2.0} z={1.5} boxes={5} />
      </RoomShell>

      <RoomShell dept="buy">
        <Desk x={deskX('buy')} z={DESK_Z} color={c('buy')} />
        <Bookshelf x={1.5} z={-1.82} />
        <Cabinet x={2.05} z={0.1} rot={-Math.PI / 2} />
        <Plant x={-2.1} z={1.6} />
      </RoomShell>

      <RoomShell dept="it">
        <Desk x={deskX('it')} z={DESK_Z} color={c('it')} />
        <ServerRacks />
        <Plant x={2.1} z={1.6} />
      </RoomShell>

      <RoomShell dept="mkt">
        <Rug x={0.4} z={-0.5} w={2.6} d={2} color="#D3E8B8" />
        <Desk x={deskX('mkt')} z={DESK_Z} color={c('mkt')} />
        <Whiteboard x={-1.6} z={-1.2} rot={0.5} color={c('mkt')} />
        <Plant x={2.1} z={1.6} />
        <Plant x={2.1} z={-1.7} s={0.8} />
      </RoomShell>

      <RoomShell dept="gate">
        <DockMarkings />
        <Pallet x={-1.75} z={-1.4} boxes={6} />
        <Pallet x={-1.75} z={-0.2} boxes={3} />
        <Pallet x={1.75} z={-1.4} boxes={4} mat={M.brandSoft} />
        <Forklift x={1.7} z={0.3} rot={-0.6} />
        <Bollard x={-1.3} z={1.95} />
        <Bollard x={1.3} z={1.95} />
      </RoomShell>
    </>
  )
}
