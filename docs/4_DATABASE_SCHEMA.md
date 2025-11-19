# Database Schema - Cấu trúc dữ liệu

Tài liệu này định nghĩa cấu trúc database cho ứng dụng Quản lý Trung tâm Piano.

## 1. Tổng quan

Database được thiết kế trên PostgreSQL (Supabase) với các bảng chính quản lý Giáo viên, Học sinh, Lớp học và các thông tin liên quan.

## 2. Chi tiết các bảng dữ liệu

### 2.1. Bảng `auth.users` (Supabase Auth - Admin & Teacher)

Quản lý thông tin đăng nhập của Admin và Teacher thông qua Supabase Authentication.

**Lưu ý:** Bảng này được tự động tạo và quản lý bởi Supabase Auth, không cần tạo thủ công.

| Tên cột                | Kiểu dữ liệu | Ràng buộc             | Mô tả                                                    |
| :--------------------- | :----------- | :-------------------- | :------------------------------------------------------- |
| **id**                 | UUID         | PRIMARY KEY, NOT NULL | ID duy nhất của user (tự động tạo)                       |
| **email**              | VARCHAR(255) | UNIQUE                | Email của Admin (dùng để đăng nhập)                      |
| **phone**              | VARCHAR(20)  | UNIQUE                | Số điện thoại của Teacher (dùng để đăng nhập)            |
| **encrypted_password** | VARCHAR(255) | NOT NULL              | Mật khẩu đã được mã hóa                                  |
| **email_confirmed_at** | TIMESTAMP    |                       | Thời điểm xác nhận email (Admin: không cần)              |
| **phone_confirmed_at** | TIMESTAMP    |                       | Thời điểm xác nhận SĐT (Teacher: không cần)              |
| **raw_app_meta_data**  | JSONB        |                       | Metadata: `{"role": "admin"}` hoặc `{"role": "teacher"}` |
| **created_at**         | TIMESTAMP    | DEFAULT NOW()         | Thời điểm tạo                                            |
| **updated_at**         | TIMESTAMP    | DEFAULT NOW()         | Thời điểm cập nhật                                       |

**Mô tả:**

- **Admin:** Đăng nhập bằng Email + Password. Không cần xác thực email.
- **Teacher:** Đăng nhập bằng Phone + Password. Không cần OTP/SMS.
- Supabase Auth tự động quản lý việc mã hóa mật khẩu và session.
- Phân biệt Admin và Teacher qua `raw_app_meta_data.role`.

**Cách tạo user:**

- Admin được tạo sẵn với email + password (không cần verify email).
- Admin có thể tạo Teacher user mới bằng Supabase Admin API với phone + password (không cần OTP).

---

### 2.2. Bảng `teachers` (Giáo viên)

Quản lý thông tin chi tiết của giáo viên (bổ sung thông tin từ auth.users).

| Tên cột        | Kiểu dữ liệu | Ràng buộc             | Mô tả                                                      |
| :------------- | :----------- | :-------------------- | :--------------------------------------------------------- |
| **id**         | UUID         | PRIMARY KEY, NOT NULL | ID duy nhất của giáo viên (đồng bộ với auth.users.id)      |
| **full_name**  | VARCHAR(255) | NOT NULL              | Họ và tên đầy đủ của giáo viên                             |
| **phone**      | VARCHAR(20)  | NOT NULL, UNIQUE      | Số điện thoại của giáo viên (đồng bộ với auth.users.phone) |
| **notes**      | TEXT         |                       | Ghi chú về giáo viên                                       |
| **is_active**  | BOOLEAN      | DEFAULT true          | Trạng thái hoạt động (soft-delete khi = false)             |
| **created_at** | TIMESTAMP    | DEFAULT NOW()         | Thời điểm tạo                                              |
| **updated_at** | TIMESTAMP    | DEFAULT NOW()         | Thời điểm cập nhật                                         |

**Mô tả:**

- Đây là bảng bổ sung thông tin cho Teacher user trong Supabase Auth.
- `id` và `phone` phải đồng bộ với `auth.users`.
- Khi Admin tạo Teacher user, tự động tạo record trong bảng này.
- **Lương giáo viên:** Không lưu trong bảng này. Lương được tính dựa trên `classes.salary_per_session` × số buổi dạy (từ bảng `attendance`).

---

### 2.3. Bảng `students` (Học sinh)

Quản lý thông tin cơ bản của học sinh.

| Tên cột          | Kiểu dữ liệu | Ràng buộc             | Mô tả                                          |
| :--------------- | :----------- | :-------------------- | :--------------------------------------------- |
| **id**           | UUID         | PRIMARY KEY, NOT NULL | ID duy nhất của học sinh (tự động tạo)         |
| **full_name**    | VARCHAR(255) | NOT NULL              | Họ và tên đầy đủ của học sinh                  |
| **phone**        | VARCHAR(20)  | NOT NULL              | Số điện thoại của học sinh (để tra cứu)        |
| **parent_phone** | VARCHAR(20)  | NOT NULL              | Số điện thoại phụ huynh (để tra cứu)           |
| **notes**        | TEXT         |                       | Ghi chú nội bộ về học sinh                     |
| **is_active**    | BOOLEAN      | DEFAULT true          | Trạng thái hoạt động (soft-delete khi = false) |
| **created_at**   | TIMESTAMP    | DEFAULT NOW()         | Thời điểm tạo                                  |
| **updated_at**   | TIMESTAMP    | DEFAULT NOW()         | Thời điểm cập nhật                             |

**Mô tả:**

- Danh sách lớp tham gia sẽ được quản lý qua bảng `student_class_enrollments` (bảng trung gian).

---

### 2.4. Bảng `classes` (Lớp học)

Quản lý thông tin các lớp học.

| Tên cột                | Kiểu dữ liệu  | Ràng buộc             | Mô tả                                                                                                                                                                              |
| :--------------------- | :------------ | :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **id**                 | UUID          | PRIMARY KEY, NOT NULL | ID duy nhất của lớp (tự động tạo)                                                                                                                                                  |
| **name**               | VARCHAR(255)  | NOT NULL              | Tên lớp học                                                                                                                                                                        |
| **days_of_week**       | JSONB         | NOT NULL              | JSON chứa thông tin các ngày học trong tuần và giờ bắt đầu.<br>Ví dụ: `[{"day": 1, "start_time": "08:00"}, {"day": 3, "start_time": "08:00"}]`<br>Day: 0=CN, 1=T2, 2=T3, ..., 6=T7 |
| **duration_minutes**   | INTEGER       | NOT NULL              | Thời lượng mỗi buổi học (tính bằng phút)                                                                                                                                           |
| **monthly_fee**        | DECIMAL(10,2) | NOT NULL              | Giá khóa học hàng tháng                                                                                                                                                            |
| **salary_per_session** | DECIMAL(10,2) | NOT NULL              | Lương giáo viên cho mỗi buổi dạy của lớp này                                                                                                                                       |
| **start_date**         | DATE          | NOT NULL              | Ngày bắt đầu lớp học                                                                                                                                                               |
| **end_date**           | DATE          | NOT NULL              | Ngày kết thúc lớp học                                                                                                                                                              |
| **is_active**          | BOOLEAN       | DEFAULT true          | Trạng thái hoạt động (soft-delete khi = false)                                                                                                                                     |
| **created_at**         | TIMESTAMP     | DEFAULT NOW()         | Thời điểm tạo                                                                                                                                                                      |
| **updated_at**         | TIMESTAMP     | DEFAULT NOW()         | Thời điểm cập nhật                                                                                                                                                                 |

**Mô tả:**

- Mỗi lớp có thể có nhiều giáo viên phụ trách (liên kết qua bảng `class_teachers`).
- Thông tin lịch học được lưu trong `days_of_week` dạng JSON để linh hoạt.

---

### 2.5. Bảng `class_teachers` (Giáo viên phụ trách lớp)

Bảng trung gian quản lý quan hệ nhiều-nhiều giữa Lớp và Giáo viên.

| Tên cột        | Kiểu dữ liệu | Ràng buộc                           | Mô tả                     |
| :------------- | :----------- | :---------------------------------- | :------------------------ |
| **id**         | UUID         | PRIMARY KEY, NOT NULL               | ID duy nhất (tự động tạo) |
| **class_id**   | UUID         | NOT NULL, FOREIGN KEY → classes.id  | ID của lớp học            |
| **teacher_id** | UUID         | NOT NULL, FOREIGN KEY → teachers.id | ID của giáo viên          |
| **created_at** | TIMESTAMP    | DEFAULT NOW()                       | Thời điểm tạo             |

**Mô tả:**

- Một lớp có thể có nhiều giáo viên phụ trách.
- Một giáo viên có thể phụ trách nhiều lớp.

---

### 2.6. Bảng `student_class_enrollments` (Học sinh tham gia lớp)

Quản lý thông tin học sinh theo từng lớp, bao gồm ngày tham gia, trạng thái và điểm số.

| Tên cột             | Kiểu dữ liệu | Ràng buộc                           | Mô tả                                                                          |
| :------------------ | :----------- | :---------------------------------- | :----------------------------------------------------------------------------- |
| **id**              | UUID         | PRIMARY KEY, NOT NULL               | ID duy nhất (tự động tạo)                                                      |
| **student_id**      | UUID         | NOT NULL, FOREIGN KEY → students.id | ID của học sinh                                                                |
| **class_id**        | UUID         | NOT NULL, FOREIGN KEY → classes.id  | ID của lớp học                                                                 |
| **enrollment_date** | DATE         | NOT NULL                            | Ngày học sinh tham gia lớp                                                     |
| **leave_date**      | DATE         |                                     | Ngày học sinh nghỉ học (null nếu chưa nghỉ)                                    |
| **status**          | VARCHAR(50)  | NOT NULL, DEFAULT 'trial'           | Trạng thái: `trial` (học thử) / `active` (chính thức) / `inactive` (nghỉ luôn) |
| **leave_reason**    | TEXT         |                                     | Lý do nghỉ học                                                                 |
| **teacher_notes**   | TEXT         |                                     | Ghi chú của giáo viên về học sinh                                              |
| **score_1**         | DECIMAL(5,2) |                                     | Điểm cột 1                                                                     |
| **score_2**         | DECIMAL(5,2) |                                     | Điểm cột 2                                                                     |
| **score_3**         | DECIMAL(5,2) |                                     | Điểm cột 3                                                                     |
| **created_at**      | TIMESTAMP    | DEFAULT NOW()                       | Thời điểm tạo                                                                  |
| **updated_at**      | TIMESTAMP    | DEFAULT NOW()                       | Thời điểm cập nhật                                                             |

**Mô tả:**

- Một học sinh có thể tham gia nhiều lớp (copy học sinh).
- Khi chuyển học sinh (cut), record cũ vẫn được giữ lại với `leave_date` được set, và tạo record mới cho lớp mới.

---

### 2.7. Bảng `attendance` (Điểm danh)

Quản lý điểm danh học sinh và giáo viên.

| Tên cột             | Kiểu dữ liệu | Ràng buộc                          | Mô tả                                                         |
| :------------------ | :----------- | :--------------------------------- | :------------------------------------------------------------ |
| **id**              | UUID         | PRIMARY KEY, NOT NULL              | ID duy nhất (tự động tạo)                                     |
| **class_id**        | UUID         | NOT NULL, FOREIGN KEY → classes.id | ID của lớp học                                                |
| **student_id**      | UUID         |                                    | ID của học sinh (null nếu là điểm danh giáo viên)             |
| **teacher_id**      | UUID         |                                    | ID của giáo viên được điểm danh (null nếu điểm danh học sinh) |
| **attendance_date** | DATE         | NOT NULL                           | Ngày điểm danh                                                |
| **session_time**    | CHAR(5)      | NOT NULL                           | Giờ ca học dạng `HH:MM` (24h), ví dụ `08:00`                  |
| **is_present**      | BOOLEAN      | NOT NULL                           | true = có mặt, false = vắng mặt                               |
| **marked_by**       | VARCHAR(50)  | NOT NULL, DEFAULT 'teacher'        | Người điểm danh: `teacher` hoặc `admin`                       |
| **notes**           | TEXT         |                                    | Ghi chú chi tiết cho buổi điểm danh                           |
| **created_at**      | TIMESTAMP    | DEFAULT NOW()                      | Thời điểm điểm danh                                           |

**Mô tả:**

- Cả giáo viên và admin đều có thể điểm danh.
- Điểm danh giáo viên: `student_id` = null, `teacher_id` = ID của giáo viên được điểm danh.
- `session_time` bắt buộc theo định dạng `HH:MM` (24h). Có ràng buộc CHECK đảm bảo định dạng.
- Unique mỗi phiên điểm danh cho học sinh theo: `(class_id, student_id, attendance_date, session_time)` (chỉ áp dụng khi `student_id IS NOT NULL`).

---

### 2.8. Bảng `payment_status` (Trạng thái đóng học phí)

Quản lý trạng thái đóng học phí của học sinh theo từng lớp và từng tháng.

| Tên cột        | Kiểu dữ liệu  | Ràng buộc                           | Mô tả                                                       |
| :------------- | :------------ | :---------------------------------- | :---------------------------------------------------------- |
| **id**         | UUID          | PRIMARY KEY, NOT NULL               | ID duy nhất (tự động tạo)                                   |
| **student_id** | UUID          | NOT NULL, FOREIGN KEY → students.id | ID của học sinh                                             |
| **class_id**   | UUID          | NOT NULL, FOREIGN KEY → classes.id  | ID của lớp học                                              |
| **month**      | INTEGER       | NOT NULL                            | Tháng (1-12)                                                |
| **year**       | INTEGER       | NOT NULL                            | Năm                                                         |
| **is_paid**    | BOOLEAN       | DEFAULT false                       | true = đã đóng, false = chưa đóng                           |
| **amount**     | DECIMAL(14,2) |                                     | Số tiền thực tế đã đóng (null nếu chưa đóng hoặc chưa nhập) |
| **paid_at**    | TIMESTAMP     |                                     | Thời điểm đánh dấu đã đóng                                  |
| **created_at** | TIMESTAMP     | DEFAULT NOW()                       | Thời điểm tạo                                               |
| **updated_at** | TIMESTAMP     | DEFAULT NOW()                       | Thời điểm cập nhật                                          |

**Mô tả:**

- Chỉ khi `is_paid` = true thì mới tính doanh thu cho lớp đó vào tháng đó.
- `amount` lưu số tiền thực tế đã đóng (có thể khác với `monthly_fee` nếu có giảm giá, tăng giá, hoặc đóng một phần).
- Nếu `amount` = null và `is_paid` = true, hệ thống sẽ sử dụng `monthly_fee` từ bảng `classes` để tính doanh thu.

---

### 2.9. Bảng `expenses` (Chi phí)

Quản lý các khoản chi phí hàng tháng.

| Tên cột          | Kiểu dữ liệu  | Ràng buộc             | Mô tả                     |
| :--------------- | :------------ | :-------------------- | :------------------------ |
| **id**           | UUID          | PRIMARY KEY, NOT NULL | ID duy nhất (tự động tạo) |
| **amount**       | DECIMAL(10,2) | NOT NULL              | Số tiền chi               |
| **reason**       | TEXT          | NOT NULL              | Lý do chi                 |
| **expense_date** | DATE          | NOT NULL              | Ngày chi                  |
| **month**        | INTEGER       | NOT NULL              | Tháng (1-12)              |
| **year**         | INTEGER       | NOT NULL              | Năm                       |
| **created_at**   | TIMESTAMP     | DEFAULT NOW()         | Thời điểm tạo             |
| **updated_at**   | TIMESTAMP     | DEFAULT NOW()         | Thời điểm cập nhật        |

**Mô tả:**

- Admin có thể thêm/sửa/xóa chi phí theo tháng.

---

## 3. Quy tắc nghiệp vụ liên quan đến Database

### 3.1. Soft Delete

- Tất cả các bảng có dữ liệu quan trọng đều có cột `is_active` để đánh dấu xóa mềm.
- Khi xóa, chỉ set `is_active` = false, không xóa record khỏi database.
- Điều này đảm bảo dữ liệu lịch sử (báo cáo doanh thu, lương) không bị ảnh hưởng.

### 3.2. Quan hệ giữa các bảng

- **Student - Class**: Quan hệ nhiều-nhiều qua bảng `student_class_enrollments`.
- **Teacher - Class**: Quan hệ nhiều-nhiều qua bảng `class_teachers`.

### 3.3. Tính toán doanh thu và lương

- **Doanh thu lớp**: Tổng hợp từ bảng `payment_status` với `is_paid` = true.
- **Lương giáo viên**:
  - Lương được tính dựa trên lương của từng lớp mà giáo viên dạy (từ `classes.salary_per_session`).
  - Tổng lương = Σ (lương/buổi của lớp × số buổi dạy trong lớp đó).
  - Số buổi dạy được lấy từ bảng `attendance` với `is_present` = true, nhóm theo `class_id`.
  - Không lưu lương cố định trong bảng `teachers`, vì một giáo viên có thể dạy nhiều lớp với mức lương khác nhau.

---

## 4. Lưu ý kỹ thuật

- Tất cả các bảng đều có `created_at` và `updated_at` để tracking.
- Sử dụng UUID cho Primary Key để đảm bảo tính duy nhất và bảo mật.
- Sử dụng DECIMAL(10,2) cho các trường tiền tệ để đảm bảo độ chính xác.
- Các trường thời gian sử dụng TIMESTAMP để lưu cả ngày và giờ.
