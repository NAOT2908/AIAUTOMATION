# Hệ thống Skill cho RoboCorp

Bộ khung skill tách khỏi `engine.ts`, đúng pattern `Brain`/`Decision` có sẵn của repo.
Copy cả thư mục `skills/` vào `src/sim/skills/` là dùng được.

## Có gì trong này

| File | Nội dung |
|---|---|
| `types.ts` | `SkillDef`, `SkillCtx`, `SkillSim` — skill chỉ được ĐỌC sim, mọi thay đổi đi qua `Decision.value` để engine áp dụng |
| `index.ts` | Registry + `runSkill(id, ctx, sim)` + `skillsFor(dept)` |
| `sales.ts` | `upsell` (gợi ý mua thêm khi chốt đơn), `handle_complaint` (xử lý khiếu nại, có tính chi phí) |
| `warehouse.ts` | `forecast_stockout` (dự báo SKU sắp hết, dùng chú thích "reorderPoint ≈ 2 ngày bán" trong `data.ts`) |
| `marketing.ts` | `choose_channel` (chọn kênh theo giá bán) |
| `claude.ts` | Khung sườn `ClaudeBrain` — gắn LLM thật mà không sửa engine |

## Cách gắn vào repo (5 phút)

**1. Copy thư mục:**
```
src/sim/skills/
├── types.ts
├── index.ts
├── sales.ts
├── warehouse.ts
├── marketing.ts
└── claude.ts
```

**2. Gọi skill từ `engine.ts`** — ví dụ sau khi sales chốt đơn:

```ts
import { runSkill } from './skills'

// trong hàm xử lý chốt đơn của sales:
const decision = await runSkill('upsell',
  { bot: salesBot, args: { customer: order.customer, sku: order.product.sku, qty: order.qty } },
  { t: this.t, day: this.day, cash: this.cash, products: this.products, bots: this.bots },
)
if (decision.text) this.log('sales', salesBot.id, salesBot.name, decision.text, { llm: decision.llm })
// decision.value = { addSku, addQty, discount } → engine tự cộng vào đơn hàng
```

**3. Chạy kiểm tra tồn kho mỗi sáng** (trong `morningBrief` hoặc scheduler):

```ts
const check = await runSkill('forecast_stockout', { bot: whBot, args: {} }, simLike)
if (check.value.urgent) {
  // tự động walk buyer-bot sang phòng kho + log cảnh báo (đã có text sẵn)
}
```

**4. Thêm skill mới:** tạo file `src/sim/skills/hr.ts`, export `SkillDef`,
thêm 1 dòng vào mảng `SKILLS` trong `index.ts`. Xong.

## Gắn Claude thật

1. `const brain = new ClaudeBrain(import.meta.env.VITE_ANTHROPIC_KEY)` rồi inject vào engine
   thay cho `RuleBrain` (interface `Brain` đã hỗ trợ `Promise`).
2. Mỗi robot có system prompt = persona + skill được phép dùng (`skillsFor(bot.dept)`).
3. Nguyên tắc an toàn: **LLM lỗi → rớt về luật**. Sim không bao giờ đứng vì API.
   Mẫu `negotiate()` trong `claude.ts` đã làm đúng pattern này: số liệu do luật tính,
   chỉ nhờ Claude viết lại câu log cho tự nhiên.

## Mở rộng tiếp theo

- `hr.ts`: `interview` (phỏng vấn robot mới), `review_performance`
- `it.ts`: `auto_heal` (tự khắc phục sự cố nhẹ trước khi báo)
- `ceo.ts`: `emergency_decision` (quyết định khẩn khi có 2 sự kiện cùng lúc)
- Meta skill `orchestrate`: CEO điều phối nhiều phòng cùng xử lý 1 sự kiện lớn
