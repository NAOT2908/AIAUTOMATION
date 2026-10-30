import type { Brain, Decision, Maybe } from '../brain'
import type { Bot } from '../types'
import { skillsFor } from './index'
import type { SkillDef } from './types'

/**
 * Khung sườn gắn LLM thật (Claude) mà KHÔNG sửa engine.ts.
 *
 * Ý tưởng: mỗi phòng ban có system prompt = persona của robot + danh sách
 * skill được phép dùng. Khi engine gọi brain.negotiate(...) hay runSkill(...),
 * ClaudeBrain gửi prompt lên Claude API và parse kết quả về Decision.
 *
 * TODO của bạn:
 *  1. Điền ANTHROPIC_API_KEY (qua env, không hardcode).
 *  2. Hiện thực hàm callClaude() bằng fetch tới https://api.anthropic.com/v1/messages.
 *  3. Parse JSON từ Claude về đúng shape Decision.value của từng skill.
 * Trong lúc chưa xong, RuleBrain vẫn chạy bình thường — 2 brain song song được.
 */
export class ClaudeBrain implements Brain {
  constructor(
    private apiKey: string,
    private model = 'claude-sonnet-4-5-20250929',
  ) {}

  /** System prompt cho 1 robot: persona + skill được phép dùng. */
  public systemFor(bot: Bot): string {
    const skills: SkillDef<any, any>[] = skillsFor(bot.dept)
    const skillList = skills
      .map(s => `- ${s.id}: ${s.desc}\n  Gợi ý: ${s.prompt}`)
      .join('\n')
    return [
      `Bạn là ${bot.name}, ${bot.role} tại công ty RoboCorp.`,
      `Tính cách: ${bot.persona}`,
      `Bạn chỉ được dùng các kỹ năng sau (trả về JSON theo đúng cấu trúc được yêu cầu):`,
      skillList,
      `Luôn trả lời bằng tiếng Việt, ngắn gọn như một robot bận rộn.`,
    ].join('\n')
  }

  private async callClaude(system: string, user: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) throw new Error(`Claude API lỗi: ${res.status}`)
    const data = (await res.json()) as {
      content: { type: string; text?: string }[]
    }
    return data.content.map(c => c.text ?? '').join('')
  }

  // ---- 7 method của interface Brain: giữ nguyên chữ ký, chỉ đổi ruột ----

  async negotiate(c: any): Promise<Decision<number>> {
    // Ví dụ: vẫn dùng luật cho số, chỉ nhờ Claude viết câu log cho hay
    const { RuleBrain } = await import('../brain')
    const base = new RuleBrain().negotiate(c) as Decision<number>
    if (!base.text) return base
    try {
      const line = await this.callClaude(
        'Bạn là Sales-Bot của RoboCorp. Viết lại câu sau cho tự nhiên, hài hước nhẹ, giữ nguyên con số. Chỉ trả về 1 câu.',
        base.text,
      )
      return { ...base, text: line.trim() || base.text }
    } catch {
      return base // LLM lỗi thì rớt về luật — sim không bao giờ đứng
    }
  }

  // Các method còn lại: hiện thực dần, mẫu chung là:
  //   1. build prompt từ systemFor(bot) + ngữ cảnh c
  //   2. gọi callClaude, parse JSON -> Decision
  //   3. catch -> fallback về RuleBrain
  async chooseSupplier(c: any): Promise<Decision<any>> {
    const { RuleBrain } = await import('../brain')
    return new RuleBrain().chooseSupplier(c) as Decision<any>
  }

  async approvePurchase(c: any): Promise<Decision<number>> {
    const { RuleBrain } = await import('../brain')
    return new RuleBrain().approvePurchase(c) as Decision<number>
  }

  async morningBrief(c: any): Promise<Decision<{ frugal: boolean }>> {
    const { RuleBrain } = await import('../brain')
    return new RuleBrain().morningBrief(c) as Decision<{ frugal: boolean }>
  }

  async dailySummary(c: any): Promise<Decision<null>> {
    const { RuleBrain } = await import('../brain')
    return new RuleBrain().dailySummary(c) as Decision<null>
  }

  async diagnose(): Promise<Decision<null>> {
    const { RuleBrain } = await import('../brain')
    return new RuleBrain().diagnose()
  }

  async campaign(c: any): Promise<Decision<string>> {
    const { RuleBrain } = await import('../brain')
    return new RuleBrain().campaign(c)
  }
}

/** Giữ đúng tên type để engine không phải sửa gì khi đổi brain. */
export type AnyBrain = Brain
export type { Maybe }
