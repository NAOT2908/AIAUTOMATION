import { memo, useMemo } from 'react'
import { DEPTS, STAFFED_DEPTS } from '../sim/data'
import { company } from '../sim/engine'
import { clock, dayOf } from '../sim/format'
import type { LogEntry } from '../sim/types'
import { useUI } from '../store'
import { Icon } from './Icon'

const Row = memo(function Row({ e, onPick }: { e: LogEntry; onPick: (id: string) => void }) {
  const d = DEPTS[e.dept]
  return (
    <li className={`row${e.warn ? ' warn' : ''}${e.good ? ' good' : ''}`} onClick={() => e.botId && onPick(e.botId)}>
      <time>N{dayOf(e.t)} {clock(e.t)}</time>
      <span className="who" style={{ '--c': d.color } as React.CSSProperties}><i className="dot" />{d.icon} {e.who}</span>
      <span className="msg">{e.text}{e.llm && <span className="llm">🧠 LLM</span>}</span>
    </li>
  )
})

export function Feed() {
  useUI(s => s.tick)
  const filter = useUI(s => s.filter)
  const setFilter = useUI(s => s.setFilter)
  const select = useUI(s => s.select)
  const toggleFeed = useUI(s => s.toggleFeed)
  const head = company.logs[0]?.id ?? 0
  const rows = useMemo(
    () => company.logs.filter(e => filter === 'all' || e.dept === filter).slice(0, 150),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [head, filter],
  )
  return (
    <section className="card feed">
      <div className="feed-head">
        <h2><span className="live" aria-hidden="true" />Nhật ký hoạt động</h2>
        <div className="filters" role="group" aria-label="Lọc theo phòng ban">
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Tất cả</button>
          {STAFFED_DEPTS.map(k => (
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} style={{ '--c': DEPTS[k].color } as React.CSSProperties}>
              <i className="dot" />{DEPTS[k].name}
            </button>
          ))}
        </div>
        <span className="legend">🧠 LLM: quyết định sẽ giao cho Claude (hiện đang giả lập)</span>
        <button className="btn-collapse" onClick={toggleFeed} title="Thu gọn Nhật ký hoạt động">
          <Icon name="chevronDown" size={14} /> Thu gọn
        </button>
      </div>
      <ol className="feed-list">
        {rows.map(e => <Row key={e.id} e={e} onPick={select} />)}
      </ol>
    </section>
  )
}
