import { money } from '../format'
import type { SkillDef } from './types'

/* ------------------------------------------------------------------ */
/* choose_channel — Marketing: chọn kênh chạy chiến dịch                */
/* ------------------------------------------------------------------ */

export interface ChannelArgs {
  sku: string
  budget: number
}

export interface ChannelOut {
  channel: string
  reason: string
}

export const chooseChannelSkill: SkillDef<ChannelArgs, ChannelOut> = {
  id: 'choose_channel',
  name: 'Chọn kênh quảng cáo',
  icon: '📣',
  dept: ['mkt'],
  desc: 'Hàng rẻ thì đánh viral TikTok, hàng đắt thì chạy Google + KOL review.',
  prompt:
    'Bạn là chuyên viên marketing của RoboCorp. Với mỗi sản phẩm, hãy chọn kênh quảng cáo ' +
    'hợp lý nhất theo giá bán: dưới 100$ thì TikTok/Facebook viral, 100–300$ thì Facebook Ads ' +
    'targeting văn phòng, trên 300$ thì Google Search + KOL review vì khách cần tìm hiểu kỹ.',

  run({ args }, sim) {
    const product = sim.products.find(p => p.sku === args.sku)
    if (!product) return { value: null as unknown as ChannelOut, llm: false, text: '' }

    let channel: string
    let reason: string
    if (product.price < 100) {
      channel = 'TikTok + Facebook'
      reason = `giá chỉ ${money(product.price)}, hợp đánh viral ngắn`
    } else if (product.price < 300) {
      channel = 'Facebook Ads'
      reason = 'tầm trung, targeting dân văn phòng chuẩn'
    } else {
      channel = 'Google Search + KOL review'
      reason = `giá trị cao (${money(product.price)}), khách cần tìm hiểu kỹ trước khi mua`
    }
    if (args.budget < 1000) reason += '; ngân sách mỏng nên chạy bản tiết kiệm'

    return {
      value: { channel, reason },
      llm: true,
      text: `Chiến dịch cho ${product.name}: chạy ${channel} vì ${reason}, ngân sách ${money(args.budget)}`,
    }
  },
}
