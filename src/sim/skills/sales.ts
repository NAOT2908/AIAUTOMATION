import { money, pick } from '../format'
import type { SkillDef } from './types'

/* ------------------------------------------------------------------ */
/* upsell — Kinh doanh: gợi ý mua thêm phụ kiện khi chốt đơn            */
/* ------------------------------------------------------------------ */

const COMPLEMENT: Record<string, string> = {
  LAP: 'MOU', // Laptop RB-14  -> Chuột Click-O
  MON: 'MOU', // Màn hình 27"  -> Chuột Click-O
  HDP: 'MOU', // Tai nghe Beep -> Chuột Click-O
}

export interface UpsellArgs {
  customer: string
  sku: string
  qty: number
}

export interface UpsellOut {
  addSku: string | null
  addQty: number
  discount: number // 0–1
}

export const upsellSkill: SkillDef<UpsellArgs, UpsellOut> = {
  id: 'upsell',
  name: 'Gợi ý mua thêm',
  icon: '🛍️',
  dept: ['sales'],
  desc: 'Khi chốt đơn, gợi ý khách mua thêm phụ kiện đi kèm để tăng giá trị đơn hàng.',
  prompt:
    'Bạn là nhân viên kinh doanh của RoboCorp. Khi khách đã chọn sản phẩm chính, ' +
    'hãy gợi ý đúng MỘT phụ kiện đi kèm phù hợp, kèm chiết khấu bundle nhỏ (3–7%). ' +
    'Trả lời ngắn gọn, vui vẻ, không dài dòng.',

  run({ args }, sim) {
    const main = sim.products.find(p => p.sku === args.sku)
    const add = main ? sim.products.find(p => p.sku === COMPLEMENT[main.sku]) : undefined

    if (!main || !add || add.stock < args.qty) {
      return { value: { addSku: null, addQty: 0, discount: 0 }, llm: false, text: '' }
    }

    const discount = pick([0.03, 0.05, 0.07])
    const addQty = Math.min(args.qty, add.stock)

    return {
      value: { addSku: add.sku, addQty, discount },
      llm: true,
      text:
        `${args.customer} đã chốt ${args.qty} × ${main.name}. ` +
        `Gợi ý thêm ${addQty} × ${add.name} đi kèm, giảm ${Math.round(discount * 100)}% bundle`,
    }
  },
}

/* ------------------------------------------------------------------ */
/* handle_complaint — Kinh doanh: xử lý khiếu nại khách hàng            */
/* ------------------------------------------------------------------ */

export interface ComplaintArgs {
  customer: string
  sku: string
  issue: 'late' | 'broken' | 'wrong'
}

export interface ComplaintOut {
  remedy: string
  /** chi phí xử lý ước tính ($) — engine trừ vào cash khi áp dụng */
  cost: number
}

const ISSUE_LABEL: Record<ComplaintArgs['issue'], string> = {
  late: 'giao hàng trễ',
  broken: 'hàng bị lỗi',
  wrong: 'giao nhầm hàng',
}

export const complaintSkill: SkillDef<ComplaintArgs, ComplaintOut> = {
  id: 'handle_complaint',
  name: 'Xử lý khiếu nại',
  icon: '🙏',
  dept: ['sales'],
  desc: 'Khách phàn nàn thì chọn cách đền bù hợp lý: càng nặng càng tốn kém, nhưng giữ được khách.',
  prompt:
    'Bạn là nhân viên chăm sóc khách hàng của RoboCorp. Khách đang bực vì sự cố. ' +
    'Hãy chọn cách đền bù vừa đủ: giao trễ thì giảm giá + freeship, hàng lỗi thì đổi mới 1-đổi-1, ' +
    'giao nhầm thì đổi đúng + tặng voucher. Trả lời chân thành, nhận lỗi trước.',

  run({ args }, sim) {
    const product = sim.products.find(p => p.sku === args.sku)

    let remedy: string
    let cost: number
    switch (args.issue) {
      case 'late':
        remedy = 'Giảm 5% đơn sau + miễn phí giao hàng'
        cost = 0
        break
      case 'broken':
        remedy = 'Đổi mới 1-đổi-1 trong 7 ngày'
        cost = product ? product.cost : 0
        break
      case 'wrong':
        remedy = 'Đổi đúng hàng + tặng voucher 50 $'
        cost = 50
        break
    }

    return {
      value: { remedy, cost },
      llm: true,
      text:
        `${args.customer} khiếu nại ${ISSUE_LABEL[args.issue]} (${product?.name ?? args.sku}). ` +
        `Xử lý: ${remedy}${cost ? `, chi phí ~${money(cost)}` : ''}`,
    }
  },
}
