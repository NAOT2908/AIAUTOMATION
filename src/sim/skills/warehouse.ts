import type { SkillDef } from './types'

/* ------------------------------------------------------------------ */
/* forecast_stockout — Kho vận: dự báo mặt hàng sắp hết                */
/* ------------------------------------------------------------------ */

export interface StockoutOut {
  sku: string
  name: string
  /** số ngày bán còn đủ hàng (ước tính) */
  coverDays: number
  urgent: boolean
}

export const forecastStockoutSkill: SkillDef<Record<string, never>, StockoutOut> = {
  id: 'forecast_stockout',
  name: 'Dự báo hết hàng',
  icon: '📉',
  dept: ['wh'],
  desc: 'Thủ kho quét toàn bộ SKU, tìm mặt hàng sắp hết và hét lên trước khi quá muộn.',
  prompt:
    'Bạn là thủ kho của RoboCorp. Dựa vào tồn kho hiện tại và tốc độ bán trung bình, ' +
    'hãy chỉ ra mặt hàng nào sắp hết hàng nhất và đề xuất đặt mua gấp nếu dưới 2 ngày bán.',

  run(_, sim) {
    // data.ts ghi chú: reorderPoint ≈ 2 ngày bán → tốc độ bán/ngày ≈ reorderPoint / 2
    let worst: StockoutOut | null = null

    for (const p of sim.products) {
      const daily = Math.max(1, p.reorderPoint / 2)
      const coverDays = p.stock / daily
      if (!worst || coverDays < worst.coverDays) {
        worst = { sku: p.sku, name: p.name, coverDays, urgent: coverDays < 2 }
      }
    }

    if (!worst) return { value: null as unknown as StockoutOut, llm: false, text: '' }

    const days = worst.coverDays.toFixed(1).replace('.', ',')
    const text =
      worst.urgent
        ? `🚨 Cảnh báo tồn kho: ${worst.name} chỉ còn đủ ~${days} ngày bán. Đề xuất Buyer đặt PO GẤP`
        : worst.coverDays < 4
          ? `Lưu ý tồn kho: ${worst.name} còn ~${days} ngày bán, nên lên kế hoạch đặt hàng`
          : ''

    return { value: worst, llm: true, text }
  },
}
