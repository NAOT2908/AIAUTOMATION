export type DeptId = 'ceo' | 'acc' | 'hr' | 'sales' | 'wh' | 'buy' | 'it' | 'mkt' | 'gate'
export type BotStatus = 'idle' | 'working' | 'charging' | 'error'
export type ViewStatus = BotStatus | 'thinking' | 'walking'

export interface Dept {
  id: DeptId
  name: string
  icon: string
  color: string
  /** room centre on the office floor, [x, z] */
  pos: [number, number]
}

export interface BotDef {
  id: string
  name: string
  dept: DeptId
  role: string
  persona: string
  brain: string
  /** x offset of the robot's desk inside its room */
  desk: number
}

export interface Bot extends BotDef {
  energy: number
  status: BotStatus
  thought: string
  done: number
  history: LogEntry[]
  load: number
  lastActive: number
  thinkingUntil: number
}

export interface ProductDef {
  sku: string
  name: string
  cost: number
  price: number
  stock: number
  reorderPoint: number
  lot: number
  qty: [number, number]
  weight: number
}

export interface Product extends ProductDef {
  openPO: boolean
  demand: number
  demandUntil: number
  sold: number
}

export interface Supplier {
  name: string
  factor: number
  lead: number
}

export interface Quote {
  supplier: Supplier
  unit: number
  lead: number
}

export interface SalesOrder {
  so: string
  customer: string
  product: Product
  qty: number
  unit: number
  bot: Bot
}

export interface LogFlags {
  llm?: boolean
  warn?: boolean
  good?: boolean
}

export interface LogEntry extends LogFlags {
  id: number
  t: number
  dept: DeptId
  botId: string | null
  who: string
  text: string
}

export type Endpoint = { bot: string } | { dept: DeptId }

export type SimEvent =
  | { type: 'log'; entry: LogEntry }
  | { type: 'packet'; from: Endpoint; to: Endpoint; color: string }
  | { type: 'walk'; botId: string; to: DeptId }
  | { type: 'truck' }
  | { type: 'charge'; botId: string; on: boolean }
  | { type: 'party' }
  | { type: 'bankrupt' }
  | { type: 'reset' }

export type ChaosId = 'vip' | 'supplier' | 'outage' | 'sale' | 'strike' | 'audit'
