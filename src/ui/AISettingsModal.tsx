import { useState } from 'react'
import {
  CLAUDE_MODELS,
  GEMINI_MODELS,
  getUniversalSettings,
  OLLAMA_MODELS,
  OPENAI_MODELS,
  saveUniversalSettings,
  type UniversalAISettings,
} from '../sim/llmService'
import { Icon } from './Icon'

interface Props {
  open: boolean
  onClose: () => void
}

type TabKey = 'gemini' | 'claude' | 'openai' | 'ollama' | 'mcp' | 'routing'

export function AISettingsModal({ open, onClose }: Props) {
  if (!open) return null

  const [activeTab, setActiveTab] = useState<TabKey>('gemini')
  const [config, setConfig] = useState<UniversalAISettings>(() => getUniversalSettings())
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleSave = () => {
    saveUniversalSettings(config)
    onClose()
  }

  const handleTestProvider = async (provider: 'gemini' | 'claude' | 'openai' | 'ollama') => {
    setTesting(true)
    setTestResult(null)
    try {
      if (provider === 'gemini') {
        const { apiKey, model } = config.gemini
        if (!apiKey) throw new Error('Vui lòng nhập Google Gemini API Key')
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'RoboCorp xin chào! Trả lời 1 câu ngắn.' }] }],
          }),
        })
        if (!res.ok) throw new Error(`Lỗi ${res.status}: ${await res.text()}`)
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        setTestResult({ ok: true, msg: `Kết nối thành công! Gemini (${model}) phản hồi: "${text}"` })
      } else if (provider === 'claude') {
        const { apiKey, model } = config.claude
        if (!apiKey) throw new Error('Vui lòng nhập Anthropic Claude API Key')
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey.trim(),
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            max_tokens: 60,
            messages: [{ role: 'user', content: 'RoboCorp xin chào! Trả lời 1 câu ngắn.' }],
          }),
        })
        if (!res.ok) throw new Error(`Lỗi ${res.status}: ${await res.text()}`)
        const data = await res.json()
        const text = data.content?.[0]?.text?.trim()
        setTestResult({ ok: true, msg: `Kết nối thành công! Claude (${model}) phản hồi: "${text}"` })
      } else if (provider === 'openai' || provider === 'ollama') {
        const conf = provider === 'openai' ? config.openai : config.ollama
        const baseUrl = (conf.baseUrl || (provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1')).replace(/\/$/, '')
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (conf.apiKey) headers.Authorization = `Bearer ${conf.apiKey.trim()}`

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: conf.model,
            messages: [{ role: 'user', content: 'RoboCorp xin chào! Trả lời 1 câu ngắn.' }],
            max_tokens: 60,
          }),
        })
        if (!res.ok) throw new Error(`Lỗi ${res.status}: ${await res.text()}`)
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content?.trim()
        setTestResult({ ok: true, msg: `Kết nối thành công! ${provider.toUpperCase()} (${conf.model}) phản hồi: "${text}"` })
      }
    } catch (err: unknown) {
      setTestResult({ ok: false, msg: `Thử nghiệm thất bại: ${(err as Error).message}` })
    } finally {
      setTesting(false)
    }
  }

  const toggleMCPTool = (id: string) => {
    setConfig(prev => ({
      ...prev,
      mcpTools: prev.mcpTools.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    }))
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="card modal ai-modal-hub" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="sparkle-icon"><Icon name="sparkles" size={20} /></span>
            <h3>Trung tâm Cấu hình Não bộ AI & Giao thức MCP</h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Đóng"><Icon name="close" size={16} /></button>
        </div>

        {/* Global Master Enable Toggle */}
        <div className="hub-top-banner">
          <label className="toggle-label-main">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            />
            <div>
              <b>Kích hoạt Trí tuệ nhân tạo (AI Models)</b>
              <small>Thay thế kịch bản tĩnh bằng các mô hình LLM trực tuyến thực thụ</small>
            </div>
          </label>
        </div>

        {/* Tab Navigation */}
        <div className="ai-tabs-nav">
          <button
            className={`ai-tab-btn ${activeTab === 'gemini' ? 'active' : ''}`}
            onClick={() => { setActiveTab('gemini'); setTestResult(null) }}
          >
            🔮 Gemini
          </button>
          <button
            className={`ai-tab-btn ${activeTab === 'claude' ? 'active' : ''}`}
            onClick={() => { setActiveTab('claude'); setTestResult(null) }}
          >
            🎭 Claude
          </button>
          <button
            className={`ai-tab-btn ${activeTab === 'openai' ? 'active' : ''}`}
            onClick={() => { setActiveTab('openai'); setTestResult(null) }}
          >
            🟢 OpenAI / DeepSeek
          </button>
          <button
            className={`ai-tab-btn ${activeTab === 'ollama' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ollama'); setTestResult(null) }}
          >
            🦙 Ollama Local
          </button>
          <button
            className={`ai-tab-btn ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => { setActiveTab('mcp'); setTestResult(null) }}
          >
            🔌 MCP Tools
          </button>
          <button
            className={`ai-tab-btn ${activeTab === 'routing' ? 'active' : ''}`}
            onClick={() => { setActiveTab('routing'); setTestResult(null) }}
          >
            🤖 Phân bổ Agent
          </button>
        </div>

        {/* Tab Contents */}
        <div className="ai-tab-content">
          {/* 1. GEMINI TAB */}
          {activeTab === 'gemini' && (
            <div className="tab-pane">
              <div className="form-group">
                <label>Mô hình Google Gemini (Bao gồm các bản mới nhất):</label>
                <select
                  value={config.gemini.model}
                  onChange={e => setConfig(prev => ({ ...prev, gemini: { ...prev.gemini, model: e.target.value } }))}
                  className="select-input"
                >
                  {GEMINI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  <option value="custom">-- Tự nhập Model Name tùy chỉnh --</option>
                </select>
              </div>

              {config.gemini.model === 'custom' && (
                <div className="form-group">
                  <label>Tên Model tùy chỉnh:</label>
                  <input
                    type="text"
                    placeholder="gemini-3.8-flash hoặc gemini-3.6-flash..."
                    className="input-text"
                    onChange={e => setConfig(prev => ({ ...prev, gemini: { ...prev.gemini, model: e.target.value } }))}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Google Gemini API Key:</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={config.gemini.apiKey}
                  onChange={e => setConfig(prev => ({ ...prev, gemini: { ...prev.gemini, apiKey: e.target.value } }))}
                  className="input-text"
                />
                <small className="hint-link">
                  Lấy API Key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio ↗</a>
                </small>
              </div>

              <button className="btn-secondary btn-test" onClick={() => handleTestProvider('gemini')} disabled={testing}>
                {testing ? 'Đang kiểm tra...' : '⚡ Kiểm tra kết nối Gemini'}
              </button>
            </div>
          )}

          {/* 2. CLAUDE TAB */}
          {activeTab === 'claude' && (
            <div className="tab-pane">
              <div className="form-group">
                <label>Mô hình Anthropic Claude:</label>
                <select
                  value={config.claude.model}
                  onChange={e => setConfig(prev => ({ ...prev, claude: { ...prev.claude, model: e.target.value } }))}
                  className="select-input"
                >
                  {CLAUDE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Anthropic API Key:</label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={config.claude.apiKey}
                  onChange={e => setConfig(prev => ({ ...prev, claude: { ...prev.claude, apiKey: e.target.value } }))}
                  className="input-text"
                />
                <small className="hint-link">
                  Lấy API Key tại <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">Anthropic Console ↗</a>
                </small>
              </div>

              <button className="btn-secondary btn-test" onClick={() => handleTestProvider('claude')} disabled={testing}>
                {testing ? 'Đang kiểm tra...' : '⚡ Kiểm tra kết nối Claude'}
              </button>
            </div>
          )}

          {/* 3. OPENAI / DEEPSEEK TAB */}
          {activeTab === 'openai' && (
            <div className="tab-pane">
              <div className="form-group">
                <label>Mô hình (Model):</label>
                <select
                  value={config.openai.model}
                  onChange={e => {
                    const model = e.target.value
                    const isDeepSeek = model.startsWith('deepseek')
                    setConfig(prev => ({
                      ...prev,
                      openai: {
                        ...prev.openai,
                        model,
                        baseUrl: isDeepSeek ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1',
                      },
                    }))
                  }}
                  className="select-input"
                >
                  {OPENAI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Base URL Endpoint:</label>
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1 hoặc https://api.deepseek.com/v1"
                  value={config.openai.baseUrl || ''}
                  onChange={e => setConfig(prev => ({ ...prev, openai: { ...prev.openai, baseUrl: e.target.value } }))}
                  className="input-text"
                />
              </div>

              <div className="form-group">
                <label>API Key (Bearer Token):</label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={config.openai.apiKey}
                  onChange={e => setConfig(prev => ({ ...prev, openai: { ...prev.openai, apiKey: e.target.value } }))}
                  className="input-text"
                />
              </div>

              <button className="btn-secondary btn-test" onClick={() => handleTestProvider('openai')} disabled={testing}>
                {testing ? 'Đang kiểm tra...' : '⚡ Kiểm tra kết nối OpenAI / DeepSeek'}
              </button>
            </div>
          )}

          {/* 4. OLLAMA TAB */}
          {activeTab === 'ollama' && (
            <div className="tab-pane">
              <div className="form-group">
                <label>Mô hình Ollama Local:</label>
                <select
                  value={config.ollama.model}
                  onChange={e => setConfig(prev => ({ ...prev, ollama: { ...prev.ollama, model: e.target.value } }))}
                  className="select-input"
                >
                  {OLLAMA_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ollama Endpoint URL (chạy trên máy bạn):</label>
                <input
                  type="text"
                  placeholder="http://localhost:11434/v1"
                  value={config.ollama.baseUrl || ''}
                  onChange={e => setConfig(prev => ({ ...prev, ollama: { ...prev.ollama, baseUrl: e.target.value } }))}
                  className="input-text"
                />
                <small className="hint-link">Chạy `ollama serve` trên máy để kích hoạt 100% offline không tốn tiền API.</small>
              </div>

              <button className="btn-secondary btn-test" onClick={() => handleTestProvider('ollama')} disabled={testing}>
                {testing ? 'Đang kiểm tra...' : '⚡ Kiểm tra kết nối Ollama Local'}
              </button>
            </div>
          )}

          {/* 5. MCP (MODEL CONTEXT PROTOCOL) TAB */}
          {activeTab === 'mcp' && (
            <div className="tab-pane">
              <div className="mcp-info-card">
                <b>🔌 Giao thức Model Context Protocol (MCP)</b>
                <p>
                  Cho phép các robot kết nối với công cụ ngoại vi và cơ sở dữ liệu doanh nghiệp để ra quyết định dựa trên số liệu thực tế chứ không đoán mò.
                </p>
              </div>

              <div className="form-group">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={config.mcpEnabled}
                    onChange={e => setConfig(prev => ({ ...prev, mcpEnabled: e.target.checked }))}
                  />
                  <span>Bật công cụ mở rộng MCP Tools cho các robot</span>
                </label>
              </div>

              <div className="form-group">
                <label>MCP Server Endpoint URL:</label>
                <input
                  type="text"
                  placeholder="http://localhost:3000/mcp hoặc sse stream"
                  value={config.mcpServerUrl}
                  onChange={e => setConfig(prev => ({ ...prev, mcpServerUrl: e.target.value }))}
                  className="input-text"
                />
              </div>

              <label className="sub-label">Danh sách MCP Tools tích hợp:</label>
              <div className="mcp-tools-list">
                {config.mcpTools.map(t => (
                  <div key={t.id} className="mcp-tool-item">
                    <input
                      type="checkbox"
                      checked={t.enabled}
                      onChange={() => toggleMCPTool(t.id)}
                      id={`mcp-${t.id}`}
                    />
                    <label htmlFor={`mcp-${t.id}`}>
                      <b>{t.name}</b>
                      <span>{t.desc}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. BRAIN ROUTING TAB */}
          {activeTab === 'routing' && (
            <div className="tab-pane">
              <div className="form-group">
                <label>Nhà cung cấp Não bộ mặc định (Primary Provider):</label>
                <select
                  value={config.activeProvider}
                  onChange={e => setConfig(prev => ({ ...prev, activeProvider: e.target.value as any }))}
                  className="select-input"
                >
                  <option value="gemini">🔮 Google Gemini (Mặc định - Nhanh & Mới nhất)</option>
                  <option value="claude">🎭 Anthropic Claude</option>
                  <option value="openai">🟢 OpenAI / DeepSeek</option>
                  <option value="ollama">🦙 Ollama Local</option>
                </select>
              </div>

              <label className="sub-label">Phân bổ riêng cho từng phòng ban (Tùy chọn):</label>
              <div className="routing-grid">
                {[
                  { dept: 'ceo', name: 'Ban Giám đốc (CEO)' },
                  { dept: 'sales', name: 'Kinh doanh (Sales)' },
                  { dept: 'buy', name: 'Mua hàng (Purchasing)' },
                  { dept: 'it', name: 'Công nghệ (IT)' },
                  { dept: 'mkt', name: 'Marketing' },
                ].map(d => (
                  <div key={d.dept} className="routing-row">
                    <span>{d.name}:</span>
                    <select
                      value={config.deptOverrides[d.dept] || ''}
                      onChange={e => {
                        const val = e.target.value
                        setConfig(prev => {
                          const next = { ...prev.deptOverrides }
                          if (val) next[d.dept] = val
                          else delete next[d.dept]
                          return { ...prev, deptOverrides: next }
                        })
                      }}
                      className="select-input-sm"
                    >
                      <option value="">(Theo mặc định chung)</option>
                      <option value="gemini">🔮 Gemini 3.8/3.6</option>
                      <option value="claude">🎭 Claude 3.7</option>
                      <option value="openai">🟢 DeepSeek / GPT-4o</option>
                      <option value="ollama">🦙 Ollama Local</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div className={`status-box ${testResult.ok ? 'success' : 'error'}`}>
            {testResult.msg}
          </div>
        )}

        {/* Footer Actions */}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Lưu tất cả cấu hình
          </button>
        </div>
      </div>
    </div>
  )
}
