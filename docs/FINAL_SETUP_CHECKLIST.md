## Hướng dẫn thiết lập dự án từ A-Z

Tài liệu này tổng hợp toàn bộ bước cần làm để dựng dự án `hoa-huong-duong-piano` trên máy mới và đảm bảo ứng dụng chạy ổn định.

---

### 1. Chuẩn bị môi trường

- **Node.js**: cài phiên bản LTS (>= 18). Kiểm tra bằng `node -v`.
- **Package manager**: dùng `npm` đi kèm Node hoặc `pnpm`/`yarn` nếu muốn (ví dụ này sử dụng `npm`).
- **Git**: đảm bảo có `git` để clone repository.

### 2. Clone mã nguồn

```bash
git clone <git-url>
cd hoa-huong-duong-piano
npm install
```

### 3. Thiết lập biến môi trường

1. Sao chép file mẫu:
   ```bash
   cp example.env .env.local
   ```
2. Cập nhật các biến trong `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (Tuỳ chọn) `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` nếu muốn đổi thông tin seeding.

> Nếu chưa có giá trị Supabase, xem bước 4.

### 4. Tạo và cấu hình Supabase

1. Đăng nhập [https://supabase.com](https://supabase.com) → tạo **project mới**.
2. Lấy `Project URL`, `anon public`, `service_role secret` ở `Project Settings → API` và gán vào `.env.local`.
3. Thiết lập schema:
   - Vào `Database → SQL Editor → New query`.
   - Mở file `scripts/script.sql` (hoặc bản mới nhất trong repo).
   - Chạy từng phần theo thứ tự:
     1. Tạo bảng
     2. Bật/tắt RLS & policy (chỉ còn cho `teachers`, `class_teachers`, `expenses`)
     3. Hàm & trigger
     4. Index bổ sung
4. Cấu hình Authentication:
   - **Email**: bật `Enable Email Provider`, bật `Secure password change`, không cần xác minh email.
   - **Phone**: bật Phone provider, chọn Twilio và nhập placeholder (`Account SID: 123`, `Auth Token: 123`), tắt `Enable phone confirmations`.
5. Kiểm tra lại:
   - `Database → Tables`: đúng cấu trúc.
   - `Authentication → Policies`: chỉ các bảng `teachers`, `class_teachers`, `expenses` có policy `Allow full access for admin and teacher`.
   - `Database → Functions/Triggers`: `update_class_student_count`, `enforce_class_capacity`, `trg_*` đã tồn tại.

### 5. (Tuỳ chọn) Seed tài khoản admin

Script `scripts/seed.ts` đảm bảo tồn tại một Supabase Auth admin để đăng nhập lần đầu.

```bash
npm run ts-node scripts/seed.ts
```

- Script sẽ tạo user với:
  - Email: `SEED_ADMIN_EMAIL` (mặc định `ngonhuthuy@gmail.com`)
  - Password: `SEED_ADMIN_PASSWORD` (mặc định `123456`)
- Nếu user đã tồn tại, script chỉ log và bỏ qua.

### 6. Chạy ứng dụng

```bash
npm run dev
```

- Mở `http://localhost:3000`.
- Đăng nhập bằng tài khoản admin đã seed.
- Kiểm tra các chức năng chính (tra cứu học sinh, quản lý lớp, điểm danh, chi phí…).

### 7. Checklist trước khi bàn giao

- [ ] `.env.local` có đủ key Supabase mới.
- [ ] Đã chạy `script.sql` trên Supabase mới, kiểm tra schema/policies.
- [ ] Đã seed (hoặc tự tạo) tài khoản admin.
- [ ] Ứng dụng chạy `npm run dev` không lỗi eslint/build.
- [ ] Đã cập nhật tài liệu (nếu có thay đổi) để người khác tái sử dụng.

---

**Ghi chú thêm**

- Nếu triển khai production, đảm bảo sử dụng Supabase project riêng (không xài chung môi trường dev) và cập nhật biến môi trường tương ứng.
- Các thay đổi schema mới nên cập nhật vào `scripts/script.sql` để giữ nguồn “truth” cho các lần setup sau.
