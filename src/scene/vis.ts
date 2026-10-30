import { Color, Vector3 } from 'three'
import { sound } from '../audio/sound'
import { DEPTS } from '../sim/data'
import { company } from '../sim/engine'
import type { DeptId, Endpoint, LogEntry, SimEvent } from '../sim/types'
import { CHARGERS, aisleOf, deptPos, homeOf, route, visitPoint } from './layout'

/**
 * Mutable visual state shared by the 3D components. It is driven by simulation events
 * and read inside useFrame, so animation never triggers React re-renders.
 */

export interface Waypoint { p: Vector3; wait: number }
export interface Bubble { text: string; kind: 'llm' | 'warn' | 'good' | ''; key: number; until: number }

export interface RobotVis {
  id: string
  dept: DeptId
  home: Vector3
  /** lane beside the desk the robot steps into before walking off */
  aisle: Vector3
  pos: Vector3
  yaw: number
  path: Waypoint[]
  waited: number
  /** current hover-bob height, so labels follow the body */
  bob: number
  hover: boolean
  bubble: Bubble
}

const noBubble = (): Bubble => ({ text: '', kind: '', key: -1, until: 0 })

export interface PacketVis { from: Vector3; to: Vector3; t: number; color: Color }

export const robots = new Map<string, RobotVis>()
export const fx = {
  packets: [] as PacketVis[],
  trucks: 0,
  partyUntil: 0,
  /** set when something static changes so the baked shadow map is refreshed */
  shadowsDirty: true,
  /** per-department "activity pin" timestamps (performance.now) */
  pins: {} as Partial<Record<DeptId, number>>,
}

function resetRobots() {
  for (const b of company.bots) {
    const home = homeOf(b)
    const aisle = aisleOf(b)
    const v = robots.get(b.id)
    if (v) {
      v.home = home
      v.aisle = aisle
      v.pos.copy(home)
      v.yaw = 0
      v.path = []
      v.waited = 0
      v.bubble = noBubble()
    } else {
      robots.set(b.id, { id: b.id, dept: b.dept, home, aisle, pos: home.clone(), yaw: 0, path: [], waited: 0, bob: 0, hover: false, bubble: noBubble() })
    }
  }
  fx.packets.length = 0
  fx.trucks = 0
  fx.partyUntil = 0
}

function endpointPos(e: Endpoint) {
  if ('bot' in e) {
    const v = robots.get(e.bot)
    if (v) return v.pos.clone().setY(1.7)
  }
  const [x, z] = deptPos('dept' in e ? e.dept : 'gate')
  return new Vector3(x, 1.7, z)
}

function goTo(v: RobotVis, target: Vector3, toDept: DeptId, wait: number) {
  const start = v.path.length ? v.path[v.path.length - 1].p : v.pos
  // sitting behind the desk: step sideways into the aisle first
  if (start.distanceTo(v.home) < 0.05) v.path.push({ p: v.aisle.clone(), wait: 0 })
  const from = v.path.length ? v.path[v.path.length - 1].p : v.pos
  const pts = route(from, target, toDept)
  pts.forEach((p, i) => v.path.push({ p, wait: i === pts.length - 1 ? wait : 0 }))
}

function goHome(v: RobotVis) {
  goTo(v, v.aisle, v.dept, 0)
  v.path.push({ p: v.home.clone(), wait: 0 })
}

function onLog(e: LogEntry) {
  fx.pins[e.dept] = performance.now()
  if (e.warn) sound.playWarning()
  else if (e.good) sound.playCash()
  else if (e.llm) sound.playBeep(720, 0.1)

  const v = e.botId ? robots.get(e.botId) : undefined
  if (!v) return
  v.bubble = {
    text: e.text,
    kind: e.llm ? 'llm' : e.warn ? 'warn' : e.good ? 'good' : '',
    key: e.id,
    until: performance.now() + (e.llm ? 4200 : 3200),
  }
}

function onEvent(e: SimEvent) {
  switch (e.type) {
    case 'reset': return resetRobots()
    case 'log': return onLog(e.entry)
    case 'packet':
      if (fx.packets.length < 48) fx.packets.push({ from: endpointPos(e.from), to: endpointPos(e.to), t: 0, color: new Color(e.color).multiplyScalar(1.6) })
      return
    case 'walk': {
      const v = robots.get(e.botId)
      if (!v || v.path.length) return
      goTo(v, visitPoint(e.to), e.to, 1.3)
      goHome(v)
      return
    }
    case 'charge': {
      const v = robots.get(e.botId)
      if (!v) return
      if (e.on) {
        const parked = [...robots.values()].flatMap(r => {
          const last = r.path.at(-1)
          return last && last.wait === Infinity ? [last.p] : []
        })
        const pad = CHARGERS.find(c => !parked.some(p => p.distanceTo(c) < 0.05)) ?? CHARGERS[0]
        v.path = []
        goTo(v, pad, 'hr', Infinity)
      } else {
        v.path = []
        goHome(v)
      }
      return
    }
    case 'truck': fx.trucks++; sound.playTruck(); return
    case 'party': fx.partyUntil = performance.now() + 7000; sound.playParty(); return
  }
}

resetRobots()
const off = company.on(onEvent)
import.meta.hot?.dispose(off)

export const deptColor = (d: DeptId) => DEPTS[d].color
