# Hoa Hướng Dương Piano - Management System

Hệ thống quản lý toàn diện cho trung tâm dạy nhạc Hoa Hướng Dương Piano, được xây dựng với Next.js, Supabase và Tailwind CSS.

## 📖 Giới thiệu

Ứng dụng được thiết kế để tối ưu hóa quy trình quản lý của trung tâm, giúp kết nối hiệu quả giữa Quản trị viên (Admin), Giáo viên và Phụ huynh. Hệ thống cung cấp các công cụ mạnh mẽ để quản lý lớp học, học phí, điểm danh và báo cáo tài chính.

### ✨ Tính năng chính

- **Dành cho Admin:**
  - Quản lý thông tin Giáo viên, Học sinh, Lớp học.
  - Theo dõi và quản lý học phí, tự động tính toán doanh thu/lợi nhuận.
  - Điểm danh, tính lương giáo viên tự động.
  - Báo cáo thống kê trực quan (Dashboard).
  - Import/Export dữ liệu Excel.
- **Dành cho Giáo viên:**
  - Xem lịch dạy và danh sách lớp.
  - Điểm danh học sinh.
  - Nhập điểm và đánh giá học sinh.
- **Dành cho Phụ huynh:**
  - Tra cứu quá trình học tập, điểm danh và công nợ học phí (không cần đăng nhập).

## 🛠 Công nghệ sử dụng

Dự án sử dụng các công nghệ hiện đại nhất để đảm bảo hiệu năng và trải nghiệm người dùng:

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [Shadcn/UI](https://ui.shadcn.com/) (Radix UI)
- **Backend & Auth:** [Supabase](https://supabase.com/)
- **State Management:** React Query (Server) & Zustand (Client)
- **Sử lý Forms:** React Hook Form & Zod

## 🚀 Cài đặt và Chạy dự án

### 1. Yêu cầu hệ thống

- Node.js >= 18.0.0
- npm, yarn hoặc pnpm

### 2. Cài đặt dependencies

```bash
npm install
# hoặc
yarn install
# hoặc
pnpm install
```

### 3. Cấu hình môi trường

Tạo file `.env.local` tại thư mục gốc và điền các thông tin cấu hình (tham khảo `.env.example`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth (Admin Login)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

> **Lưu ý:** Bạn cần tạo project trên Supabase và cấu hình Authentication (Google, Phone) cũng như Database trước khi chạy. Xem chi tiết tại [docs/8_SETUP_GUIDE.md](docs/8_SETUP_GUIDE.md).

### 4. Chạy Development Server

```bash
npm run dev
```

Truy cập [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## 📚 Tài liệu dự án

Tài liệu chi tiết về dự án được lưu trong thư mục `docs/`:

- [`1_BUSINESS_LOGIC.md`](docs/1_BUSINESS_LOGIC.md): Phân tích nghiệp vụ chi tiết.
- [`2_TECHNOLOGY_STACK.md`](docs/2_TECHNOLOGY_STACK.md): Chi tiết về công nghệ sử dụng.
- [`4_DATABASE_SCHEMA.md`](docs/4_DATABASE_SCHEMA.md): Thiết kế cơ sở dữ liệu.
- [`8_SETUP_GUIDE.md`](docs/8_SETUP_GUIDE.md): Hướng dẫn cài đặt chi tiết từ A-Z.
- [`9_DATABASE_SETUP_SQL.md`](docs/9_DATABASE_SETUP_SQL.md): Script SQL khởi tạo database.

## 📂 Cấu trúc thư mục

```
.
├── docs/                 # Tài liệu dự án
├── public/               # Static assets
├── scripts/              # Utility scripts (seed data, etc.)
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions, hooks, constants
│   ├── types/            # TypeScript type definitions
│   └── ...
├── .env.local            # Environment variables (gitignored)
└── package.json          # Project dependencies
```

## 👥 Đóng góp

Vui lòng đọc kỹ tài liệu nghiệp vụ và tuân thủ các quy tắc coding (ESLint, Prettier) trước khi tạo Pull Request.

---

© 2024 Hoa Hướng Dương Art Center. All rights reserved.
