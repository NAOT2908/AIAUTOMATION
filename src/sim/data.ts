import type { BotDef, ChaosId, Dept, DeptId, ProductDef, Supplier } from './types'

export const DEPTS: Record<DeptId, Dept> = {
  ceo:   { id: 'ceo',   name: 'Ban Giám đốc',   icon: '👔', color: '#8E7DBE', pos: [-6.2, -5.4] },
  acc:   { id: 'acc',   name: 'Kế toán',        icon: '💰', color: '#4F9BD9', pos: [0, -5.4] },
  hr:    { id: 'hr',    name: 'Nhân sự',        icon: '👥', color: '#E07FA6', pos: [6.2, -5.4] },
  sales: { id: 'sales', name: 'Kinh doanh',     icon: '🛒', color: '#EE8A63', pos: [-6.2, 0] },
  wh:    { id: 'wh',    name: 'Kho vận',        icon: '📦', color: '#D9A93F', pos: [0, 0] },
  buy:   { id: 'buy',   name: 'Mua hàng',       icon: '🛍️', color: '#4FAF92', pos: [6.2, 0] },
  it:    { id: 'it',    name: 'IT',             icon: '💻', color: '#4DB3C6', pos: [-6.2, 5.4] },
  mkt:   { id: 'mkt',   name: 'Marketing',      icon: '📣', color: '#93BF4E', pos: [0, 5.4] },
  gate:  { id: 'gate',  name: 'Cổng giao nhận', icon: '🚚', color: '#9AA7AF', pos: [6.2, 5.4] },
}

/** departments shown as filters in the activity log (the gate has no staff) */
export const STAFFED_DEPTS: DeptId[] = ['ceo', 'sales', 'buy', 'wh', 'acc', 'hr', 'it', 'mkt']

export const BOT_DEFS: BotDef[] = [
  { id: 'ceo', name: 'CEO-Bot', dept: 'ceo', role: 'Giám đốc điều hành', persona: 'Quyết đoán, xem số liệu trước khi duyệt chi.', brain: 'Luật + LLM (chiến lược, duyệt chi)', desk: 0 },
  { id: 'acc', name: 'Accountant-Bot', dept: 'acc', role: 'Kế toán tổng hợp', persona: 'Tỉ mỉ, không để lệch một xu.', brain: 'Luật (LLM viết báo cáo tháng)', desk: 0 },
  { id: 'hr', name: 'HR-Bot', dept: 'hr', role: 'Trưởng phòng nhân sự', persona: 'Lo pin và tinh thần cho đồng nghiệp.', brain: 'Luật + LLM (thương lượng)', desk: -1.0 },
  { id: 'sales1', name: 'Sales-Bot #1', dept: 'sales', role: 'Nhân viên kinh doanh', persona: 'Nói nhiều, chốt đơn nhanh.', brain: 'Luật + LLM (đàm phán giá)', desk: -1.1 },
  { id: 'sales2', name: 'Sales-Bot #2', dept: 'sales', role: 'Nhân viên kinh doanh', persona: 'Kiên nhẫn, giỏi giữ khách quen.', brain: 'Luật + LLM (đàm phán giá)', desk: 1.1 },
  { id: 'wh', name: 'Warehouse-Bot', dept: 'wh', role: 'Thủ kho', persona: 'Đếm hàng nhanh, ghét nhất là hết hàng.', brain: 'Luật', desk: -1.1 },
  { id: 'buy', name: 'Buyer-Bot', dept: 'buy', role: 'Chuyên viên mua hàng', persona: 'Săn giá rẻ, luôn so 3 báo giá.', brain: 'Luật + LLM (chọn nhà cung cấp)', desk: -0.6 },
  { id: 'it', name: 'IT-Bot', dept: 'it', role: 'Kỹ sư hệ thống', persona: 'Ít nói, sửa lỗi trước khi ai kịp than.', brain: 'Luật + LLM (chẩn đoán sự cố)', desk: 0.9 },
  { id: 'mkt', name: 'Marketing-Bot', dept: 'mkt', role: 'Chuyên viên marketing', persona: 'Nhiều ý tưởng, mê khẩu hiệu có vần.', brain: 'Luật + LLM (viết chiến dịch)', desk: 0.4 },
]

// reorder points cover ~2 days of demand and lots ~3 days, so a well-run company rarely runs dry
export const PRODUCTS: ProductDef[] = [
  { sku: 'LAP', name: 'Laptop RB-14', cost: 620, price: 890, stock: 60, reorderPoint: 45, lot: 80, qty: [1, 12], weight: 1 },
  { sku: 'HDP', name: 'Tai nghe Beep', cost: 28, price: 59, stock: 300, reorderPoint: 220, lot: 450, qty: [5, 50], weight: 1.3 },
  { sku: 'MOU', name: 'Chuột Click-O', cost: 7, price: 18, stock: 500, reorderPoint: 380, lot: 700, qty: [10, 90], weight: 1.2 },
  { sku: 'MON', name: 'Màn hình 27"', cost: 140, price: 239, stock: 70, reorderPoint: 50, lot: 90, qty: [2, 14], weight: 0.9 },
]

export const SUPPLIERS: Supplier[] = [
  { name: 'TechSupply', factor: 1.0, lead: 2 },
  { name: 'Đại Phát Linh Kiện', factor: 0.93, lead: 4 },
  { name: 'Sài Gòn Digital', factor: 1.06, lead: 1 },
]

export const CUSTOMERS = ['Cty Ánh Dương', 'Minh Khang Group', 'Trường An Office', 'Bích Ngọc Shop', 'NovaTech', 'Cty Hải Âu', 'Lạc Hồng Edu', 'Phú Mỹ Studio', 'Cty Sông Hàn', 'Green Dental']
export const VIP_CUSTOMERS = ['Tập đoàn Kim Long', 'Ngân hàng số Orion', 'Đại học Hòa Bình']
export const SLOGANS = ['Gõ nhanh, chốt nhanh', 'Nghe rõ từng nhịp tim', 'Click là dính', 'Màn to, deal to', 'Robot chọn, người khen']

export const APPROVAL_LIMIT = 15000
export const PROFIT_TARGET = 50000
export const START_CASH = 120000
export const WEEKLY_SALARY = 450
/** simulated minutes per real second at x1 (one 10-hour workday ≈ 1 minute) */
export const MIN_PER_SEC = 10

export const CHAOS: { id: ChaosId; label: string; hint: string }[] = [
  { id: 'vip', label: '👑 Khách VIP đặt đơn lớn', hint: 'Sales đàm phán, kho có thể thiếu hàng' },
  { id: 'supplier', label: '📈 Nhà cung cấp tăng giá 15%', hint: 'Buyer phải đổi cách chọn NCC' },
  { id: 'outage', label: '🔥 Server CRM sập', hint: 'Sales chậm lại, IT vào cuộc' },
  { id: 'sale', label: '🛍️ Flash sale 11.11', hint: 'Nhu cầu tăng gấp đôi trong 12 giờ' },
  { id: 'strike', label: '🪫 Robot quá tải', hint: 'Năng lượng toàn công ty giảm mạnh' },
  { id: 'audit', label: '🔍 Kiểm toán bất ngờ', hint: 'Kế toán đối chiếu sổ sách' },
]
