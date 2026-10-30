import { RuleBrain, type Brain, type Decision, type NegotiateCtx, type SupplierCtx, type ApprovalCtx, type BriefCtx, type SummaryCtx } from './brain'
import { money } from './format'
import { callUniversalLLM, getUniversalSettings } from './llmService'
import type { Product, Quote } from './types'

export interface AISettings {
  apiKey: string
  model: string
  enabled: boolean
}

export function getAISettings(): AISettings {
  const u = getUniversalSettings()
  return {
    apiKey: u.gemini.apiKey,
    model: u.gemini.model,
    enabled: u.enabled,
  }
}

export function setAISettings(settings: Partial<AISettings>) {
  const u = getUniversalSettings()
  if (settings.apiKey !== undefined) u.gemini.apiKey = settings.apiKey
  if (settings.model !== undefined) u.gemini.model = settings.model
  if (settings.enabled !== undefined) u.enabled = settings.enabled
  localStorage.setItem('robocorp_universal_ai', JSON.stringify(u))
  localStorage.setItem('robocorp_ai_enabled', String(u.enabled))
  localStorage.setItem('robocorp_gemini_key', u.gemini.apiKey)
  localStorage.setItem('robocorp_gemini_model', u.gemini.model)
}

export class GeminiBrain implements Brain {
  private fallback = new RuleBrain()

  async negotiate(c: NegotiateCtx): Promise<Decision<number>> {
    const base = this.fallback.negotiate(c)
    const settings = getUniversalSettings()
    if (!settings.enabled) return base

    try {
      const prompt = `Bạn là Sales-Bot của RoboCorp. Khách hàng ${c.customer} (${c.vip ? 'Khách VIP' : 'Khách thường'}) đặt mua ${c.qty} chiếc ${c.product.name} (giá gốc: ${c.product.price}$, giá vốn: ${c.product.cost}$).
Quyết định chiết khấu đã đề xuất: ${base.value * 100}%.
Hãy viết 1 câu thoại ngắn gọn (dưới 25 từ) bằng tiếng Việt giải thích cho khách hoặc log hệ thống, thể hiện phong cách đàm phán thông minh, vui tính. Chỉ trả về nội dung câu nói, không thêm ngoặc kép hay tiền tố.`
      const res = await callUniversalLLM({ prompt, deptId: 'sales' })
      if (res.text) return { value: base.value, llm: true, text: res.text }
    } catch (e) {
      console.warn('LLM negotiate fallback:', e)
    }
    return base
  }

  async chooseSupplier(c: SupplierCtx): Promise<Decision<Quote>> {
    const base = this.fallback.chooseSupplier(c)
    const settings = getUniversalSettings()
    if (!settings.enabled) return base

    try {
      const quote = base.value
      const prompt = `Bạn là Purchasing-Bot của RoboCorp. Bạn vừa chọn nhà cung cấp ${quote.supplier.name} cho sản phẩm ${c.product.name} (đơn giá: ${quote.unit}$, thời gian giao: ${quote.lead} ngày). Tồn kho còn đủ ${c.coverDays.toFixed(1)} ngày.
Hãy viết 1 câu giải thích ngắn gọn (dưới 25 từ) bằng tiếng Việt lý do chọn NCC này. Chỉ trả về câu nói.`
      const res = await callUniversalLLM({ prompt, deptId: 'buy' })
      if (res.text) return { value: quote, llm: true, text: res.text }
    } catch (e) {
      console.warn('LLM supplier fallback:', e)
    }
    return base
  }

  async approvePurchase(c: ApprovalCtx): Promise<Decision<number>> {
    const base = this.fallback.approvePurchase(c)
    const settings = getUniversalSettings()
    if (!settings.enabled) return base

    try {
      const prompt = `Bạn là CEO-Bot của RoboCorp. Phòng Mua hàng xin duyệt lệnh mua ${c.qty} chiếc ${c.product.name} tổng tiền ${money(c.total)}. Tiền mặt hiện có: ${money(c.cash)}.
Bạn đã quyết định duyệt: ${base.value} chiếc.
Hãy viết 1 câu chỉ đạo ngắn gọn (dưới 25 từ) bằng tiếng Việt phong cách CEO quyết đoán, súc tích. Chỉ trả về câu nói.`
      const res = await callUniversalLLM({ prompt, deptId: 'ceo' })
      if (res.text) return { value: base.value, llm: true, text: res.text }
    } catch (e) {
      console.warn('LLM approval fallback:', e)
    }
    return base
  }

  async morningBrief(c: BriefCtx): Promise<Decision<{ frugal: boolean }>> {
    const base = this.fallback.morningBrief(c)
    const settings = getUniversalSettings()
    if (!settings.enabled) return base

    try {
      const prompt = `Bạn là CEO-Bot của RoboCorp. Hôm nay là Ngày thứ ${c.day}. Lợi nhuận lũy kế: ${money(c.profit)} / Mục tiêu: ${money(c.target)}. Tiền mặt: ${money(c.cash)}. Đơn chờ hàng: ${c.backorders}. Sản phẩm bán chạy nhất: ${c.best.name}.
Hãy viết 1 câu chỉ đạo giao ban buổi sáng (dưới 30 từ) truyền cảm hứng hoặc cảnh báo thực tế cho toàn bộ nhân viên robot. Chỉ trả lời câu nói.`
      const res = await callUniversalLLM({ prompt, deptId: 'ceo' })
      if (res.text) return { value: base.value, llm: true, text: res.text }
    } catch (e) {
      console.warn('LLM morningBrief fallback:', e)
    }
    return base
  }

  async dailySummary(c: SummaryCtx): Promise<Decision<null>> {
    const base = this.fallback.dailySummary(c)
    const settings = getUniversalSettings()
    if (!settings.enabled) return base

    try {
      const prompt = `Bạn là CEO-Bot của RoboCorp. Tổng kết ngày ${c.day}: Đạt ${c.orders} đơn hàng, Doanh thu: ${money(c.revenue)}, Tiền mặt: ${money(c.cash)}.
Hãy viết 1 câu tổng kết ngày ngắn gọn (dưới 25 từ) bằng tiếng Việt, nhận xét khách quan và hài hước. Chỉ trả về câu nói.`
      const res = await callUniversalLLM({ prompt, deptId: 'ceo' })
      if (res.text) return { value: null, llm: true, text: res.text }
    } catch (e) {
      console.warn('LLM dailySummary fallback:', e)
    }
    return base
  }

  async diagnose(): Promise<Decision<null>> {
    const base = this.fallback.diagnose()
    const settings = getUniversalSettings()
    if (!settings.enabled) return base

    try {
      const prompt = `Bạn là IT-Bot của RoboCorp. Hệ thống server CRM vừa gặp sự cố quá tải.
Hãy nghĩ ra 1 nguyên nhân kỹ thuật hài hước (dưới 25 từ) và cách khắc phục kiểu robot IT (ví dụ: ổ đĩa đầy do log, tràn bộ nhớ RAM, chuột cắn cáp quang tử, truy vấn khóa bảng tồn kho). Chỉ trả về câu nói bắt đầu bằng "Chẩn đoán: ..."`
      const res = await callUniversalLLM({ prompt, deptId: 'it' })
      if (res.text) return { value: null, llm: true, text: res.text }
    } catch (e) {
      console.warn('LLM diagnose fallback:', e)
    }
    return base
  }

  async campaign(c: { product: Product }): Promise<Decision<string>> {
    const base = this.fallback.campaign(c)
    const settings = getUniversalSettings()
    if (!settings.enabled) return base

    try {
      const prompt = `Bạn là Marketing-Bot của RoboCorp. Sản phẩm "${c.product.name}" đang bán chậm nhất công ty.
Hãy sáng tạo 1 khẩu hiệu (slogan) quảng cáo cực kỳ bắt trend, độc lạ, dí dỏm bằng tiếng Việt (dưới 15 từ) để kích cầu bán hàng. Chỉ trả về câu slogan không thêm dấu ngoặc kép.`
      const res = await callUniversalLLM({ prompt, deptId: 'mkt' })
      if (res.text) {
        return {
          value: res.text,
          llm: true,
          text: `Chiến dịch "${res.text}" cho ${c.product.name} (do ${res.providerLabel} sáng tạo), ngân sách 1.500 $`,
        }
      }
    } catch (e) {
      console.warn('LLM campaign fallback:', e)
    }
    return base
  }
}
