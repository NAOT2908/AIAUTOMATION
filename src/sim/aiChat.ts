import { sound } from '../audio/sound'
import { robots } from '../scene/vis'
import { company } from './engine'
import { money } from './format'
import { callUniversalLLM, getUniversalSettings } from './llmService'

export interface ChatMessage {
  id: string
  sender: 'user' | 'bot'
  text: string
  time: string
  badge?: string
}

export async function chatWithAgent(botId: string, message: string): Promise<string> {
  const bot = company.bot(botId)
  const settings = getUniversalSettings()

  const liveContext = {
    botName: bot.name,
    botRole: bot.role,
    botPersona: bot.persona,
    energy: Math.round(bot.energy),
    status: bot.status,
    cash: money(company.cash),
    profit: money(company.profit),
    target: money(company.target),
    day: company.day,
    satisfaction: Math.round(company.satisfaction),
    backorders: company.backorders.length,
    products: company.products.map(p => `${p.name} (tồn: ${p.stock})`).join(', '),
  }

  let reply = ''

  if (settings.enabled) {
    try {
      const prompt = `Bạn đang nhập vai vào robot "${liveContext.botName}" (${liveContext.botRole}, tính cách: "${liveContext.botPersona}") tại công ty RoboCorp.
Người dùng là Chủ tịch Hội đồng Quản trị vừa gửi cho bạn một tin nhắn: "${message}".

Dữ liệu thực tế hiện tại của công ty:
- Tiền mặt: ${liveContext.cash}
- Lợi nhuận lũy kế: ${liveContext.profit} / Mục tiêu: ${liveContext.target}
- Sự hài lòng khách hàng: ${liveContext.satisfaction}%
- Ngày vận hành: Ngày ${liveContext.day}
- Đơn hàng chờ hàng: ${liveContext.backorders}
- Tồn kho sản phẩm: ${liveContext.products}
- Năng lượng của bạn: ${liveContext.energy}% (Trạng thái: ${liveContext.status})

Hãy trả lời Chủ tịch bằng tiếng Việt một cách tự nhiên, hài hước, đúng với tính cách và vai trò của phòng ban bạn, bám sát các số liệu thực tế trên. Giữ câu trả lời ngắn gọn trong 2 đến 3 câu.`

      const res = await callUniversalLLM({
        prompt,
        deptId: bot.dept,
      })
      if (res.text) {
        reply = res.text
      }
    } catch (err) {
      console.warn('AI chat API fallback:', err)
    }
  }

  // Fallback intelligent simulated response if no API key or offline
  if (!reply) {
    const q = message.toLowerCase()
    if (botId === 'ceo') {
      if (q.includes('tiền') || q.includes('tài chính') || q.includes('lãi')) {
        reply = `Báo cáo Chủ tịch! Tiền mặt hiện có ${liveContext.cash}, lãi lũy kế ${liveContext.profit} (đạt ${Math.round((company.profit / company.target) * 100)}% mục tiêu). Chúng tôi đang kiểm soát chi tiêu rất chặt chẽ.`
      } else if (q.includes('sa thải') || q.includes('đuổi')) {
        reply = `Chủ tịch bớt nóng! Các robot ở đây hoạt động 24/7 chỉ tốn điện sạc pin chứ không đòi tăng lương đâu ạ!`
      } else if (q.includes('chào') || q.includes('hello') || q.includes('hi')) {
        reply = `Kính chào Chủ tịch! CEO-Bot sẵn sàng nhận chỉ đạo để đưa RoboCorp đạt mốc lợi nhuận ${liveContext.target}!`
      } else {
        reply = `Chủ tịch yên tâm! Ngày thứ ${liveContext.day} này toàn thể 8 bộ phận robot đang vận hành trơn tru với độ hài lòng khách hàng ${liveContext.satisfaction}%.`
      }
    } else if (botId === 'sales') {
      if (q.includes('khách') || q.includes('đơn') || q.includes('bán')) {
        reply = `Sales-Bot báo cáo: Khách quen và VIP liên tục đặt hàng. Hiện còn ${liveContext.backorders} đơn đang chờ kho vận xuất xưởng!`
      } else {
        reply = `Em đang tích cực chốt đơn đây Chủ tịch ơi! Khách xin giảm giá thì em cứ bám sát biên lợi nhuận mà đàm phán!`
      }
    } else if (botId === 'it') {
      if (q.includes('lỗi') || q.includes('server') || q.includes('sập')) {
        reply = `Hệ thống CRM đang chạy ổn định 99.9% uptime! Em vừa tối ưu hóa chỉ mục cơ sở dữ liệu và dọn cache xong.`
      } else {
        reply = `IT-Bot chào Sếp! Em đang trực monitoring, CPU 20%, nhiệt độ mát rượi, không có hacker nào đột nhập được đâu!`
      }
    } else if (botId === 'mkt') {
      reply = `Marketing-Bot đang ấp ủ chiến dịch quảng bá viral mới cho các mặt hàng bán chạy. Sếp chuẩn bị đón bão đơn hàng nhé!`
    } else if (botId === 'buy') {
      reply = `Purchasing-Bot báo cáo: Em luôn so sánh giữa các nhà cung cấp để chọn nơi giá rẻ nhất và giao hàng kịp tiến độ tồn kho!`
    } else if (botId === 'wh') {
      reply = `Kho vận sẵn sàng! Tình trạng các mặt hàng: ${liveContext.products}. Xe tải cập bến là bốc dỡ ngay!`
    } else if (botId === 'acc') {
      reply = `Kế toán đây ạ: Mọi khoản thu chi đều được đối soát từng xu. Tiền mặt đang ở mức ${liveContext.cash}.`
    } else {
      reply = `${bot.name} nhận lệnh! Em vẫn đang dồi dào năng lượng (${liveContext.energy}%) và hoàn thành tốt nhiệm vụ được giao!`
    }
  }

  // Pop up speech bubble on 3D robot head & play sound!
  const v = robots.get(botId)
  if (v) {
    v.bubble = {
      text: reply,
      kind: 'llm',
      key: Date.now(),
      until: performance.now() + 6500,
    }
  }
  sound.playBeep(850, 0.15)

  return reply
}
