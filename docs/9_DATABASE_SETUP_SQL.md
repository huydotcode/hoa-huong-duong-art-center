# Hướng dẫn Setup Database trên Supabase bằng SQL

Tài liệu này cung cấp kịch bản SQL (SQL script) để tạo tất cả các bảng cần thiết cho dự án và hướng dẫn cách thiết lập Row Level Security (RLS).

## Bước 1: Chạy Script tạo bảng

1.  Truy cập **Supabase Dashboard** của bạn.
2.  Đi đến mục **SQL Editor** trong menu bên trái.
3.  Nhấn vào **New query**.
4.  Copy toàn bộ nội dung trong phần **SQL Script** bên dưới và dán vào trình soạn thảo.
5.  Nhấn **RUN** để thực thi kịch bản. Thao tác này sẽ tạo tất cả các bảng và cấu trúc cần thiết.

### SQL Script

```sql
-- 1. Bảng `teachers` (Giáo viên)
-- Quản lý thông tin chi tiết của giáo viên.
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  notes TEXT,
  salary_per_session DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.teachers IS 'Quản lý thông tin chi tiết của giáo viên';

-- 2. Bảng `students` (Học sinh)
-- Quản lý thông tin cơ bản của học sinh.
CREATE TABLE public.students (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.students IS 'Quản lý thông tin cơ bản của học sinh';

-- 3. Bảng `classes` (Lớp học)
-- Quản lý thông tin các lớp học.
CREATE TABLE public.classes (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  days_of_week JSONB NOT NULL,
  duration_minutes INTEGER NOT NULL,
  monthly_fee DECIMAL(10,2) NOT NULL,
  salary_per_session DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.classes IS 'Quản lý thông tin các lớp học';

-- 4. Bảng `class_teachers` (Giáo viên phụ trách lớp)
-- Bảng trung gian quản lý quan hệ nhiều-nhiều giữa Lớp và Giáo viên.
CREATE TABLE public.class_teachers (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.class_teachers IS 'Bảng trung gian quản lý giáo viên phụ trách lớp';

-- 5. Bảng `student_class_enrollments` (Học sinh tham gia lớp)
-- Quản lý thông tin học sinh theo từng lớp.
CREATE TABLE public.student_class_enrollments (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL,
  leave_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'trial',
  leave_reason TEXT,
  teacher_notes TEXT,
  score_1 DECIMAL(5,2),
  score_2 DECIMAL(5,2),
  score_3 DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.student_class_enrollments IS 'Quản lý thông tin học sinh theo từng lớp';

-- 6. Bảng `attendance` (Điểm danh)
-- Quản lý điểm danh học sinh và giáo viên.
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  session_time CHAR(5) NOT NULL,
  is_present BOOLEAN NOT NULL,
  marked_by VARCHAR(50) NOT NULL DEFAULT 'teacher',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT person_present CHECK ((student_id IS NOT NULL AND teacher_id IS NULL) OR (student_id IS NULL AND teacher_id IS NOT NULL))
);
COMMENT ON TABLE public.attendance IS 'Quản lý điểm danh học sinh và giáo viên';

-- Session time must be HH:MM (24h)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_session_time_format'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_session_time_format
      CHECK (session_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
END$$;

-- Unique per class/student/date/session (students)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'uniq_attendance_class_student_date_session'
      AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX uniq_attendance_class_student_date_session
      ON public.attendance (class_id, student_id, attendance_date, session_time)
      WHERE student_id IS NOT NULL;
  END IF;
END$$;

-- 7. Bảng `payment_status` (Trạng thái đóng học phí)
-- Quản lý trạng thái đóng học phí của học sinh theo từng lớp và từng tháng.
CREATE TABLE public.payment_status (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  is_paid BOOLEAN DEFAULT false NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, class_id, month, year)
);
COMMENT ON TABLE public.payment_status IS 'Quản lý trạng thái đóng học phí của học sinh';

-- 8. Bảng `expenses` (Chi phí)
-- Quản lý các khoản chi phí hàng tháng.
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  expense_date DATE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE public.expenses IS 'Quản lý các khoản chi phí hàng tháng';
```

## Bước 2: Thiết lập Row Level Security (RLS)

RLS là một tính năng bảo mật quan trọng của Supabase/PostgreSQL. Nó đảm bảo rằng người dùng chỉ có thể truy cập dữ liệu mà họ được phép.

### Kịch bản SQL để bật RLS và tạo Policies

Chạy kịch bản dưới đây trong **SQL Editor** để tự động bật RLS và cấp quyền truy cập cho vai trò `admin` và `teacher`.

**Lưu ý:** Thao tác này sẽ cấp quyền truy cập **toàn bộ dữ liệu** cho bất kỳ ai đăng nhập với vai trò `admin` hoặc `teacher`.

```sql
-- KỊCH BẢN TỰ ĐỘNG BẬT RLS VÀ TẠO POLICIES --

-- 1. Tạo hàm helper để lấy vai trò của user hiện tại
-- Hàm này sẽ đọc metadata của người dùng đang đăng nhập để xác định vai trò.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  role TEXT;
BEGIN
  -- Lấy giá trị 'role' từ metadata của user hiện tại
  SELECT raw_app_meta_data->>'role' INTO role FROM auth.users WHERE id = auth.uid();
  -- Nếu không có vai trò, trả về chuỗi rỗng
  RETURN COALESCE(role, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Bật RLS cho tất cả các bảng
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;


-- 3. Tạo Policy chung cho phép Admin và Teacher truy cập tất cả dữ liệu
-- Policy này áp dụng cho tất cả các hành động (SELECT, INSERT, UPDATE, DELETE).

-- Bảng: teachers
CREATE POLICY "Allow full access for admin and teacher"
ON public.teachers
FOR ALL
USING (get_user_role() IN ('admin', 'teacher'))
WITH CHECK (get_user_role() IN ('admin', 'teacher'));

-- Bảng: students
CREATE POLICY "Allow full access for admin and teacher"
ON public.students
FOR ALL
USING (get_user_role() IN ('admin', 'teacher'))
WITH CHECK (get_user_role() IN ('admin', 'teacher'));

-- Bảng: classes
CREATE POLICY "Allow full access for admin and teacher"
ON public.classes
FOR ALL
USING (get_user_role() IN ('admin', 'teacher'))
WITH CHECK (get_user_role() IN ('admin', 'teacher'));

-- Bảng: class_teachers
CREATE POLICY "Allow full access for admin and teacher"
ON public.class_teachers
FOR ALL
USING (get_user_role() IN ('admin', 'teacher'))
WITH CHECK (get_user_role() IN ('admin', 'teacher'));

-- Bảng: student_class_enrollments
CREATE POLICY "Allow full access for admin and teacher"
ON public.student_class_enrollments
FOR ALL
USING (get_user_role() IN ('admin', 'teacher'))
WITH CHECK (get_user_role() IN ('admin', 'teacher'));

-- Bảng: attendance
CREATE POLICY "Allow full access for admin and teacher"
ON public.attendance
FOR ALL
USING (get_user_role() IN ('admin', 'teacher'))
WITH CHECK (get_user_role() IN ('admin', 'teacher'));

-- Bảng: payment_status
CREATE POLICY "Allow full access for admin and teacher"
ON public.payment_status
FOR ALL
USING (get_user_role() IN ('admin', 'teacher'))
WITH CHECK (get_user_role() IN ('admin', 'teacher'));

-- Bảng: expenses
CREATE POLICY "Allow full access for admin and teacher"
ON public.expenses
FOR ALL
USING (get_user_role() IN ('admin', 'teacher'))
WITH CHECK (get_user_role() IN ('admin', 'teacher'));

```

Sau khi chạy xong kịch bản này, tất cả các yêu cầu từ client (đã đăng nhập với vai trò `admin` hoặc `teacher`) sẽ có thể truy cập và chỉnh sửa dữ liệu trên tất cả các bảng. Các yêu cầu không được xác thực sẽ bị chặn.
