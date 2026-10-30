import { useEffect, useRef, useState } from 'react'
import { sound } from '../audio/sound'
import { DEPTS } from '../sim/data'
import { company } from '../sim/engine'
import { clock } from '../sim/format'
import { chatWithAgent, type ChatMessage } from '../sim/aiChat'
import { Icon } from './Icon'

interface Props {
  botId: string | null
  onClose: () => void
}

const QUICK_PROMPTS: Record<string, string[]> = {
  ceo: [
    'Báo cáo nhanh tình hình tài chính hôm nay?',
    'Có ai trong công ty lười biếng không?',
    'Mục tiêu lợi nhuận tháng này đạt bao nhiêu rồi?',
  ],
  sales: [
    'Hôm nay chốt được bao nhiêu đơn rồi?',
    'Khách VIP có đang đòi giảm giá không?',
    'Mặt hàng nào đang bán chạy nhất?',
  ],
  buy: [
    'Nhà cung cấp nào đang có giá tốt nhất?',
    'Có món hàng nào sắp cạn kho không?',
    'Đã đặt thêm hàng cho kho chưa?',
  ],
  wh: [
    'Tồn kho hiện tại đủ cung cấp mấy ngày?',
    'Xe tải giao hàng đã tới chưa?',
    'Có đơn nào đang bị trễ hẹn không?',
  ],
  acc: [
    'Dòng tiền mặt hiện tại có an toàn không?',
    'Lợi nhuận gộp hôm nay là bao nhiêu?',
    'Có khoản chi nào bất thường không?',
  ],
  hr: [
    'Năng lượng trung bình của các robot ra sao?',
    'Có robot nào sắp cạn pin cần sạc không?',
    'Đội ngũ nhân sự hoạt động thế nào?',
  ],
  it: [
    'Server và hệ thống CRM có ổn định không?',
    'Có nguy cơ bị sập mạng hay quá tải không?',
    'Tối ưu hóa cơ sở dữ liệu tới đâu rồi?',
  ],
  mkt: [
    'Chiến dịch quảng cáo mới nhất là gì?',
    'Sản phẩm nào cần đẩy mạnh bán hàng?',
    'Kế hoạch Flash sale tiếp theo ra sao?',
  ],
}

export function AgentChatModal({ botId, onClose }: Props) {
  if (!botId) return null

  const bot = company.bot(botId)
  const dept = DEPTS[bot.dept]
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'bot',
      text: `Kính chào Chủ tịch! Em là ${bot.name} (${bot.role}). Sếp có chỉ đạo hay câu hỏi gì cho em ạ?`,
      time: clock(company.t),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    sound.playBeep(480, 0.06)
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      time: clock(company.t),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await chatWithAgent(bot.id, text)
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: reply,
        time: clock(company.t),
      }
      setMessages(prev => [...prev, botMsg])
    } catch {
      const botMsg: ChatMessage = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: 'Em bị mất tín hiệu một chút, Sếp đợi em kết nối lại nhé!',
        time: clock(company.t),
      }
      setMessages(prev => [...prev, botMsg])
    } finally {
      setLoading(false)
    }
  }

  const prompts = QUICK_PROMPTS[botId] || QUICK_PROMPTS.ceo

  return (
    <div className="modal-backdrop chat-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="card modal chat-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-header" style={{ borderBottomColor: dept.color }}>
          <div className="chat-bot-info">
            <span className="chat-avatar" style={{ background: dept.color }}>
              {dept.icon}
            </span>
            <div>
              <div className="chat-bot-title">
                <b>{bot.name}</b>
                <span className="chat-dept-badge" style={{ color: dept.color }}>{dept.name}</span>
              </div>
              <small className="muted">{bot.role} · Pin {Math.round(bot.energy)}%</small>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Đóng"><Icon name="close" size={16} /></button>
        </div>

        {/* Message List */}
        <div className="chat-body">
          {messages.map(m => (
            <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
              <div className="chat-bubble">
                <p className="chat-text">{m.text}</p>
                <span className="chat-time">{m.time}</span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble-row bot">
              <div className="chat-bubble thinking">
                <span className="dots"><i /><i /><i /></span> Đang suy nghĩ...
              </div>
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="chat-prompts">
          {prompts.map((p, i) => (
            <button key={i} className="chip-prompt" onClick={() => handleSend(p)} disabled={loading}>
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          className="chat-input-bar"
          onSubmit={e => {
            e.preventDefault()
            handleSend()
          }}
        >
          <input
            type="text"
            className="chat-input"
            placeholder={`Chỉ đạo cho ${bot.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="btn-primary btn-send" disabled={!input.trim() || loading}>
            <Icon name="send" size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
