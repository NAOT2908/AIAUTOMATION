import { Vector3 } from 'three'
import { DEPTS } from '../sim/data'
import { rnd } from '../sim/format'
import type { BotDef, DeptId } from '../sim/types'

/** room footprint; rooms sit on a 6.2 × 5.4 grid, leaving 1.2-wide corridors */
export const ROOM_W = 5
export const ROOM_D = 4.2
export const DESK_Z = -0.45
/** robots sit behind their desk, facing the camera */
export const HOME_Z = -1.3
/** vertical corridors between the room columns */
const CORRIDOR_X = [-3.1, 3.1]
/** the floor slab */
export const FLOOR = { minX: -9.3, maxX: 9.3, minZ: -8.1, maxZ: 8.9 }

export const deptPos = (d: DeptId) => DEPTS[d].pos
/** z of the corridor running in front of a room */
const frontZ = (d: DeptId) => deptPos(d)[1] + ROOM_D / 2 + 0.6

export function homeOf(b: BotDef) {
  const [x, z] = deptPos(b.dept)
  return new Vector3(x + b.desk, 0, z + HOME_Z)
}

/** the free lane beside a robot's desk, used to step out from behind it */
export function aisleOf(b: BotDef) {
  const [x, z] = deptPos(b.dept)
  const side = b.desk <= 0 ? 1 : -1
  const reach = b.dept === 'ceo' ? 1.2 : 0.95
  return new Vector3(x + b.desk + side * reach, 0, z + HOME_Z)
}

export function visitPoint(d: DeptId) {
  const [x, z] = deptPos(d)
  return new Vector3(x + rnd(-1.1, 1.1), 0, z + rnd(0.6, 1.4))
}

export const CHARGERS = [0.6, 1.3, 2.0].map(dx => new Vector3(deptPos('hr')[0] + dx, 0, deptPos('hr')[1] + 1.1))

export function deptAt(p: Vector3): DeptId | null {
  for (const d of Object.values(DEPTS)) {
    if (Math.abs(p.x - d.pos[0]) <= ROOM_W / 2 && Math.abs(p.z - d.pos[1]) <= ROOM_D / 2) return d.id
  }
  return null
}

/**
 * Manhattan route through the corridors: leave the room through its open front,
 * follow the corridors, enter the target room from the front. Rooms are walled on
 * their back and left sides, so this never crosses a wall.
 */
export function route(from: Vector3, to: Vector3, toDept: DeptId): Vector3[] {
  const fromDept = deptAt(from)
  if (fromDept === toDept) return [to.clone()]
  const pts: Vector3[] = []
  let z = from.z
  if (fromDept) {
    z = frontZ(fromDept)
    pts.push(new Vector3(from.x, 0, z))
  } else {
    // already in a corridor: first snap onto the nearest horizontal corridor
    const fronts = Object.values(DEPTS).map(d => frontZ(d.id))
    z = fronts.reduce((a, b) => (Math.abs(b - from.z) < Math.abs(a - from.z) ? b : a))
    if (Math.abs(z - from.z) > 0.01) pts.push(new Vector3(from.x, 0, z))
  }
  const zb = frontZ(toDept)
  if (Math.abs(z - zb) < 0.01) {
    pts.push(new Vector3(to.x, 0, zb))
  } else {
    const mid = (from.x + to.x) / 2
    const xv = CORRIDOR_X.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a))
    pts.push(new Vector3(xv, 0, z), new Vector3(xv, 0, zb), new Vector3(to.x, 0, zb))
  }
  pts.push(to.clone())
  return pts
}
