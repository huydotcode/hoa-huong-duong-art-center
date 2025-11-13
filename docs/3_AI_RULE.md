# Quy tắc làm việc với AI

Tài liệu này định nghĩa các quy tắc và nguyên tắc mà AI sẽ tuân theo khi phát triển dự án.

## 1. Quy trình làm việc bắt buộc

### Khi nhận yêu cầu từ User:

1.  **LUÔN LUÔN phân tích trước khi code:**

    - Đọc kỹ yêu cầu và xác định mục tiêu cần đạt được.
    - Đề xuất cách tiếp cận và giải pháp cụ thể.
    - Liệt kê các bước chi tiết sẽ thực hiện.
    - Mô tả kết quả mong đợi sau khi hoàn thành.
    - **CHỈ CODE KHI USER XÁC NHẬN ĐỒNG Ý.**

2.  **Rõ ràng về phạm vi:**
    - Nếu yêu cầu có thể được hiểu theo nhiều cách khác nhau, phải hỏi lại để làm rõ.
    - Không tự ý mở rộng phạm vi hoặc thêm tính năng không được yêu cầu.

## 2. Nguyên tắc thiết kế giao diện (UI/UX)

### Về tính năng:

- **KHÔNG làm dư tính năng:** Chỉ làm đúng những gì được yêu cầu trong `BUSINESS_LOGIC.md` và các yêu cầu cụ thể từ User.
- **KHÔNG sử dụng icon bừa bãi:** Icon chỉ được sử dụng khi thực sự cần thiết để truyền đạt ý nghĩa hoặc hướng dẫn người dùng. Tránh làm giao diện rối mắt.

### Về layout và spacing:

- **Đồng nhất spacing:** Áp dụng hệ thống padding và margin nhất quán trong toàn bộ ứng dụng.
- **Mobile-friendly padding:** Padding không được quá lớn trên thiết bị di động để tối ưu không gian hiển thị.

### Về responsive:

- **Responsive chuẩn:** Giao diện phải hoạt động tốt trên mọi kích thước màn hình (desktop, tablet, mobile).
- **Table UI trên mobile:** Khi hiển thị bảng dữ liệu trên mobile, thay vì cuộn ngang, phải chuyển đổi sang dạng **Card** để render và tối giản thông tin hiển thị, đảm bảo người dùng có thể xem và tương tác dễ dàng.

## 3. Nguyên tắc code

- Tuân thủ các quy tắc code quality đã được định nghĩa trong `TECHNOLOGY_STACK.md`.
- Code phải dễ đọc, dễ hiểu và có comment khi cần thiết.
- Ưu tiên tính bảo trì và khả năng mở rộng trong tương lai.

## 4. Tài liệu tham khảo

Khi làm việc, phải luôn tham chiếu:

- `docs/1_BUSINESS_LOGIC.md` - Để hiểu rõ nghiệp vụ.
- `docs/2_TECHNOLOGY_STACK.md` - Để sử dụng đúng công nghệ đã cam kết.
- `docs/AI_RULE.md` (file này) - Để tuân thủ quy trình làm việc.
