# Checklist Tính Năng Mới - Hoa Hướng Dương Piano

Tài liệu này tổng hợp các yêu cầu mới từ khách hàng, giúp team có cái nhìn rõ ràng về phạm vi công việc sắp tới.

---

## Tổng Quan

- **Tổng số hạng mục**: 15
- **Mức ưu tiên**:
  1. Hiệu năng & bảo mật
  2. Điểm danh & trải nghiệm admin/teacher
  3. Quản lý học phí, phụ huynh, lương

---

## 1. Giảm giật/lag toàn hệ thống

- [ ] Audit hiệu năng (React Profiler, Lighthouse, Network)
- [ ] Tối ưu các query Supabase (giảm select \*, thêm index)
- [ ] Caching/memo hóa các component lớn
- [ ] Code splitting/lazy load các trang nặng
- [ ] Test với dữ liệu lớn (≥1000 học sinh)

## 2. Điểm danh tự động (học viên + giáo viên)

- [ ] Thêm cấu hình auto-attendance cho lớp (schema + UI)
- [ ] Viết service tự động áp trạng thái mặc định theo ca (theo `days_of_week` + `session_time`)
- [ ] Gắn flag “auto” trên record để phân biệt
- [ ] Cron/trigger preload dữ liệu trước mỗi ca

## 3. Nhận xét ngay khi điểm danh

- [ ] Thêm cột `comment` cho bảng `attendance`
- [ ] Mở dialog/comment box ở Attendance matrix
- [ ] Lưu kèm người nhập + timestamp
- [ ] Hiển thị biểu tượng nếu có nhận xét

## 4. Lọc danh sách theo 1 hoặc nhiều lớp

- [ ] Tạo multi-select component dùng chung
- [ ] Hỗ trợ filter nhiều lớp tại: Students, Attendance, Tuition, Grades, Waiting room
- [ ] Sync state với URL query

## 5. Danh sách học sinh nghỉ theo từng lớp

- [ ] Service `getInactiveStudentsByClass`
- [ ] Trang/tabs hiển thị học sinh nghỉ + lý do + ngày nghỉ
- [ ] Lọc theo lớp, export CSV

## 6. Tính tổng học viên từng lớp

- [ ] Xác nhận trigger `update_class_student_count` hoạt động ổn
- [ ] Hiển thị rõ `current/max` tại lớp, dashboard, modal
- [ ] Badge cảnh báo khi lớp đầy

## 7. Trang web không an toàn → thêm bảo mật

- [ ] Redirect HTTPS + cấu hình security headers trong `next.config.js`
- [ ] Rà soát Supabase RLS/policies
- [ ] Review env/keys, bật HTTP Strict Transport Security nếu deploy custom domain

## 8. Danh sách lớp dạng bảng (multi-select + export)

- [ ] UI chọn nhiều lớp → render bảng thông tin tổng quan
- [ ] Cột gợi ý: Tên, giáo viên, sĩ số, ngày học, trạng thái
- [ ] Nút Export Excel/PDF

## 9. Học phí dạng ma trận (cột tháng × hàng học sinh)

- [ ] Thay đổi UI: view dạng matrix (12 tháng) thay cho từng tháng đơn lẻ
- [ ] Cho phép click cell để toggle trạng thái đóng
- [ ] Tooltip hiển thị chi tiết (số tiền, ngày đóng)
- [ ] Bulk action cho nhiều tháng cùng lúc

## 10. Parent chọn lớp → tra cứu học sinh + QR (ẩn số ĐT)

- [ ] Form chọn lớp → trả về danh sách học sinh + phụ huynh (ẩn ẩn số)
- [ ] Generate QR cho mỗi phụ huynh (link đến trang thông tin công khai)
- [ ] Trang `/parent/qr/[token]` chỉ hiển thị tên HS, lớp, điểm, attendance (ẩn phone)

## 11. Điểm hiển thị dạng chữ

- [ ] Utility convert điểm số sang chữ (8.5 → “Tám phẩy năm”)
- [ ] Áp dụng tại trang Teacher Grades & Parent Search
- [ ] Cho phép bật/tắt hoặc hiện song song số + chữ

## 12. Preload dữ liệu trước 3h cho admin điểm danh

- [ ] Cron/edge function tải trước danh sách lớp/học sinh/giáo viên theo ca
- [ ] Lưu cache tạm (ví dụ KV, Supabase table, Redis)
- [ ] UI thông báo “Đã preload” hoặc “Đang tải”

## 13. Dashboard thống kê học viên mới / đăng ký / hủy

- [ ] Service thống kê trong khoảng thời gian
- [ ] Card “Học viên mới”, “Đăng ký mới”, “Hủy”
- [ ] Biểu đồ xu hướng theo tháng

## 14. Sảnh chờ → chuyển vào lớp sau khi đóng tiền

- [ ] Schema cho waiting room (bảng mới hoặc flag)
- [ ] UI quản lý học sinh trong sảnh chờ
- [ ] Logic kiểm tra học phí trước khi “send to class”
- [ ] Workflow chuyển lớp + ghi log

## 15. Lương linh động (nhiều mức giá/buổi, theo cặp)

- [ ] Thay `salary_per_session` bằng `salary_rules` (json)
- [ ] Form nhập rule: nhiều cặp {số buổi, đơn giá}
- [ ] Hỗ trợ “theo cặp” (2 học sinh/buổi)
- [ ] Cập nhật service tính lương, export Excel

---

### Ghi chú triển khai

- Cập nhật `scripts/script.sql` cho mọi thay đổi schema
- Document lại ở `docs/` tương ứng (setup, modules, guides)
- Test đầy đủ (unit + integration + thực tế với dữ liệu lớn)
