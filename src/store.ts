import { create } from 'zustand'
import type { DeptId } from './sim/types'

export type Quality = 'high' | 'low'

interface UIState {
  speed: number
  lastSpeed: number
  selected: string
  filter: DeptId | 'all'
  quality: Quality
  ready: boolean
  /** bumped a few times per second so panels re-read the simulation */
  tick: number
  setSpeed: (s: number) => void
  togglePause: () => void
  select: (id: string) => void
  setFilter: (f: DeptId | 'all') => void
  setQuality: (q: Quality) => void
}

export const useUI = create<UIState>(set => ({
  speed: 1,
  lastSpeed: 1,
  selected: 'ceo',
  filter: 'all',
  quality: 'high',
  ready: false,
  tick: 0,
  setSpeed: speed => set(s => ({ speed, lastSpeed: speed || s.lastSpeed })),
  togglePause: () => set(s => (s.speed ? { speed: 0, lastSpeed: s.speed } : { speed: s.lastSpeed })),
  select: selected => set({ selected }),
  setFilter: filter => set({ filter }),
  setQuality: quality => set({ quality }),
}))
