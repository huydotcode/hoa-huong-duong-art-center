# Phân tích Nghiệp vụ - Ứng dụng Quản lý Trung tâm Piano

Tài liệu này tổng hợp và phân tích các yêu cầu nghiệp vụ cho dự án xây dựng ứng dụng quản lý trung tâm dạy Piano.

## 1. Tổng quan

Ứng dụng được xây dựng trên nền tảng web, đáp ứng trên cả máy tính và thiết bị di động, với giao diện thân thiện, đơn giản. Hệ thống bao gồm 3 vai trò người dùng chính: **Admin**, **Giáo viên**, và **Phụ huynh** (dưới dạng khách truy cập).

## 2. Phân tích Chi tiết các Module

### Module 1: Authentication & Phân quyền

- **Admin**:
  - Đăng nhập bằng tài khoản Google (Gmail).
  - Có toàn quyền quản lý hệ thống.
- **Giáo viên**:
  - Đăng nhập bằng Số điện thoại và Mật khẩu.
  - Chỉ có quyền truy cập vào các chức năng được cấp phép (điểm danh, nhập điểm).
- **Phụ huynh**:
  - Không cần tài khoản, không cần đăng nhập.
  - Truy cập vào một trang tra cứu thông tin riêng biệt.

### Module 2: Quản lý chung (Dành cho Admin)

- **CRUD (Tạo, Xem, Sửa, Xóa) dữ liệu**:
  - Quản lý thông tin chi tiết của **Lớp học**, **Giáo viên**, và **Học sinh**.
  - Tất cả các hành động "Xóa" đều là "Xóa mềm" (soft-delete), tức là chỉ ẩn đi chứ không xóa vĩnh viễn khỏi cơ sở dữ liệu để bảo toàn dữ liệu báo cáo lịch sử.
- **Import / Export Excel**:
  - Hỗ trợ nhập và xuất dữ liệu hàng loạt cho các đối tượng: Giáo viên, Học sinh, Lớp học.
  - Hỗ trợ xuất file báo cáo tài chính tháng bao gồm: Số lượng HV mới, số lượng HV nghỉ, Doanh thu, Chi phí, Lợi nhuận.
- **Tự động làm mới trang**: Giao diện sẽ tự động cập nhật khi có sự thay đổi dữ liệu (ví dụ: thêm mới học sinh), không cần tải lại trang thủ công.
- **Thống kê tổng**: Dashboard của Admin hiển thị các số liệu tổng quan và nhanh chóng: Tổng số GV, tổng số HS, tổng số Lớp đang hoạt động.
- **Quản lý chi phí**:
  - Admin có thể thêm/sửa các khoản chi phí phát sinh hàng tháng.
  - Mỗi khoản chi cần ghi rõ lý do và ngày chi.
- **Điểm danh**:
  - Admin có quyền điểm danh cho cả Giáo viên và Học sinh theo ngày.
  - Thời gian điểm danh được hệ thống tự động ghi nhận tại thời điểm thực hiện.

### Module 3: Quản lý Lớp (Dành cho Admin)

- **Theo dõi trạng thái học phí**:
  - Trong giao diện chi tiết lớp, hiển thị danh sách học sinh.
  - Với mỗi học sinh, có các cột tương ứng với từng tháng để đánh dấu trạng thái "Đã đóng" hoặc "Chưa đóng".
- **Lọc học sinh chưa đóng học phí**:
  - Cung cấp bộ lọc nhanh để chỉ hiển thị những học sinh trong lớp đang có trạng thái "Chưa đóng" học phí tại tháng hiện tại.
  - Hệ thống chỉ quan tâm đến học sinh đang theo học tại lớp mà chưa đóng phí.
- **Chuyển học sinh (Cut & Paste)**:
  - Admin có thể chọn một hoặc nhiều học sinh.
  - Thực hiện thao tác "Cắt".
  - Di chuyển sang lớp khác và "Dán".
  - Học sinh sẽ được xóa khỏi lớp cũ và thêm vào lớp mới. Lịch sử học phí, điểm số... của học sinh tại lớp cũ vẫn được lưu lại.
- **Sao chép học sinh (Copy & Paste)**:
  - Tương tự như chuyển lớp, nhưng học sinh sẽ được thêm vào lớp mới mà **vẫn giữ lại ở lớp cũ**.
  - Điều này có nghĩa là một học sinh có thể tham gia nhiều lớp cùng lúc. Học phí được tính độc lập cho từng lớp.

### Module 4: Báo cáo – Thống kê (Dành cho Admin)

- **Doanh thu lớp**:
  - Doanh thu của một lớp trong tháng được tính bằng `Tổng học phí của các học sinh có trạng thái "Đã đóng" trong tháng đó`.
- **Tính lương Giáo viên**:
  - Lương tháng của giáo viên = `Mức lương/buổi` (lưu trong thông tin giáo viên) x `Tổng số buổi đã điểm danh "Có mặt" trong tháng`.
- **Admin Dashboard**:
  - Biểu đồ cột trực quan thể hiện tình hình kinh doanh theo từng tháng.
  - Các chỉ số trên biểu đồ: Số lượng HV mới, Số lượng HV nghỉ, Doanh thu, Chi phí, Lợi nhuận.

### Module 5: Chức năng của Giáo viên

- **Nhập điểm**:
  - Sau khi đăng nhập, giáo viên có thể vào lớp mình phụ trách để nhập điểm cho học sinh.
  - Giao diện nhập điểm gồm 3 cột điểm, được đánh số đơn giản là 1, 2, 3.
- **Điểm danh học sinh**:
  - Giáo viên có thể điểm danh học sinh trong lớp của mình.
  - Giao diện điểm danh chỉ hiển thị thông tin cần thiết: Tên HS, SĐT và ô đánh dấu có mặt/vắng mặt.

### Module 6: Chức năng của Phụ huynh

- **Tra cứu thông tin**:
  - Một trang web riêng, không yêu cầu đăng nhập.
  - **Cơ chế bảo mật**: Để tra cứu, phụ huynh cần nhập đồng thời 2 thông tin: **Tên đầy đủ của học sinh** VÀ **Số điện thoại đã đăng ký với trung tâm**.
  - Thông tin trả về bao gồm: Trạng thái học phí các tháng, điểm số và các ghi chú (nếu có).

## 3. Quy tắc nghiệp vụ cốt lõi

- **Bảo toàn dữ liệu lịch sử**: Mọi báo cáo tài chính (doanh thu, lương) trong quá khứ phải giữ nguyên, không bị ảnh hưởng bởi các thay đổi trong hiện tại (ví dụ: xóa lớp, xóa học sinh). Đây là lý do chính cho việc áp dụng cơ chế "soft-delete".
- **Tính toán dựa trên trạng thái**: Doanh thu chỉ được tính khi học phí được đánh dấu "Đã đóng". Lương giáo viên chỉ được tính dựa trên số buổi được điểm danh "Có mặt".
