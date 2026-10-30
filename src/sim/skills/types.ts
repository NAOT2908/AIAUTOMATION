import type { Decision, Maybe } from '../brain'
import type { Bot, DeptId, Product } from '../types'

/**
 * Dữ liệu mô phỏng mà skill được PHÉP ĐỌC (read-only).
 * Skill không mutate sim trực tiếp — mọi thay đổi đi qua Decision.value
 * để engine.ts áp dụng, đúng pattern hiện tại của Brain.
 */
export interface SkillSim {
  t: number
  day: number
  cash: number
  products: Product[]
  bots: Bot[]
}

export interface SkillCtx<Args = Record<string, unknown>> {
  bot: Bot
  args: Args
}

export interface SkillDef<Args = Record<string, unknown>, Out = unknown> {
  /** id duy nhất, dùng để gọi: runSkill('upsell', ...) */
  id: string
  /** tên hiển thị tiếng Việt */
  name: string
  icon: string
  /** phòng ban nào được dùng skill này */
  dept: DeptId[]
  desc: string
  /** đoạn system-prompt khi chạy bằng LLM thật (ClaudeBrain) */
  prompt: string
  run: (ctx: SkillCtx<Args>, sim: SkillSim) => Maybe<Decision<Out>>
}
