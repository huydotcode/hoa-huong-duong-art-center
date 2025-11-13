# Công nghệ sử dụng cho dự án

Tài liệu này tổng hợp bộ công nghệ đã được thống nhất để xây dựng ứng dụng Quản lý Trung tâm Piano.

## 1. Tổng quan

Chúng ta sẽ xây dựng một ứng dụng full-stack TypeScript sử dụng Next.js và Supabase. Lựa chọn này cho phép phát triển nhanh, hiệu năng cao và dễ dàng bảo trì.

## 2. Chi tiết các công nghệ

| Hạng mục                      | Công nghệ                        | Lý do lựa chọn                                                                                                                                           |
| :---------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework chính**           | **Next.js**                      | Cung cấp môi trường phát triển React mạnh mẽ với Server-Side Rendering (SSR), Static Site Generation (SSG), tối ưu hiệu năng và SEO.                     |
| **Backend & Database**        | **Supabase**                     | Nền tảng "Backend as a Service" xây dựng trên Postgres. Cung cấp Database, Authentication, API tự động, Storage, giúp giảm thời gian phát triển backend. |
| **Ngôn ngữ**                  | **TypeScript**                   | Đảm bảo an toàn kiểu dữ liệu, giảm thiểu lỗi runtime và giúp code dễ đọc, dễ bảo trì hơn.                                                                |
| **Styling**                   | **Tailwind CSS**                 | Framework CSS utility-first giúp xây dựng giao diện nhanh chóng, đồng nhất mà không cần rời khỏi file HTML/JSX.                                          |
| **UI Components**             | **Shadcn/UI**                    | Bộ sưu tập component được xây dựng trên Tailwind CSS và Radix UI, đẹp, dễ tùy biến và hỗ trợ tối đa về A11y (Accessibility).                             |
| **Quản lý State từ Server**   | **Tanstack Query (React Query)** | Thư viện mạnh mẽ để fetching, caching, synchronizing và updating dữ liệu từ server. Tự động quản lý loading, error states.                               |
| **Quản lý State từ Client**   | **Zustand**                      | Thư viện quản lý state global nhỏ gọn, đơn giản, hiệu năng cao, dùng cho các state giao diện chung không phụ thuộc server.                               |
| **Quản lý Forms**             | **React Hook Form**              | Tối ưu hiệu năng cho việc quản lý form phức tạp, dễ dàng tích hợp validation.                                                                            |
| **Validation Schema**         | **Zod**                          | Thư viện schema-first giúp định nghĩa và kiểm tra kiểu dữ liệu một cách an toàn, hoạt động tốt với TypeScript, React Hook Form và Supabase.              |
| **Thông báo (Notifications)** | **Shadcn/UI Toast (Sonner)**     | Thư viện toast notification nhẹ, đơn giản và đẹp mắt, được tích hợp sẵn trong bộ component của Shadcn/UI để cung cấp phản hồi cho người dùng.            |
| **Xử lý Excel**               | **SheetJS (xlsx)**               | Thư viện tiêu chuẩn để đọc và ghi file Excel, cần thiết cho tính năng Import/Export.                                                                     |
| **Xử lý Thời gian**           | **date-fns**                     | Thư viện tiện ích hiện đại, mạnh mẽ và "tree-shakeable" để xử lý các tác vụ liên quan đến ngày tháng.                                                    |
| **Code Quality**              | **ESLint & Prettier**            | Bộ đôi công cụ giúp đảm bảo code tuân thủ các quy tắc chung và có định dạng đồng nhất trong toàn bộ dự án.                                               |
| **Tiện ích**                  | **clsx, tailwind-merge**         | Các thư viện nhỏ giúp quản lý và hợp nhất các class name của Tailwind CSS một cách thông minh.                                                           |
