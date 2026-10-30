import { create } from 'zustand'
import type { DeptId } from './sim/types'

export type Quality = 'high' | 'low'
export type District = 'all' | 'robocorp' | 'myoffice' | 'bistro' | 'pagoda' | 'club'
/** clickable furniture in the RoboCorp office */
/** mini-games played inside the city */
export type GameId = 'hub' | 'mo' | 'dj' | 'pho' | 'penalty' | 'guestbook' | 'scores'
export type PropId = 'tv' | 'salesTv' | 'coffee' | 'ledger' | 'chargers' | 'stock' | 'suppliers' | 'servers' | 'campaign' | 'truck' | 'lounge'

interface UIState {
  speed: number
  lastSpeed: number
  selected: string
  filter: DeptId | 'all'
  quality: Quality
  /** tilt-shift miniature look (high quality only) */
  diorama: boolean
  ready: boolean
  /** bumped a few times per second so panels re-read the simulation */
  tick: number
  zenMode: boolean
  showInspector: boolean
  showFeed: boolean
  district: District
  /** furniture under the pointer, for the tooltip */
  hoverProp: { name: string; hint: string } | null
  /** furniture whose info card is open */
  openProp: PropId | null
  /** open mini-game window */
  game: GameId | null
  setSpeed: (s: number) => void
  togglePause: () => void
  select: (id: string) => void
  setFilter: (f: DeptId | 'all') => void
  setQuality: (q: Quality) => void
  toggleZenMode: () => void
  toggleDiorama: () => void
  toggleInspector: () => void
  toggleFeed: () => void
  setDistrict: (district: District) => void
}

const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

export const useUI = create<UIState>(set => ({
  speed: 1,
  lastSpeed: 1,
  selected: 'ceo',
  filter: 'all',
  quality: urlParams?.get('quality') === 'low' ? 'low' : 'high',
  diorama: urlParams?.get('diorama') !== '0',
  ready: false,
  tick: 0,
  zenMode: urlParams ? urlParams.get('zen') === '1' || urlParams.get('zen') === 'true' : false,
  showInspector: urlParams ? urlParams.get('hideInspector') !== '1' : true,
  showFeed: urlParams ? urlParams.get('hideFeed') !== '1' : true,
  district: (urlParams?.get('district') as District) || 'all',
  hoverProp: null,
  openProp: (urlParams?.get('prop') as PropId | null) ?? null,
  game: (urlParams?.get('game') as GameId | null) ?? null,
  setSpeed: speed => set(s => ({ speed, lastSpeed: speed || s.lastSpeed })),
  togglePause: () => set(s => (s.speed ? { speed: 0, lastSpeed: s.speed } : { speed: s.lastSpeed })),
  select: selected => set({ selected }),
  setFilter: filter => set({ filter }),
  setQuality: quality => set({ quality }),
  toggleZenMode: () => set(s => ({ zenMode: !s.zenMode })),
  toggleDiorama: () => set(s => ({ diorama: !s.diorama })),
  toggleInspector: () => set(s => ({ showInspector: !s.showInspector })),
  toggleFeed: () => set(s => ({ showFeed: !s.showFeed })),
  setDistrict: district => set({ district }),
}))
