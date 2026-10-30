# RoboCorp · Lộ trình nâng cấp: Đẹp hơn · Chuyên nghiệp hơn · Ổn áp hơn

> Ghi chú cho người code (hoặc AI code): mỗi mục ghi rõ **độ ưu tiên** (P0 = làm trước,
> P1 = làm sau, P2 = nice-to-have) và **file liên quan** trong repo hiện tại.

---

## A. ĐẸP HƠN (visual polish)

### A1. Design system cho HUD — P0
- Thống nhất bộ màu, font, bo góc, độ trong suốt của toàn bộ `.card`, `.kpi`, `.menu`.
- HUD dạng glassmorphism nhẹ (nền mờ, viền sáng 1px) thay vì card đặc.
- File: `src/styles.css` (viết lại biến màu ở `:root`), `src/ui/*`.

### A2. Ánh sáng & vật liệu 3D — P0
- 3-point lighting cho văn phòng: key light ấm, fill light lạnh, rim light sau lưng robot.
- Sàn nhà phản chiếu nhẹ (Reflector của drei hoặc roughness thấp + env map).
- Mỗi phòng ban có màu accent riêng đã có trong `DEPTS` — dùng màu đó cho viền sàn/đèn neon của phòng.
- File: `src/scene/Office.tsx`, `src/scene/materials.ts`, `src/scene/theme.ts`.

### A3. Robot "có hồn" — P1
- Idle animation: robot đứng yên thì đầu xoay nhẹ, đèn mắt chớp, tay đung đưa.
- Walk animation: chân/bánh xe chuyển động khi `status = walking`.
- Bong bóng thoại 3D trên đầu robot khi `thinking` — hiện `bot.thought` dạng rút gọn.
- File: `src/scene/Robot.tsx`, `src/scene/Labels.tsx`.

### A4. Camera điện ảnh — P1
- Preset góc nhìn: Toàn cảnh / Phòng họp / Kho hàng / Cổng — nút chuyển, camera bay mượt (lerp).
- Chế độ "Cinematic": camera tự quay chậm quanh văn phòng khi người dùng không tương tác 30s.
- File: `src/scene/World.tsx`, `src/store.ts` (thêm `cameraPreset`).

### A5. Minimap + la bàn — P1
- Minimap 2D góc dưới-trái: sơ đồ phòng ban, chấm màu vị trí robot, bấm để bay camera tới.
- File mới: `src/ui/Minimap.tsx`, dùng `layout.ts` có sẵn.

### A6. Hiệu ứng "đã" — P2
- Particle/confetti khi đạt mục tiêu lợi nhuận tháng; tia sáng khi PO được duyệt.
- Phòng gặp sự cố (server sập): đèn đỏ nhấp nháy + khói nhẹ (đã có `Fx.tsx` để mở rộng).
- Ngày/đêm: văn phòng đổi ánh sáng theo `company.t`, tối đèn vàng ấm.

---

## B. CHUYÊN NGHIỆP HƠN (tính năng pro)

### B1. Báo cáo cuối ngày (Daily Report) — P0
- Popup khi hết ngày: doanh thu, lợi nhuận, số đơn, top sản phẩm, robot xuất sắc nhất.
- Biểu đồ đường doanh thu 7 ngày (mở rộng `Sparkline` có sẵn trong `Inspector.tsx`).
- File mới: `src/ui/Report.tsx`; sim: `src/sim/engine.ts` (lưu `dailyStats`).

### B2. Bảng xếp hạng robot (Leaderboard) — P1
- Tab trong Inspector: xếp hạng robot theo `done`, hiệu suất, thời gian sạc.
- Tạo tính cạnh tranh vui, người xem có "nhân vật yêu thích".
- File: `src/ui/Inspector.tsx` (thêm tab).

### B3. Lưu / tải / xem lại (Save & Replay) — P1
- 3 slot lưu: serialize `company` (sim thuần TS nên dễ) vào localStorage.
- Replay: ghi lại mảng `LogEntry` + timestamp, cho tua lại như video.
- File mới: `src/sim/save.ts`; UI: thêm vào menu chính.

### B4. "Hỏi robot" — chat với Brain — P1
- Trong Inspector, ô chat: hỏi robot "sao hôm nay chọn NCC này?" → gọi `brain` trả lời.
- Khi chưa có LLM thật, `RuleBrain` trả lời theo mẫu; đã có interface `Brain` hỗ trợ async.
- Đây là bước đệm tự nhiên để gắn Claude thật (đúng tinh thần README).
- File mới: `src/ui/ChatPanel.tsx`; sim: thêm method `ask()` vào `Brain`.

### B5. Lịch trình ngày (Day schedule) — P2
- 08:00 họp giao ban (robot tụ về phòng họp, CEO brief), 12:00 nghỉ trưa, 17:00 tổng kết.
- Biến văn phòng thành "một ngày làm việc" có nhịp, không chỉ chạy ngẫu nhiên.
- File: `src/sim/engine.ts` (thêm scheduler theo `company.t`).

### B6. Chế độ xem theo vai trò — P2
- "Góc nhìn CEO": dashboard KPI toàn màn hình, 3D thu nhỏ.
- "Góc nhìn trưởng phòng": focus 1 phòng + KPI riêng của phòng đó.
- File: `src/store.ts` (thêm `viewMode`), `src/ui/TopBar.tsx`.

### B7. Onboarding / hướng dẫn lần đầu — P1
- Lần đầu mở: tour 4 bước (kéo xoay → bấm robot → tung sự kiện → xem nhật ký), có nút "Bỏ qua".
- Rất cần nếu demo cho người khác xem.
- File mới: `src/ui/Tour.tsx`.

---

## C. MENU MỚI (cấu trúc đề xuất)

```
┌──────────────────────────────────────────────────┐
│ ☰ RoboCorp │ Ngày 3 · 09:24 │ [KPI x5] │ 🔊 ⚙ │  ← TopBar (gọn lại)
├────┬───────────────────────────────────┬─────────┤
│    │                                   │ [Tab]   │
│ R  │           VĂN PHÒNG 3D            │ Robot   │
│ A  │                                   │ Phòng   │
│ I  │  (minimap góc dưới-trái)          │ Báo cáo │
│ L  │                                   │         │
├────┴───────────────────────────────────┴─────────┤
│ Nhật ký hoạt động [Tất cả|Cảnh báo|LLM] 🔍  ⏸    │  ← Feed (có lọc)
└──────────────────────────────────────────────────┘
```

- **☰ Menu chính**: Chơi lại · Lưu/Tải · Cài đặt (âm thanh, ngôn ngữ, chất lượng) · Hướng dẫn · Giới thiệu.
- **Rail trái**: icon 9 phòng ban → bấm là camera bay tới + highlight phòng.
- **Panel phải** chia 3 tab: Robot (Inspector hiện tại) · Phòng ban (KPI từng phòng, nhân sự) · Báo cáo (biểu đồ).
- **Feed dưới**: thêm bộ lọc (Tất cả / Cảnh báo / Quyết định LLM) + ô tìm kiếm + nút tạm dừng cuộn.
- **Nút "Tung sự kiện"**: thêm cooldown 10s và dòng mô tả hậu quả trước khi tung (tránh spam phá game).

---

## D. ỔN ÁP HƠN (ổn định & hiệu năng)

### D1. Autosave + chống mất tiến trình — P0
- Tự lưu mỗi khi qua ngày; load lại trang không mất ván chơi.
- File: `src/sim/save.ts` (dùng chung với B3).

### D2. Hiệu năng — P0
- Robot dùng `InstancedMesh` nếu số lượng tăng; LOD cho đồ nội thất xa camera.
- Giới hạn độ dài `Feed` (chỉ render 100 dòng mới nhất, virtualize nếu cần).
- File: `src/scene/Robot.tsx`, `src/ui/Feed.tsx`.

### D3. Xử lý lỗi tử tế — P1
- WebGL không chạy được → màn hình thông báo đẹp + nút "chế độ 2D" (fallback minimap toàn màn hình).
- `try/catch` quanh `brain` async để một quyết định lỗi không đứng cả sim.

### D4. Responsive — P2
- Mobile: HUD xếp chồng, 3D full màn, panel phải thành bottom-sheet kéo lên.

---

## Thứ tự làm đề xuất (2 tuần)

| Tuần | Việc |
|---|---|
| 1 | A1 + A2 (nhìn đẹp ngay) → B1 (báo cáo ngày) → D1 (autosave) |
| 2 | A4 + A5 (camera + minimap) → C (menu mới) → B7 (tour) → B4 (hỏi robot) |

> Nguyên tắc: sim (`src/sim`) và 3D (`src/scene`) đã tách tốt — mọi tính năng B chỉ đụng
> `engine.ts`/`brain.ts`, mọi cái đẹp chỉ đụng `scene/` + `styles.css`, không trộn lẫn.
