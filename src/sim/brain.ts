import { SLOGANS } from './data'
import { money, pick, randInt } from './format'
import type { Product, Quote } from './types'

/**
 * The decisions an LLM will make in phase 3. Every method may return a value or a Promise,
 * so an async Claude-backed brain can replace RuleBrain without touching the engine.
 */
export type Maybe<T> = T | Promise<T>

export interface Decision<T> {
  value: T
  /** what the robot says in the activity log; empty means nothing to log */
  text: string
  /** true when this decision belongs to the LLM layer */
  llm: boolean
}

export interface NegotiateCtx { customer: string; product: Product; qty: number; vip: boolean }
export interface SupplierCtx { product: Product; qty: number; urgent: boolean; waiting: number; quotes: Quote[]; coverDays: number }
export interface ApprovalCtx { product: Product; qty: number; total: number; cash: number; backQty: number }
export interface BriefCtx { day: number; profit: number; target: number; cash: number; backorders: number; best: Product }
export interface SummaryCtx { day: number; orders: number; revenue: number; cash: number }

export interface Brain {
  /** returns the discount rate (0–1) */
  negotiate(c: NegotiateCtx): Maybe<Decision<number>>
  chooseSupplier(c: SupplierCtx): Maybe<Decision<Quote>>
  /** returns the approved quantity */
  approvePurchase(c: ApprovalCtx): Maybe<Decision<number>>
  morningBrief(c: BriefCtx): Maybe<Decision<{ frugal: boolean }>>
  dailySummary(c: SummaryCtx): Maybe<Decision<null>>
  diagnose(): Maybe<Decision<null>>
  /** returns the campaign slogan */
  campaign(c: { product: Product }): Maybe<Decision<string>>
}

/** Rule-based stand-in for the LLM: same decisions, scripted wording. */
export class RuleBrain implements Brain {
  negotiate({ customer, product, vip }: NegotiateCtx): Decision<number> {
    if (vip) {
      const disc = pick([0.03, 0.05, 0.07])
      const unit = product.price * (1 - disc)
      const margin = Math.round(((unit - product.cost) / unit) * 100)
      return { value: disc, llm: true, text: `${customer} xin giảm ${randInt(9, 14)}%. Đề xuất ${disc * 100}% vì đơn lớn, vẫn giữ biên lãi ${margin}%` }
    }
    if (Math.random() < 0.22) return { value: 0.02, llm: false, text: `Khách quen ${customer}: tặng chiết khấu 2% để giữ quan hệ` }
    return { value: 0, llm: false, text: '' }
  }

  chooseSupplier({ quotes, urgent, waiting, coverDays }: SupplierCtx): Decision<Quote> {
    const fastest = quotes.slice().sort((a, b) => a.lead - b.lead || a.unit - b.unit)[0]
    if (urgent) {
      return { value: fastest, llm: true, text: `Chọn ${fastest.supplier.name}: giao nhanh nhất (${fastest.lead} ngày) vì đang có ${waiting} đơn chờ hàng` }
    }
    const inTime = quotes.filter(q => q.lead < coverDays).sort((a, b) => a.unit - b.unit)
    const days = coverDays.toFixed(1).replace('.', ',')
    if (!inTime.length) {
      return { value: fastest, llm: true, text: `Tồn chỉ đủ ~${days} ngày, chọn ${fastest.supplier.name} giao nhanh nhất (${fastest.lead} ngày)` }
    }
    const q = inTime[0]
    return { value: q, llm: true, text: `Chọn ${q.supplier.name}: rẻ nhất trong các NCC giao kịp (${q.lead} ngày, tồn còn đủ ~${days} ngày)` }
  }

  approvePurchase({ product, qty, total, cash, backQty }: ApprovalCtx): Decision<number> {
    if (cash < total * 1.4) {
      const approved = Math.max(backQty, Math.ceil(qty / 2))
      return { value: approved, llm: true, text: `Tiền mặt còn ${money(cash)}. Chỉ duyệt ${approved} cái, đợt sau mua tiếp` }
    }
    return { value: qty, llm: true, text: `Duyệt PO ${money(total)}. ${product.name} bán chạy, nhập đủ số lượng` }
  }

  morningBrief({ day, profit, target, cash, backorders, best }: BriefCtx): Decision<{ frugal: boolean }> {
    const frugal = cash < 45000
    let text: string
    if (day === 1) text = `Chào buổi sáng RoboCorp! Mục tiêu tháng: lãi ${money(target)}. Bán nhiều, nhập hàng khôn ngoan`
    else if (backorders) text = `Ưu tiên hôm nay: xử lý ${backorders} đơn đang chờ hàng. Mua hàng được chọn NCC giao nhanh`
    else if (frugal) text = `Tiền mặt mỏng (${money(cash)}). Tạm dừng marketing, siết duyệt chi`
    else text = `Đã đạt ${Math.max(0, Math.round((profit / target) * 100))}% mục tiêu lãi tháng. Hôm nay đẩy mạnh ${best.name}`
    return { value: { frugal }, llm: true, text }
  }

  dailySummary({ day, orders, revenue, cash }: SummaryCtx): Decision<null> {
    return { value: null, llm: true, text: `Tổng kết ngày ${day}: ${orders} đơn, doanh thu ${money(revenue)}, tiền mặt ${money(cash)}` }
  }

  diagnose(): Decision<null> {
    return {
      value: null,
      llm: true,
      text: pick([
        'Chẩn đoán: ổ đĩa đầy do log cũ. Dọn log, khởi động lại dịch vụ',
        'Chẩn đoán: một truy vấn báo cáo khóa bảng tồn kho. Hủy truy vấn, thêm chỉ mục',
        'Chẩn đoán: chứng chỉ SSL hết hạn. Gia hạn và khởi động lại cổng API',
      ]),
    }
  }

  campaign({ product }: { product: Product }): Decision<string> {
    const slogan = pick(SLOGANS)
    return { value: slogan, llm: true, text: `Chiến dịch "${slogan}" cho ${product.name} (bán chậm nhất), ngân sách 1.500 $` }
  }
}
