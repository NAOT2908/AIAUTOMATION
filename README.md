# AIAUTOMATION · RoboCorp

Một công ty 3D vui nhộn do các robot AI tự vận hành: mua hàng, bán hàng, kho vận, kế toán, nhân sự, IT, marketing và giám đốc. Mỗi phòng ban là một AI Agent. Bên dưới màn hình là nhật ký hoạt động theo thời gian thực.

## Chạy thử

```bash
npm install
npm run dev        # mở http://localhost:5173
npm run build      # build bản production vào dist/
```

## Điều khiển

- Kéo chuột để xoay, cuộn để phóng to, bấm vào robot hoặc phòng để xem chi tiết.
- `Space`: tạm dừng hoặc chạy tiếp. Nút x1 / x2 / x5 đổi tốc độ.
- **Tung sự kiện**: khách VIP, nhà cung cấp tăng giá, server sập, flash sale, robot quá tải, kiểm toán.
- **Đẹp / Nhanh**: đổi chất lượng đồ họa. Máy yếu sẽ tự chuyển sang Nhanh.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `src/sim/` | Bộ mô phỏng công ty, viết bằng TypeScript thuần, không phụ thuộc React, nên chuyển lên server được. `engine.ts` chứa luồng nghiệp vụ, `brain.ts` chứa các quyết định của AI. |
| `src/scene/` | Văn phòng 3D (React Three Fiber): phòng ban, robot, xe tải, gói tin, hiệu ứng ánh sáng. |
| `src/ui/` | Các thẻ giao diện: KPI, bảng chi tiết robot, nhật ký hoạt động. |

### Gắn LLM thật (giai đoạn sau)

Mọi quyết định "thông minh" đều đi qua interface `Brain` trong `src/sim/brain.ts`: đàm phán giá, chọn nhà cung cấp, duyệt chi, chỉ đạo buổi sáng, chẩn đoán sự cố, viết chiến dịch. Hiện tại `RuleBrain` trả lời bằng luật. Muốn dùng Claude, chỉ cần viết một lớp mới cài đặt cùng interface, trả về `Promise`. Bộ mô phỏng đã hỗ trợ sẵn quyết định bất đồng bộ.

## Công nghệ

Vite · React 19 · TypeScript · three.js · @react-three/fiber · drei · postprocessing (N8AO, Bloom) · zustand

## Chế độ online (sổ lưu bút & bảng xếp hạng chung)

Mặc định sổ lưu bút và bảng xếp hạng lưu **trên máy người chơi**. Muốn mọi người cùng thấy lời nhắn và điểm của nhau:

1. Tạo project miễn phí tại [supabase.com](https://supabase.com).
2. Mở **SQL Editor**, chạy toàn bộ file [`supabase/schema.sql`](supabase/schema.sql) (tạo bảng `guestbook`, `scores` và quyền chỉ-đọc-và-thêm).
3. Vào **Project Settings → API**, lấy `Project URL` và khóa `anon public`.
4. Chạy local: tạo file `.env.local` ở thư mục gốc:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Deploy GitHub Pages: vào repo → **Settings → Secrets and variables → Actions** → thêm 2 secret cùng tên `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, rồi push lại.

Khóa `anon` được thiết kế để công khai trên trang web; dữ liệu được bảo vệ bằng Row Level Security trong `schema.sql` (khách chỉ đọc và thêm, không sửa/xóa được).

## Tham số URL tiện dụng

| Tham số | Ví dụ | Tác dụng |
|---|---|---|
| `district` | `?district=pagoda` | Mở thẳng một khu |
| `cam` | `?cam=0.9,33.6,4.6` | Camera tại x, z và mức zoom |
| `time`, `rain` | `?time=night&rain=on` | Đêm / mưa |
| `event` | `?event=fireworks` | Pháo hoa (hoặc `fire`) ngay khi mở |
| `game` | `?game=mo` | Mở game (`hub`, `mo`, `dj`, `pho`, `penalty`, `guestbook`, `scores`) |
