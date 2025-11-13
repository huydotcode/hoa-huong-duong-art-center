# Quản Lý Học Phí

## Tổng Quan

Chức năng quản lý học phí cho phép admin theo dõi và quản lý việc thu học phí của học sinh theo từng lớp và từng tháng. Hệ thống hỗ trợ tạo, cập nhật, và theo dõi trạng thái đóng học phí của học sinh, đồng thời cung cấp các công cụ lọc và tìm kiếm mạnh mẽ để quản lý dữ liệu hiệu quả.

## Tính Năng Chính

### 1. Hiển Thị Dữ Liệu Học Phí

- **Theo dõi theo tháng/năm**: Hệ thống cho phép xem dữ liệu học phí theo từng tháng và năm cụ thể
- **Nhóm theo lớp**: Dữ liệu được nhóm và hiển thị theo từng lớp học, mỗi lớp có bảng/card riêng
- **Thông tin hiển thị**:
  - Tên học sinh
  - Số điện thoại
  - Tên lớp
  - Học phí tháng (monthly_fee)
  - Số tiền đã đóng (amount) - có thể khác với học phí tháng
  - Trạng thái đóng học phí (đã đóng/chưa đóng/chưa tạo)
  - Ngày đóng (nếu đã đóng)
  - Trạng thái học của học sinh (đang học/học thử/ngừng học)
  - Ngày bắt đầu và kết thúc của lớp

### 2. Lọc và Tìm Kiếm

#### Filter Chính

- **Tháng/Năm**: Chọn tháng và năm để xem dữ liệu (mặc định là tháng/năm hiện tại)
- **Tìm kiếm học sinh**: Tìm kiếm theo tên hoặc số điện thoại (không phân biệt dấu, không phân biệt hoa thường)

#### Filter Popover

- **Lớp học**: Lọc theo lớp cụ thể hoặc hiển thị tất cả lớp
- **Môn học**: Lọc theo môn học dựa trên tên lớp (ví dụ: Piano, Guitar, Violin)
- **Trạng thái**: Lọc theo trạng thái đóng học phí:
  - Tất cả
  - Đã đóng
  - Chưa đóng
  - Chưa tạo

#### Tính Năng Tìm Kiếm Nâng Cao

- **Tìm kiếm không dấu**: Hỗ trợ tìm kiếm tiếng Việt không cần đúng dấu (ví dụ: tìm "dang" sẽ tìm thấy "Đặng")
- **Tìm kiếm số điện thoại**: Tìm kiếm theo số điện thoại, tự động loại bỏ khoảng trắng và ký tự đặc biệt

### 3. Tạo và Cập Nhật Học Phí

#### Tạo Học Phí Mới

- Cho phép tạo học phí cho học sinh chưa có bản ghi payment_status
- Khi tạo, hệ thống tự động:
  - Lấy danh sách các lớp mà học sinh đã học trong tháng đó
  - Nếu học sinh có nhiều lớp trong tháng, hiển thị danh sách để chọn
  - Ưu tiên chọn lớp mà người dùng click vào (nếu có trong danh sách)
  - Nếu không có, mặc định chọn lớp cuối cùng mà học sinh đăng ký trong tháng
  - Tự động điền học phí tháng (monthly_fee) của lớp được chọn

#### Cập Nhật Học Phí

- Chỉnh sửa số tiền đã đóng (có thể khác với học phí tháng)
- Cập nhật trạng thái đóng học phí (đã đóng/chưa đóng)
- Cập nhật ngày đóng (tự động set khi đánh dấu "đã đóng")
- Không thể thay đổi lớp học khi đã tạo (chỉ có thể chỉnh sửa khi tạo mới)

#### Xử Lý Học Sinh Học Thử

- Hiển thị cảnh báo khi tạo học phí cho học sinh có trạng thái "học thử"
- Cảnh báo nhắc nhở admin kiểm tra kỹ trước khi tạo học phí

### 4. Tự Động Tạo Học Phí

#### Chức Năng "Tạo Học Phí Tự Động"

- Tự động tạo payment_status cho tất cả học sinh đang học (status = "active") chưa có học phí trong tháng/năm được chọn
- **Điều kiện tạo**:
  - Học sinh phải có trạng thái "active" (không tạo cho học sinh "trial")
  - Học sinh và lớp phải đang active (is_active = true)
  - Enrollment phải overlap với tháng được chọn
  - Lớp chưa kết thúc trước tháng được chọn
  - Chưa có payment_status cho học sinh/lớp/tháng/năm đó

#### Kết Quả

- Trả về số lượng học phí đã tạo và số lượng đã bỏ qua (đã tồn tại)
- Hiển thị thông báo thành công với chi tiết
- Tự động làm mới dữ liệu sau khi tạo

### 5. Thống Kê Tổng Hợp

#### Summary Cards

- **Tổng đã thu**: Tổng số tiền học phí đã thu (từ các payment_status có is_paid = true)
- **Tổng chưa thu**: Tổng số tiền học phí chưa thu (từ các payment_status có is_paid = false)
- **Chưa tạo học phí**: Số lượng học sinh chưa có payment_status

#### Thống Kê Theo Lớp

- Mỗi lớp hiển thị:
  - Số lượng học sinh trong lớp
  - Tổng số tiền đã thu
  - Tổng số tiền chưa thu
  - Số học sinh chưa đóng
  - Số học sinh đã đóng

## Logic Nghiệp Vụ

### 1. Xác Định Học Sinh Cần Hiển Thị

Hệ thống hiển thị học sinh dựa trên các điều kiện sau:

#### Điều Kiện Enrollment

- Enrollment phải có status = "active" hoặc "trial" (hiển thị cả hai, nhưng chỉ tạo tự động cho "active")
- Enrollment phải overlap với tháng được chọn:
  - **Case 1**: Enrollment bắt đầu trong tháng được chọn
  - **Case 2**: Enrollment bắt đầu trước tháng nhưng vẫn đang active trong tháng (leave_date = null hoặc leave_date >= đầu tháng)
- Enrollment phải kết thúc sau khi lớp kết thúc hoặc học sinh rời lớp (tùy điều kiện nào đến trước)

#### Điều Kiện Lớp

- Lớp phải đang active (is_active = true)
- Lớp chưa kết thúc trước tháng được chọn (nếu có end_date)
- Nếu lớp có end_date, phải đảm bảo lớp vẫn còn active trong tháng được chọn

#### Điều Kiện Học Sinh

- Học sinh phải đang active (is_active = true)

### 2. Xử Lý Học Sinh Đổi Lớp

Khi học sinh đổi lớp trong cùng một tháng:

#### Khi Tạo Học Phí

- Hệ thống hiển thị danh sách tất cả các lớp mà học sinh đã học trong tháng
- Ưu tiên chọn lớp mà admin click vào (nếu có trong danh sách)
- Nếu không có, mặc định chọn lớp cuối cùng (lớp có enrollment_date mới nhất)
- Admin có thể chọn lớp khác nếu cần
- Số tiền học phí sẽ tự động điền theo học phí tháng của lớp được chọn

#### Khi Hiển Thị

- Mỗi enrollment sẽ hiển thị riêng biệt (nếu học sinh học nhiều lớp trong tháng, sẽ có nhiều dòng)
- Mỗi dòng có payment_status riêng (có thể đóng học phí cho từng lớp riêng)

### 3. Tính Toán Số Tiền

#### Số Tiền Mặc Định

- Khi tạo payment_status mới, số tiền mặc định là `monthly_fee` của lớp
- Admin có thể thay đổi số tiền này khi tạo hoặc cập nhật

#### Số Tiền Trong Revenue

- Khi tính doanh thu, hệ thống ưu tiên sử dụng `amount` từ payment_status
- Nếu `amount` là null, sử dụng `monthly_fee` từ lớp

### 4. Trạng Thái Đóng Học Phí

#### Các Trạng Thái

- **Chưa tạo**: Chưa có payment_status (paymentStatusId = null)
- **Chưa đóng**: Có payment_status nhưng is_paid = false
- **Đã đóng**: Có payment_status và is_paid = true

#### Tự Động Set Ngày Đóng

- Khi đánh dấu "đã đóng", hệ thống tự động set `paid_at` = thời gian hiện tại (nếu chưa có)
- Khi bỏ đánh dấu "đã đóng", hệ thống set `paid_at` = null
- Admin có thể chỉnh sửa ngày đóng thủ công

## UI/UX

### 1. Layout

#### Desktop View

- Hiển thị dữ liệu dạng bảng (Table) với các cột:
  - Tên học sinh
  - Số điện thoại
  - Trạng thái học
  - Học phí
  - Số tiền
  - Trạng thái đóng
  - Ngày đóng
  - Thao tác (Tạo/Sửa)
- Mỗi lớp được hiển thị trong một Card riêng với header chứa:
  - Tên lớp
  - Thời gian lớp (start_date - end_date)
  - Thống kê: số học sinh, tổng đã thu, tổng chưa thu, số chưa đóng, số đã đóng

#### Mobile View

- Hiển thị dữ liệu dạng Card với thông tin tương tự bảng
- Mỗi lớp có Card riêng với header chứa thông tin lớp
- Card học sinh hiển thị đầy đủ thông tin với layout tối ưu cho mobile

### 2. Filter UI

#### Filter Chính (Luôn Hiển Thị)

- Select tháng (dropdown)
- Select năm (dropdown)
- Nút "Bộ lọc" với badge hiển thị số filter đang active
- Ô tìm kiếm học sinh với nút "Tìm kiếm"
- Nút "Xóa bộ lọc" (chỉ hiển thị khi có filter active)

#### Filter Popover

- Mở khi click nút "Bộ lọc"
- Chứa 3 filter:
  - Lớp học (Select)
  - Môn học (Select)
  - Trạng thái (Select)
- Nút "Xóa" trong popover để xóa các filter trong popover
- Filter áp dụng ngay khi thay đổi (không cần nút "Áp dụng")

### 3. Form Tạo/Sửa Học Phí

#### Khi Tạo Mới

- Dialog form với các trường:
  - Lớp học (Select nếu có nhiều lớp, Input disabled nếu chỉ có 1 lớp)
  - Tháng/Năm (Input disabled)
  - Học sinh (Input disabled)
  - Số tiền (Input với format nghìn VNĐ)
  - Checkbox "Đã đóng học phí"
  - Ngày đóng (Date input, chỉ hiển thị khi checkbox được chọn)
- Cảnh báo nếu học sinh đang học thử
- Mô tả khi học sinh có nhiều lớp trong tháng

#### Khi Chỉnh Sửa

- Dialog form tương tự, nhưng:
  - Lớp học là Input disabled (không thể thay đổi)
  - Các trường khác có thể chỉnh sửa

### 4. Loading States

#### Optimistic Update

- Khi tạo/sửa học phí, UI cập nhật ngay lập tức (optimistic update)
- Hiển thị spinner nhỏ ở góc dưới bên phải trong khi refresh dữ liệu
- Spinner tự động ẩn sau 1 giây

#### Loading khi Tạo Tự Động

- Hiển thị loading state trên nút "Tạo học phí tự động"
- Hiển thị spinner ở góc dưới bên phải trong khi xử lý
- Tự động refresh dữ liệu sau khi hoàn thành

### 5. Thông Báo

#### Thành Công

- Toast notification khi tạo/sửa học phí thành công
- Toast notification khi tạo học phí tự động thành công (với số lượng đã tạo)

#### Lỗi

- Toast notification khi có lỗi xảy ra
- Hiển thị thông báo lỗi chi tiết

#### Cảnh Báo

- Cảnh báo trong form khi tạo học phí cho học sinh học thử
- Thông báo khi không có học phí nào cần tạo

## Luồng Xử Lý

### 1. Luồng Hiển Thị Dữ Liệu

1. User chọn tháng/năm (mặc định là tháng/năm hiện tại)
2. Hệ thống query tất cả enrollments có status = "active" hoặc "trial" trong tháng đó
3. Filter các enrollments theo điều kiện:
   - Học sinh và lớp đang active
   - Enrollment overlap với tháng
   - Lớp chưa kết thúc trước tháng
4. Query payment_status tương ứng
5. Kết hợp dữ liệu và hiển thị theo nhóm lớp
6. Áp dụng các filter (lớp, môn học, trạng thái, tìm kiếm) nếu có

### 2. Luồng Tạo Học Phí

1. User click "Tạo học phí" trên một học sinh
2. Nếu chưa có payment_status:
   - Hệ thống query tất cả các lớp mà học sinh đã học trong tháng
   - Hiển thị form với danh sách lớp (nếu có nhiều lớp)
   - User chọn lớp và điền thông tin
   - Submit form → tạo payment_status
   - Cập nhật UI ngay lập tức (optimistic update)
   - Refresh dữ liệu ở background

### 3. Luồng Cập Nhật Học Phí

1. User click "Sửa" trên một học phí đã tạo
2. Hiển thị form với dữ liệu hiện tại
3. User chỉnh sửa thông tin (số tiền, trạng thái, ngày đóng)
4. Submit form → cập nhật payment_status
5. Cập nhật UI ngay lập tức (optimistic update)
6. Refresh dữ liệu ở background

### 4. Luồng Tạo Học Phí Tự Động

1. User click "Tạo học phí tự động"
2. Hiển thị dialog xác nhận
3. User xác nhận
4. Hệ thống:
   - Query tất cả enrollments có status = "active" trong tháng được chọn
   - Filter các enrollments hợp lệ (overlap với tháng, lớp chưa kết thúc)
   - Query các payment_status đã tồn tại
   - Tạo payment_status mới cho các học sinh chưa có
   - Trả về số lượng đã tạo và đã bỏ qua
5. Hiển thị thông báo thành công
6. Refresh dữ liệu

## Các Trường Hợp Đặc Biệt

### 1. Học Sinh Học Thử

- **Hiển thị**: Học sinh có status = "trial" vẫn được hiển thị trong danh sách
- **Tạo tự động**: Không tạo học phí tự động cho học sinh học thử
- **Tạo thủ công**: Có thể tạo học phí thủ công, nhưng có cảnh báo
- **Badge**: Hiển thị badge "Học thử" trong bảng/card

### 2. Lớp Đã Kết Thúc

- **Hiển thị**: Không hiển thị học sinh của lớp đã kết thúc trước tháng được chọn
- **Logic**: Nếu lớp có end_date và end_date < đầu tháng, không hiển thị

### 3. Học Sinh Đổi Lớp

- **Hiển thị**: Mỗi lớp hiển thị riêng biệt (nếu học sinh học nhiều lớp trong tháng)
- **Tạo học phí**: Có thể tạo học phí cho từng lớp riêng
- **Lựa chọn lớp**: Ưu tiên lớp mà user click vào, nếu không có thì chọn lớp cuối cùng

### 4. Số Tiền Khác Học Phí Tháng

- **Cho phép**: Admin có thể nhập số tiền khác với học phí tháng (ví dụ: giảm giá, tăng giá)
- **Tính toán**: Khi tính doanh thu, ưu tiên sử dụng `amount` từ payment_status
- **Mặc định**: Khi tạo mới, số tiền mặc định là `monthly_fee` của lớp

### 5. Thu Học Phí Trễ

- **Hỗ trợ**: Hệ thống hỗ trợ thu học phí của tháng này vào tháng sau
- **Ngày đóng**: Có thể set ngày đóng khác với tháng được chọn
- **Hiển thị**: Học phí vẫn hiển thị theo tháng học, không phải tháng thu

### 6. Enrollment Kết Thúc Trong Tháng

- **Logic**: Nếu học sinh rời lớp trong tháng, vẫn hiển thị và có thể tạo học phí
- **Điều kiện**: Enrollment phải overlap với tháng (leave_date >= đầu tháng hoặc leave_date = null)

## Tối Ưu Hóa

### 1. Performance

- **Optimistic Update**: UI cập nhật ngay lập tức, không chờ server response
- **Background Refresh**: Refresh dữ liệu ở background, không block UI
- **Loading States**: Hiển thị spinner nhỏ, không làm gián đoạn trải nghiệm

### 2. UX

- **Filter Gọn Gàng**: Gom các filter vào popover để giao diện gọn gàng hơn
- **Badge Filter**: Hiển thị số lượng filter đang active trên nút filter
- **Tìm Kiếm Thông Minh**: Hỗ trợ tìm kiếm không dấu và số điện thoại
- **Cảnh Báo**: Cảnh báo khi tạo học phí cho học sinh học thử

### 3. Data Integrity

- **Unique Constraint**: Đảm bảo không có duplicate payment_status (student_id, class_id, month, year)
- **Validation**: Kiểm tra điều kiện trước khi tạo/cập nhật
- **Error Handling**: Xử lý lỗi và hiển thị thông báo rõ ràng

## Tích Hợp Với Hệ Thống

### 1. Dashboard

- Dữ liệu học phí được sử dụng để tính doanh thu trong dashboard
- Doanh thu = tổng số tiền từ các payment_status có is_paid = true

### 2. Expenses

- Học phí không trực tiếp liên quan đến expenses
- Expenses quản lý các khoản chi phí khác (lương giáo viên, chi phí vận hành, etc.)

### 3. Classes

- Học phí liên kết với classes thông qua payment_status.class_id
- Khi lớp thay đổi monthly_fee, không ảnh hưởng đến payment_status đã tạo

### 4. Students

- Học phí liên kết với students thông qua payment_status.student_id
- Khi học sinh bị xóa, các payment_status liên quan cũng bị xóa (CASCADE)

## Bảo Mật

### 1. Authorization

- Chỉ admin mới có quyền truy cập trang quản lý học phí
- Giáo viên không thể xem hoặc chỉnh sửa học phí

### 2. Data Validation

- Validation trên client và server
- Kiểm tra điều kiện trước khi tạo/cập nhật
- Đảm bảo không có duplicate payment_status

### 3. Error Handling

- Xử lý lỗi và hiển thị thông báo rõ ràng
- Không để lộ thông tin nhạy cảm trong thông báo lỗi

## Tương Lai

### 1. Tính Năng Có Thể Mở Rộng

- **Export Excel**: Xuất dữ liệu học phí ra file Excel
- **Lịch Sử**: Xem lịch sử thanh toán của học sinh
- **Thống Kê**: Thống kê chi tiết hơn (tỷ lệ thu, xu hướng, etc.)
- **Nhắc Nhở**: Tự động nhắc nhở học phí chưa đóng
- **Thanh Toán Online**: Tích hợp thanh toán online

### 2. Cải Tiến UX

- **Bulk Actions**: Cho phép cập nhật nhiều học phí cùng lúc
- **Filters Nâng Cao**: Thêm các filter phức tạp hơn (theo khoảng thời gian, theo giáo viên, etc.)
- **Search Nâng Cao**: Tìm kiếm theo nhiều tiêu chí hơn

### 3. Tối Ưu Hóa

- **Caching**: Cache dữ liệu để tăng tốc độ tải
- **Pagination**: Phân trang khi có quá nhiều dữ liệu
- **Lazy Loading**: Lazy load dữ liệu khi cần
