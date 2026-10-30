import { type Brain, type Decision, type Maybe } from './brain'
import { GeminiBrain } from './geminiBrain'
import { runSkill } from './skills'
import type { SkillSim } from './skills/types'
import type { UpsellArgs, UpsellOut, ComplaintArgs, ComplaintOut } from './skills/sales'
import type { StockoutOut } from './skills/warehouse'
import type { ChannelArgs, ChannelOut } from './skills/marketing'
import {
  APPROVAL_LIMIT, BOT_DEFS, CUSTOMERS, DEPTS, PRODUCTS, PROFIT_TARGET, START_CASH, SUPPLIERS, VIP_CUSTOMERS, WEEKLY_SALARY,
} from './data'
import { dayOf, money, pick, randInt, rnd } from './format'
import type {
  Bot, ChaosId, DeptId, Endpoint, LogEntry, LogFlags, Product, SalesOrder, SimEvent, Supplier, ViewStatus,
} from './types'

interface Job { at: number; fn: () => void }

/** true when the clock passed hh:mm of any day between prev (exclusive) and now (inclusive) */
function crossed(prev: number, now: number, hh: number, mm = 0) {
  const m = hh * 60 + mm
  for (let d = Math.floor(prev / 1440); d <= Math.floor(now / 1440); d++) {
    const x = d * 1440 + m
    if (prev < x && x <= now) return true
  }
  return false
}

export function viewStatus(bot: Bot, t: number, walking = false): ViewStatus {
  if (bot.status === 'charging' || bot.status === 'error') return bot.status
  if (bot.thinkingUntil > t) return 'thinking'
  if (walking) return 'walking'
  return bot.status
}

/**
 * The whole company as a discrete-event simulation in game minutes.
 * Pure TypeScript with no rendering, so it can later move to a server unchanged.
 */
export class Company {
  t = 0
  cash = 0
  revenue = 0
  cogs = 0
  expenses = 0
  receivable = 0
  satisfaction = 90
  products: Product[] = []
  suppliers: Supplier[] = []
  bots: Bot[] = []
  backorders: SalesOrder[] = []
  logs: LogEntry[] = []
  today = { orders: 0, revenue: 0 }
  cashHistory: number[] = []
  partyDone = false
  bankrupt = false
  outageUntil = 0
  demandAll = 1
  demandUntil = 0
  frugal = false

  private queue: Job[] = []
  private seq = { so: 100, po: 40, inv: 300, log: 0 }
  private nextOrder = 0
  private nextCheck = 0
  private run = 0
  private listeners = new Set<(e: SimEvent) => void>()

  constructor(public brain: Brain = new GeminiBrain()) {
    this.reset()
  }

  asSkillSim(): SkillSim {
    return {
      t: this.t,
      day: this.day,
      cash: this.cash,
      products: this.products,
      bots: this.bots,
    }
  }

  reset() {
    this.run++
    this.t = 8 * 60 - 1
    this.cash = START_CASH
    this.revenue = this.cogs = this.expenses = this.receivable = 0
    this.satisfaction = 90
    this.products = PRODUCTS.map(p => ({ ...p, openPO: false, demand: 1, demandUntil: 0, sold: 0 }))
    this.suppliers = SUPPLIERS.map(s => ({ ...s }))
    this.bots = BOT_DEFS.map(d => ({
      ...d, energy: 100, status: 'idle', thought: 'Sẵn sàng làm việc.', done: 0, history: [], load: 0, lastActive: 0, thinkingUntil: 0,
    }))
    this.backorders = []
    this.logs = []
    this.queue = []
    this.today = { orders: 0, revenue: 0 }
    this.cashHistory = [START_CASH]
    this.partyDone = this.bankrupt = this.frugal = false
    this.outageUntil = this.demandUntil = 0
    this.demandAll = 1
    this.nextOrder = 8 * 60 + 6
    this.nextCheck = 8 * 60 + 20
    this.emit({ type: 'reset' })
  }

  on(fn: (e: SimEvent) => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  get profit() { return this.revenue - this.cogs - this.expenses }
  get day() { return dayOf(this.t) }
  get stockUnits() { return this.products.reduce((s, p) => s + p.stock, 0) }
  get avgEnergy() { return this.bots.reduce((s, b) => s + b.energy, 0) / this.bots.length }
  get target() { return PROFIT_TARGET }
  bot(id: string) { return this.bots.find(b => b.id === id)! }

  /** advance the clock; called every frame with (real seconds × speed × MIN_PER_SEC) */
  advance(minutes: number) {
    while (minutes > 0 && !this.bankrupt) {
      const step = Math.min(1, minutes)
      const prev = this.t
      this.t += step
      minutes -= step
      this.onMinute(prev, this.t, step)
      while (this.queue.length && this.queue[0].at <= this.t && !this.bankrupt) this.queue.shift()!.fn()
    }
  }

  trigger(id: ChaosId) {
    if (this.bankrupt) return
    this.chaos[id]()
  }

  // ---------------------------------------------------------------- plumbing

  private emit(e: SimEvent) { this.listeners.forEach(l => l(e)) }

  private after(min: number, fn: () => void) {
    const job = { at: this.t + min, fn }
    let lo = 0, hi = this.queue.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.queue[mid].at <= job.at) lo = mid + 1
      else hi = mid
    }
    this.queue.splice(lo, 0, job)
  }

  /** run a brain decision; async (LLM) answers are dropped if the company was reset meanwhile */
  private decide<T>(d: Maybe<Decision<T>>, cb: (d: Decision<T>) => void) {
    if (!(d instanceof Promise)) return cb(d)
    const run = this.run
    d.then(r => { if (run === this.run && !this.bankrupt) cb(r) }).catch(err => console.error('brain error', err))
  }

  log(dept: DeptId, bot: Bot | null, text: string, flags: LogFlags = {}) {
    const entry: LogEntry = { id: ++this.seq.log, t: this.t, dept, botId: bot?.id ?? null, who: bot?.name ?? DEPTS[dept].name, text, ...flags }
    this.logs.unshift(entry)
    if (this.logs.length > 400) this.logs.pop()
    if (bot) {
      bot.thought = text
      bot.history.unshift(entry)
      if (bot.history.length > 6) bot.history.pop()
      bot.done++
      bot.lastActive = this.t
      if (bot.status === 'idle') bot.status = 'working'
      if (flags.llm) bot.thinkingUntil = this.t + 12
    }
    this.emit({ type: 'log', entry })
  }

  private packet(from: Endpoint, to: Endpoint, color: string) {
    this.emit({ type: 'packet', from, to, color })
  }

  /** a robot passes work to another department; sometimes it walks over in person */
  private handoff(bot: Bot, to: DeptId) {
    this.packet({ bot: bot.id }, { dept: to }, DEPTS[bot.dept].color)
    if (bot.status !== 'charging' && Math.random() < 0.45) this.emit({ type: 'walk', botId: bot.id, to })
  }

  private spend(amount: number, dept: DeptId, bot: Bot, text: string, flags: LogFlags = {}) {
    this.cash -= amount
    this.expenses += amount
    this.log(dept, bot, text, flags)
    this.checkBankrupt()
  }

  private checkBankrupt() {
    if (this.cash >= 0 || this.bankrupt) return
    this.log('ceo', this.bot('ceo'), `Tiền mặt âm ${money(this.cash)}. Công ty tạm ngừng hoạt động`, { warn: true })
    this.bankrupt = true
    this.emit({ type: 'bankrupt' })
  }

  // ---------------------------------------------------------------- sales

  private newOrder(vip = false) {
    const total = this.products.reduce((s, p) => s + p.weight * p.demand, 0)
    let r = Math.random() * total
    let product = this.products[0]
    for (const p of this.products) {
      r -= p.weight * p.demand
      if (r <= 0) { product = p; break }
    }
    const qty = randInt(product.qty[0], product.qty[1]) * (vip ? 4 : 1)
    const customer = vip ? pick(VIP_CUSTOMERS) : pick(CUSTOMERS)
    const bot = [this.bot('sales1'), this.bot('sales2')].sort((a, b) => a.load - b.load || a.done - b.done)[0]
    const so = 'SO-' + ++this.seq.so
    bot.load++
    this.today.orders++
    this.packet({ dept: 'gate' }, { bot: bot.id }, DEPTS.gate.color)
    this.log('sales', bot, `${vip ? '👑 ' : ''}Nhận yêu cầu từ ${customer}: ${qty} × ${product.name}`)

    this.after(vip ? 25 : randInt(8, 18), () => {
      this.decide(this.brain.negotiate({ customer, product, qty, vip }), d => {
        if (d.text) this.log('sales', bot, d.text, { llm: d.llm })
        const order: SalesOrder = { so, customer, product, qty, unit: product.price * (1 - d.value), bot }
        this.log('sales', bot, `Báo giá ${so}: ${money(order.unit * qty)}. Khách đồng ý ✓`, { good: true })
        
        // Skill: Upsell phụ kiện khi chốt đơn
        const upsell = runSkill<UpsellArgs, UpsellOut>('upsell', { bot, args: { customer, sku: product.sku, qty } }, this.asSkillSim())
        if (upsell instanceof Promise) {
          upsell.then(u => { if (u?.text) this.log('sales', bot, u.text, { llm: true }) })
        } else if (upsell?.text) {
          this.log('sales', bot, upsell.text, { llm: true })
        }

        this.handoff(bot, 'wh')
        if (this.t < this.outageUntil) {
          this.log('sales', bot, 'CRM đang lỗi, chưa tra được tồn kho. Chờ IT…', { warn: true })
          this.after(Math.max(10, this.outageUntil - this.t + 5), () => this.checkStock(order))
        } else this.after(randInt(6, 12), () => this.checkStock(order))
      })
    })
  }

  private checkStock(o: SalesOrder) {
    const wh = this.bot('wh')
    const p = o.product
    o.bot.load = Math.max(0, o.bot.load - 1)
    if (p.stock >= o.qty) {
      p.stock -= o.qty
      p.sold += o.qty
      this.log('wh', wh, `Giữ hàng cho ${o.so}: ${o.qty} × ${p.name}, tồn còn ${p.stock}`)
      this.checkReorder(p)
      this.after(randInt(20, 40), () => this.ship(o))
    } else {
      this.backorders.push(o)
      this.satisfaction = Math.max(0, this.satisfaction - 2.5)
      this.log('wh', wh, `Thiếu ${p.name}: cần ${o.qty}, tồn ${p.stock}. Báo Mua hàng`, { warn: true })
      this.log('sales', o.bot, `Báo ${o.customer}: ${o.so} giao trễ vài ngày vì chờ hàng về`, { warn: true })

      // Skill: Xử lý khiếu nại khách hàng
      const comp = runSkill<ComplaintArgs, ComplaintOut>('handle_complaint', { bot: o.bot, args: { customer: o.customer, sku: p.sku, issue: 'late' } }, this.asSkillSim())
      if (comp instanceof Promise) {
        comp.then(c => { if (c?.text) this.log('sales', o.bot, c.text, { llm: true }) })
      } else if (comp?.text) {
        this.log('sales', o.bot, comp.text, { llm: true })
      }
      this.handoff(wh, 'buy')
      this.triggerReorder(p, true)
    }
  }

  private ship(o: SalesOrder) {
    const wh = this.bot('wh'), acc = this.bot('acc')
    const amount = o.unit * o.qty
    const inv = 'INV-' + ++this.seq.inv
    this.log('wh', wh, `🚚 Đóng gói và giao ${o.so} cho ${o.customer}`)
    this.packet({ bot: wh.id }, { dept: 'gate' }, DEPTS.wh.color)
    this.emit({ type: 'truck' })
    this.revenue += amount
    this.cogs += o.product.cost * o.qty
    this.receivable += amount
    this.today.revenue += amount
    this.after(randInt(5, 15), () => {
      this.handoff(wh, 'acc')
      this.log('acc', acc, `Xuất hóa đơn ${inv} cho ${o.customer}: ${money(amount)} · Nợ 131 / Có 511`)
    })
    this.after(randInt(1, 3) * 1440 - randInt(0, 300), () => {
      this.cash += amount
      this.receivable -= amount
      this.satisfaction = Math.min(100, this.satisfaction + 0.8)
      this.log('acc', acc, `Nhận ${money(amount)} từ ${o.customer} (${inv}) · Nợ 112 / Có 131`, { good: true })
    })
  }

  // ---------------------------------------------------------------- purchasing

  private checkReorder(p: Product) {
    if (p.stock <= p.reorderPoint && !p.openPO) this.triggerReorder(p, false)
  }

  private triggerReorder(p: Product, urgent: boolean) {
    if (p.openPO) return
    p.openPO = true
    const buyer = this.bot('buy')
    this.after(randInt(15, 30), () => {
      const waiting = this.backorders.filter(o => o.product === p)
      const backQty = waiting.reduce((s, o) => s + o.qty, 0)
      // daily sales estimate; before any history, assume the reorder point is ~2 days of demand
      const rate = this.day > 1 && p.sold > 0 ? p.sold / (this.day - 1) : p.reorderPoint / 2
      const coverDays = p.stock / Math.max(1, rate)
      const base = p.lot + backQty
      const quotes = this.suppliers.map(s => ({ supplier: s, unit: p.cost * s.factor, lead: s.lead }))
      this.log('buy', buyer, `Hỏi giá ${base} × ${p.name}: ` + quotes.map(q => `${q.supplier.name} ${money(q.unit)} · ${q.lead} ngày`).join(' | '))
      this.decide(this.brain.chooseSupplier({ product: p, qty: base, urgent, waiting: waiting.length, quotes, coverDays }), d => {
        this.log('buy', buyer, d.text, { llm: d.llm })
        const quote = d.value
        // also cover what will sell while the goods are on the way
        const qty = base + Math.ceil(rate * quote.lead * 0.5)
        const total = quote.unit * qty
        if (total <= APPROVAL_LIMIT) return this.placePO(p, quote.supplier, quote.unit, quote.lead, qty)
        this.handoff(buyer, 'ceo')
        this.log('buy', buyer, `PO ${money(total)} vượt hạn mức ${money(APPROVAL_LIMIT)}, trình CEO duyệt`)
        this.after(randInt(15, 30), () => {
          const ceo = this.bot('ceo')
          this.decide(this.brain.approvePurchase({ product: p, qty, total, cash: this.cash, backQty }), a => {
            this.log('ceo', ceo, a.text, { llm: a.llm })
            this.handoff(ceo, 'buy')
            this.after(5, () => this.placePO(p, quote.supplier, quote.unit, quote.lead, a.value))
          })
        })
      })
    })
  }

  private placePO(p: Product, supplier: Supplier, unit: number, lead: number, qty: number) {
    const buyer = this.bot('buy')
    const po = 'PO-' + ++this.seq.po
    const total = unit * qty
    this.log('buy', buyer, `Tạo ${po}: ${qty} × ${p.name} từ ${supplier.name}, ${money(total)}, giao sau ${lead} ngày`)
    this.handoff(buyer, 'acc')
    this.after(lead * 1440 - randInt(0, 240), () => {
      const wh = this.bot('wh'), acc = this.bot('acc')
      this.emit({ type: 'truck' })
      this.packet({ dept: 'gate' }, { bot: wh.id }, DEPTS.gate.color)
      p.stock += qty
      p.openPO = false
      this.log('wh', wh, `📥 Nhập kho ${po}: +${qty} ${p.name}, tồn ${p.stock}`, { good: true })
      this.after(randInt(20, 40), () => {
        this.cash -= total
        this.log('acc', acc, `Thanh toán ${money(total)} cho ${supplier.name} (${po}) · Nợ 331 / Có 112`)
        this.checkBankrupt()
      })
      this.fulfillBackorders(p)
    })
  }

  private fulfillBackorders(p: Product) {
    const wh = this.bot('wh')
    for (const o of this.backorders.filter(x => x.product === p)) {
      if (p.stock < o.qty) continue
      p.stock -= o.qty
      p.sold += o.qty
      this.backorders.splice(this.backorders.indexOf(o), 1)
      this.log('wh', wh, `Xuất hàng đang chờ cho ${o.so} (${o.customer}): ${o.qty} × ${p.name}`)
      this.after(randInt(10, 30), () => this.ship(o))
    }
    this.checkReorder(p)
  }

  // ---------------------------------------------------------------- support departments

  private startOutage() {
    if (this.t < this.outageUntil) return
    const it = this.bot('it')
    this.outageUntil = this.t + randInt(50, 110)
    it.status = 'error'
    this.log('it', it, '⚠ Server CRM quá tải, Sales không tra được tồn kho', { warn: true })
    this.after(12, () => {
      this.decide(this.brain.diagnose(), d => {
        it.status = 'working'
        this.log('it', it, d.text, { llm: d.llm })
      })
    })
    this.after(this.outageUntil - this.t, () => {
      if (it.status === 'error') it.status = 'working'
      this.spend(300, 'it', it, 'CRM hoạt động lại ✓ Chi phí khắc phục 300 $', { good: true })
    })
  }

  private sendCharging(b: Bot) {
    const hr = this.bot('hr')
    b.status = 'charging'
    this.log('hr', hr, `${b.name} còn ${Math.round(b.energy)}% pin. Cho đi sạc 40 phút`)
    this.emit({ type: 'charge', botId: b.id, on: true })
    this.after(40, () => {
      b.energy = 100
      b.status = 'idle'
      this.emit({ type: 'charge', botId: b.id, on: false })
      this.log('hr', hr, `${b.name} sạc đầy, quay lại làm việc`)
    })
  }

  private morning() {
    const hr = this.bot('hr')
    const best = this.products.slice().sort((a, b) => (b.price - b.cost) * b.sold - (a.price - a.cost) * a.sold)[0]
    this.decide(this.brain.morningBrief({
      day: this.day, profit: this.profit, target: PROFIT_TARGET, cash: this.cash, backorders: this.backorders.length, best,
    }), d => {
      this.frugal = d.value.frugal
      this.log('ceo', this.bot('ceo'), d.text, { llm: d.llm })
    })
    const n = this.bots.length
    this.after(5, () => this.log('hr', hr, `Điểm danh ngày ${this.day}: ${n}/${n} robot có mặt, pin trung bình ${Math.round(this.avgEnergy)}%`))

    // Skill: Dự báo hết hàng mỗi sáng từ thủ kho
    this.after(10, () => {
      const wh = this.bot('wh')
      const stockout = runSkill<Record<string, never>, StockoutOut>('forecast_stockout', { bot: wh, args: {} }, this.asSkillSim())
      if (stockout instanceof Promise) {
        stockout.then(s => { if (s?.text) this.log('wh', wh, s.text, { warn: s.value?.urgent, llm: true }) })
      } else if (stockout?.text) {
        this.log('wh', wh, stockout.text, { warn: stockout.value?.urgent, llm: true })
      }
    })
  }

  private endOfDay() {
    const ceo = this.bot('ceo')
    this.log('acc', this.bot('acc'), `Khóa sổ ngày ${this.day}: phải thu ${money(this.receivable)}, lãi lũy kế ${money(this.profit)}`)
    this.decide(this.brain.dailySummary({ day: this.day, orders: this.today.orders, revenue: this.today.revenue, cash: this.cash }), d => {
      this.log('ceo', ceo, d.text, { llm: d.llm })
    })
    this.today = { orders: 0, revenue: 0 }
    if (!this.partyDone && this.profit >= PROFIT_TARGET) {
      this.partyDone = true
      this.log('ceo', ceo, `🎉 Vượt mục tiêu lãi ${money(PROFIT_TARGET)}! Cả công ty mở tiệc 15 phút`, { good: true, llm: true })
      this.emit({ type: 'party' })
    }
  }

  private marketing() {
    const m = this.bot('mkt')
    if (this.frugal) return this.log('mkt', m, 'CEO yêu cầu tiết kiệm, hoãn chiến dịch hôm nay')
    const p = this.products.slice().sort((a, b) => a.sold - b.sold)[0]

    // Skill: Chọn kênh quảng cáo theo giá bán
    const channel = runSkill<ChannelArgs, ChannelOut>('choose_channel', { bot: m, args: { sku: p.sku, budget: 1500 } }, this.asSkillSim())
    if (channel instanceof Promise) {
      channel.then(c => { if (c?.text) this.log('mkt', m, c.text, { llm: true }) })
    } else if (channel?.text) {
      this.log('mkt', m, channel.text, { llm: true })
    }
    this.decide(this.brain.campaign({ product: p }), d => {
      p.demand = 1.9
      p.demandUntil = this.t + 1440
      this.spend(1500, 'mkt', m, d.text, { llm: d.llm })
    })
  }

  private onMinute(prev: number, now: number, step: number) {
    const at = (hh: number, mm = 0) => crossed(prev, now, hh, mm)
    const hr = this.bot('hr')

    if (at(8)) this.morning()
    if (at(10) && this.day % 2 === 0) this.marketing()
    if (at(12)) {
      this.bots.forEach(b => (b.energy = Math.min(100, b.energy + 25)))
      this.log('hr', hr, '🍱 Nghỉ trưa: cả công ty sạc nhanh +25% pin')
    }
    if (at(17) && this.day % 5 === 0) {
      const amount = this.bots.length * WEEKLY_SALARY
      this.log('hr', hr, `Chốt bảng lương tuần: ${this.bots.length} robot × ${WEEKLY_SALARY} $`)
      this.after(10, () => this.spend(amount, 'acc', this.bot('acc'), `Chi lương ${money(amount)} · Nợ 334 / Có 112`))
    }
    if (at(17, 30)) this.log('it', this.bot('it'), 'Sao lưu dữ liệu hằng ngày ✓')
    if (at(18)) {
      this.endOfDay()
      this.log('hr', hr, '🌙 Hết giờ. Robot về dock sạc qua đêm')
      this.bots.forEach(b => {
        b.energy = 100
        if (b.status !== 'error' && b.status !== 'charging') b.status = 'idle'
      })
      this.t = (Math.floor(this.t / 1440) + 1) * 1440 + 8 * 60 - 1
      return
    }

    const minuteOfDay = now % 1440
    if (this.t >= this.nextOrder) {
      if (minuteOfDay >= 8 * 60 && minuteOfDay < 17 * 60 + 30) this.newOrder()
      this.nextOrder = this.t + rnd(22, 58) / (this.demandAll * (0.55 + this.satisfaction / 200))
    }
    if (this.demandAll > 1 && this.t > this.demandUntil) {
      this.demandAll = 1
      this.log('mkt', this.bot('mkt'), 'Flash sale kết thúc, nhu cầu trở lại bình thường')
    }
    for (const p of this.products) {
      if (p.demand > 1 && this.t > p.demandUntil) {
        p.demand = 1
        this.log('mkt', this.bot('mkt'), `Kết thúc chiến dịch ${p.name}. Đã bán tổng ${p.sold} cái`)
      }
    }
    for (const b of this.bots) {
      if (b.status === 'charging') continue
      const busy = b.status === 'working' || b.thinkingUntil > this.t
      b.energy = Math.max(0, b.energy - step * (busy ? 0.05 : 0.02))
    }
    if (Math.random() < 0.0005 * step) this.startOutage()
    if (this.t >= this.nextCheck) {
      this.nextCheck = this.t + 20
      this.cashHistory.push(this.cash)
      if (this.cashHistory.length > 150) this.cashHistory.shift()
      for (const b of this.bots) {
        if (b.status === 'working' && this.t - b.lastActive > 50) b.status = 'idle'
        if (b.energy < 28 && b.status !== 'charging' && b.status !== 'error') this.sendCharging(b)
      }
    }
  }

  // ---------------------------------------------------------------- chaos button

  private chaos: Record<ChaosId, () => void> = {
    vip: () => this.newOrder(true),
    supplier: () => {
      const s = pick(this.suppliers), b = this.bot('buy')
      s.factor *= 1.15
      this.log('buy', b, `📈 ${s.name} báo tăng giá 15% từ hôm nay`, { warn: true })
      this.after(20, () => {
        const cheapest = this.suppliers.slice().sort((a, c) => a.factor - c.factor)[0]
        this.log('buy', b, `Cập nhật bảng so sánh: ưu tiên ${cheapest.name} cho đơn thường, giữ ${s.name} làm phương án dự phòng`, { llm: true })
      })
    },
    outage: () => this.startOutage(),
    sale: () => {
      this.demandAll = 2
      this.demandUntil = this.t + 720
      this.log('mkt', this.bot('mkt'), '🛍️ Flash sale 11.11: nhu cầu tăng gấp đôi trong 12 giờ', { llm: true })
    },
    strike: () => {
      const hr = this.bot('hr')
      this.bots.forEach(b => (b.energy = Math.max(5, b.energy - 45)))
      this.log('hr', hr, '🪫 Kho và Sales báo quá tải, năng lượng toàn công ty giảm mạnh', { warn: true })
      this.after(20, () => {
        this.bots.forEach(b => (b.energy = Math.min(100, b.energy + 20)))
        this.log('hr', hr, 'Thỏa thuận xong: thêm một ca sạc pin buổi chiều. Robot quay lại làm việc', { llm: true })
      })
    },
    audit: () => {
      const acc = this.bot('acc')
      this.log('acc', acc, '🔍 Đoàn kiểm toán tới. Đang đối chiếu sổ cái, hóa đơn và tồn kho…')
      this.after(60, () => {
        const value = this.products.reduce((s, p) => s + p.stock * p.cost, 0)
        this.log('acc', acc, `Kiểm toán xong: tiền mặt ${money(this.cash)} khớp sổ, tồn kho trị giá ${money(value)}, ${this.backorders.length} đơn chờ đã ghi nhận đúng`, { good: true, llm: true })
      })
    },
  }
}

export const company = new Company()
