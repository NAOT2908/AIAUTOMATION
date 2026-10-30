// Universal LLM Service supporting Google Gemini (3.8 Flash, 3.6 Flash, etc.),
// Anthropic Claude, OpenAI / DeepSeek / Ollama, and Model Context Protocol (MCP)

import { company } from './engine'
import { money } from './format'

export interface ProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
}

export interface MCPToolConfig {
  id: string
  name: string
  desc: string
  enabled: boolean
}

export interface UniversalAISettings {
  activeProvider: 'gemini' | 'claude' | 'openai' | 'ollama' | 'rule'
  enabled: boolean
  gemini: ProviderConfig
  claude: ProviderConfig
  openai: ProviderConfig
  ollama: ProviderConfig
  mcpServerUrl: string
  mcpEnabled: boolean
  mcpTools: MCPToolConfig[]
  deptOverrides: Record<string, string>
}

const DEFAULT_MCP_TOOLS: MCPToolConfig[] = [
  { id: 'financial_analyst', name: 'Phân tích tài chính & P&L', desc: 'Tính toán tỷ suất lợi nhuận và dự báo dòng tiền an toàn', enabled: true },
  { id: 'inventory_optimizer', name: 'Tối ưu tồn kho & PO', desc: 'Phân tích tốc độ bán ra để đề xuất điểm đặt hàng lại tối ưu', enabled: true },
  { id: 'market_sentiment', name: 'Đo lường thị hiếu khách hàng', desc: 'Phân tích phản hồi khách VIP và mức độ hài lòng khách hàng', enabled: true },
  { id: 'it_system_diagnostics', name: 'Chẩn đoán hạ tầng IT & Server', desc: 'Quét log hệ thống và đo lường tải CPU/RAM của server CRM', enabled: true },
]

export const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Mới nhất - Khuyên dùng)' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
]

export const CLAUDE_MODELS = [
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Mới nhất)' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Siêu tốc)' },
]

export const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (Omni cao cấp)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Nhanh & Tiết kiệm)' },
  { id: 'deepseek-chat', name: 'DeepSeek-V3 (api.deepseek.com)' },
  { id: 'deepseek-reasoner', name: 'DeepSeek-R1 (Suy luận sâu)' },
]

export const OLLAMA_MODELS = [
  { id: 'llama3.3:latest', name: 'Llama 3.3 (Local Ollama)' },
  { id: 'deepseek-r1:latest', name: 'DeepSeek R1 (Local Ollama)' },
  { id: 'qwen2.5:latest', name: 'Qwen 2.5 (Local Ollama)' },
]

export function getUniversalSettings(): UniversalAISettings {
  const raw = localStorage.getItem('robocorp_universal_ai')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      return {
        ...parsed,
        mcpTools: parsed.mcpTools || DEFAULT_MCP_TOOLS,
        deptOverrides: parsed.deptOverrides || {},
      }
    } catch {}
  }

  // Migrate legacy gemini key if present
  const oldGeminiKey = localStorage.getItem('robocorp_gemini_key') || ''
  const oldGeminiModel = localStorage.getItem('robocorp_gemini_model') || 'gemini-3.8-flash'
  const oldAiEnabled = localStorage.getItem('robocorp_ai_enabled') === 'true'

  return {
    activeProvider: oldAiEnabled ? 'gemini' : 'gemini',
    enabled: oldAiEnabled,
    gemini: { apiKey: oldGeminiKey, model: oldGeminiModel },
    claude: { apiKey: '', model: 'claude-3-7-sonnet-20250219' },
    openai: { apiKey: '', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' },
    ollama: { apiKey: 'ollama', model: 'llama3.3:latest', baseUrl: 'http://localhost:11434/v1' },
    mcpServerUrl: 'http://localhost:3000/mcp',
    mcpEnabled: true,
    mcpTools: DEFAULT_MCP_TOOLS,
    deptOverrides: {},
  }
}

export function saveUniversalSettings(settings: UniversalAISettings) {
  localStorage.setItem('robocorp_universal_ai', JSON.stringify(settings))
  localStorage.setItem('robocorp_ai_enabled', String(settings.enabled))
  localStorage.setItem('robocorp_gemini_key', settings.gemini.apiKey)
  localStorage.setItem('robocorp_gemini_model', settings.gemini.model)
}

/**
 * Execute simulated/live MCP tools to augment prompt context
 */
export function runMCPTools(toolIds: string[]): string {
  const findings: string[] = []
  for (const id of toolIds) {
    if (id === 'financial_analyst') {
      const runwayDays = company.cash > 0 ? (company.cash / (company.expenses / Math.max(1, company.day))).toFixed(1) : '0'
      findings.push(`[MCP Tool: financial_analyst] Runway ước tính: ${runwayDays} ngày. Lợi nhuận gộp hiện tại: ${money(company.revenue - company.cogs)}.`)
    } else if (id === 'inventory_optimizer') {
      const lowStock = company.products.filter(p => p.stock <= p.reorderPoint).map(p => p.name)
      findings.push(`[MCP Tool: inventory_optimizer] Cảnh báo mặt hàng sắp hết: ${lowStock.length ? lowStock.join(', ') : 'Tất cả SKU đều an toàn'}.`)
    } else if (id === 'market_sentiment') {
      findings.push(`[MCP Tool: market_sentiment] Chỉ số hài lòng KH: ${Math.round(company.satisfaction)}%. Tỷ lệ đơn chờ xử lý: ${company.backorders.length}.`)
    } else if (id === 'it_system_diagnostics') {
      findings.push(`[MCP Tool: it_system_diagnostics] Trạng thái CRM: ${company.outageUntil > company.t ? 'ĐANG SỰ CỐ QUÁ TẢI' : 'ONLINE BÌNH THƯỜNG'}.`)
    }
  }
  return findings.length ? `\n--- DỮ LIỆU TỪ GIAO THỨC MCP (MODEL CONTEXT PROTOCOL) ---\n${findings.join('\n')}\n` : ''
}

/**
 * Call Universal LLM: Gemini, Claude, OpenAI, DeepSeek, or Ollama
 */
export async function callUniversalLLM(options: {
  prompt: string
  systemPrompt?: string
  deptId?: string
}): Promise<{ text: string; providerLabel: string }> {
  const settings = getUniversalSettings()
  if (!settings.enabled) throw new Error('AI đang tắt')

  const provider = (options.deptId && settings.deptOverrides[options.deptId]) || settings.activeProvider

  // Augment prompt with MCP tools if enabled
  let finalPrompt = options.prompt
  if (settings.mcpEnabled) {
    const activeToolIds = settings.mcpTools.filter(t => t.enabled).map(t => t.id)
    const mcpData = runMCPTools(activeToolIds)
    if (mcpData) {
      finalPrompt = `${finalPrompt}\n${mcpData}`
    }
  }

  // 1. Google Gemini
  if (provider === 'gemini') {
    const { apiKey, model } = settings.gemini
    if (!apiKey) throw new Error('Chưa nhập Gemini API Key')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const payload: {
      contents: { parts: { text: string }[] }[]
      systemInstruction?: { parts: { text: string }[] }
      generationConfig: { maxOutputTokens: number; temperature: number }
    } = {
      contents: [{ parts: [{ text: finalPrompt }] }],
      generationConfig: { maxOutputTokens: 180, temperature: 0.7 },
    }
    if (options.systemPrompt) {
      payload.systemInstruction = { parts: [{ text: options.systemPrompt }] }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`Gemini ${model} lỗi ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    return { text, providerLabel: `🔮 ${model}` }
  }

  // 2. Anthropic Claude
  if (provider === 'claude') {
    const { apiKey, model } = settings.claude
    if (!apiKey) throw new Error('Chưa nhập Claude API Key')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 180,
        system: options.systemPrompt || 'Bạn là robot hỗ trợ của RoboCorp.',
        messages: [{ role: 'user', content: finalPrompt }],
      }),
    })
    if (!res.ok) throw new Error(`Claude ${model} lỗi ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text = data.content?.[0]?.text?.trim() || ''
    return { text, providerLabel: `🎭 ${model.split('-').slice(0, 3).join('-')}` }
  }

  // 3. OpenAI / DeepSeek / Ollama (OpenAI standard schema)
  if (provider === 'openai' || provider === 'ollama') {
    const conf = provider === 'openai' ? settings.openai : settings.ollama
    const baseUrl = (conf.baseUrl || (provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1')).replace(/\/$/, '')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (conf.apiKey) headers.Authorization = `Bearer ${conf.apiKey}`

    const messages = []
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt })
    messages.push({ role: 'user', content: finalPrompt })

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: conf.model,
        messages,
        max_tokens: 180,
        temperature: 0.7,
      }),
    })
    if (!res.ok) throw new Error(`${provider.toUpperCase()} lỗi ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim() || ''
    return { text, providerLabel: `${provider === 'ollama' ? '🦙' : '🟢'} ${conf.model}` }
  }

  throw new Error(`Nhà cung cấp không xác định: ${provider}`)
}
