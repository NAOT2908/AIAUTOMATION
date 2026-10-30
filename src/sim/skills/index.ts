import type { Decision, Maybe } from '../brain'
import type { DeptId } from '../types'
import { complaintSkill, upsellSkill } from './sales'
import type { SkillCtx, SkillDef, SkillSim } from './types'
import { forecastStockoutSkill } from './warehouse'
import { chooseChannelSkill } from './marketing'

/* Đăng ký skill mới: thêm 1 dòng ở SKILLS + 1 dòng import là xong. */
const SKILLS: SkillDef<any, any>[] = [
  upsellSkill,
  complaintSkill,
  forecastStockoutSkill,
  chooseChannelSkill,
]

const byId = new Map(SKILLS.map(s => [s.id, s]))

export function getSkill(id: string): SkillDef<any, any> | undefined {
  return byId.get(id)
}

/** Lấy toàn bộ skill mà một phòng ban được phép dùng (để build prompt cho LLM). */
export function skillsFor(dept: DeptId): SkillDef<any, any>[] {
  return SKILLS.filter(s => s.dept.includes(dept))
}

export function allSkills(): SkillDef<any, any>[] {
  return [...SKILLS]
}

/**
 * Chạy 1 skill và trả về Decision — engine.ts chỉ cần gọi hàm này,
 * không cần biết bên dưới là luật (RuleBrain) hay LLM (ClaudeBrain).
 */
export function runSkill<Args, Out>(
  id: string,
  ctx: SkillCtx<Args>,
  sim: SkillSim,
): Maybe<Decision<Out>> {
  const skill = byId.get(id) as SkillDef<Args, Out> | undefined
  if (!skill) throw new Error(`Không tìm thấy skill: ${id}`)
  return skill.run(ctx, sim)
}

export type { SkillCtx, SkillDef, SkillSim }
