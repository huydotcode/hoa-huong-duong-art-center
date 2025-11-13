## Hướng dẫn thiết lập Supabase

Tài liệu này mô tả quy trình tạo mới một project Supabase và kết nối nó với ứng dụng `hoa-huong-duong-piano`.

1. **Tạo tài khoản và project Supabase**
   - Đăng nhập tại [https://supabase.com](https://supabase.com). Nếu cần, tạo thêm organisation mới.
   - Tạo **project mới** (chọn region và đặt mật khẩu database). Chờ Supabase tạo xong.

2. **Lấy các biến môi trường**
   - Trong dashboard Supabase, mở `Project Settings → API`.
   - Sao chép các giá trị:
     - `Project URL`
     - `anon public`
     - `service_role secret`
   - Cập nhật file cấu hình môi trường của ứng dụng (ví dụ `.env.local` cho môi trường dev):
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     ```
   - Khởi động lại ứng dụng Next.js để nhận giá trị mới.

3. **Thiết lập schema database**
   - Trong Supabase, vào `Database → SQL Editor → New query`.
   - Mở file `script.sql` ở thư mục gốc dự án. File đã được chia thành các phần:
     1. Tạo bảng
     2. Bật RLS & policy
     3. Hàm và trigger
     4. Index bổ sung
   - Chạy từng phần theo thứ tự (copy/paste từng block và execute). Đảm bảo mỗi phần chạy xong không lỗi trước khi sang phần tiếp theo.
   - Tuỳ chọn: sau khi chạy schema, thêm dữ liệu mẫu (tài khoản admin, lớp học…) bằng các câu lệnh `INSERT` riêng của bạn.

4. **Cấu hình nhà cung cấp xác thực (Authentication Providers)**

   **Email**
   - Vào `Authentication → Providers → Email`.
   - Bật `Enable Email Provider`.
   - Bật thêm `Secure password change` (tránh đổi mật khẩu trái phép).
   - Không cần bật xác minh email trong bước này.

   **Phone**
   - Vào `Authentication → Providers → Phone`.
   - Bật Phone provider.
   - Ở mục _SMS Provider_, chọn **Twilio** và điền tạm thông tin (ví dụ `Account SID: 123`, `Auth Token: 123`). Khi cần gửi SMS thật, thay bằng key Twilio hợp lệ.
   - Tắt `Enable phone confirmations` để người dùng không phải xác minh OTP.

5. **Kiểm tra lại cấu hình**
   - Mở `Database → Tables` kiểm tra đủ các bảng.
   - Ở `Database → Functions / Triggers`, chắc chắn có `update_class_student_count`, `enforce_class_capacity` và các trigger liên quan.
   - Trong `Authentication → Policies`, kiểm tra mỗi bảng có policy `Allow full access for admin and teacher`.
   - Chạy ứng dụng với project Supabase mới và test các luồng chính (đăng nhập, tìm học sinh, ghi danh lớp).

Sau này nếu thay đổi schema, hãy cập nhật thêm vào `script.sql` (hoặc tạo file SQL mới) để dùng lại cho những môi trường Supabase khác.
