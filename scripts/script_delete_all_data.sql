-- Script xóa sạch toàn bộ dữ liệu trong database (Reset Data)
-- Sử dụng TRUNCATE với CASCADE để xóa dữ liệu trong các bảng có quan hệ ràng buộc

BEGIN;

-- Xóa dữ liệu từ các bảng phụ thuộc trước (nếu dùng DELETE), 
-- nhưng TRUNCATE CASCADE sẽ tự động xử lý các bảng tham chiếu.
-- Danh sách dưới đây liệt kê đầy đủ các bảng để đảm bảo rõ ràng.

TRUNCATE TABLE 
    public.payment_status,
    public.attendance,
    public.student_class_enrollments,
    public.class_teachers,
    public.expenses,
    public.students,
    public.classes,
    public.teachers
RESTART IDENTITY CASCADE;

COMMIT;

-- Lưu ý:
-- 1. Lệnh này sẽ xóa TOÀN BỘ dữ liệu trong các bảng trên. Hành động này KHÔNG THỂ khôi phục.
-- 2. `RESTART IDENTITY` sẽ reset các sequence (nếu có) về giá trị khởi đầu.
-- 3. `CASCADE` sẽ tự động xóa dữ liệu ở các bảng khác có tham chiếu khóa ngoại đến các bảng này (nếu có bảng nào chưa được liệt kê).
