# Hướng dẫn Setup Dự án - Piano Management System

Hướng dẫn này giúp bạn thiết lập môi trường phát triển và chạy ứng dụng Quản lý Trung tâm Piano từ đầu.

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt Dependencies](#2-cài-đặt-dependencies)
3. [Cấu hình Environment Variables](#3-cấu-hình-environment-variables)
4. [Thiết lập Supabase](#4-thiết-lập-supabase)
5. [Cấu hình UI Components](#5-cấu-hình-ui-components)
6. [Setup Database](#6-setup-database)
7. [Chạy dự án](#7-chạy-dự-án)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Yêu cầu hệ thống

### Phần mềm cần thiết:

- **Node.js**: >= 18.0.0
- **npm** hoặc **yarn** hoặc **pnpm**
- **Git**

### Công cụ khuyến nghị:

- **VS Code** (hoặc IDE tùy chọn)
- **Google Chrome** (để test ứng dụng)

---

## 2. Cài đặt Dependencies

### Bước 1: Khởi tạo Next.js project

```bash
# Tạo project Next.js với TypeScript và Tailwind CSS
npx create-next-app@latest piano-management-system \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd piano-management-system
```

### Bước 2: Cài đặt dependencies chính

```bash
# Supabase client
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/ssr

# React Query (Tanstack Query)
npm install @tanstack/react-query @tanstack/react-query-devtools

# Zustand (State management)
npm install zustand

# React Hook Form + Zod validation
npm install react-hook-form @hookform/resolvers zod

# UI Components (Shadcn/UI)
npm install class-variance-authority clsx tailwind-merge

# Date utilities
npm install date-fns

# Excel utilities
npm install xlsx

# Icons (Lucide React)
npm install lucide-react

# Type cho SheetJS
npm install -D @types/xlsx
```

### Bước 3: Cài đặt dev dependencies

```bash
npm install -D prettier prettier-plugin-tailwindcss
npm install -D @types/node
```

### Bước 4: Verify PostCSS config

Đảm bảo `postcss.config.mjs` có nội dung:

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

**Lưu ý:** Tailwind CSS v4 sử dụng PostCSS plugin mới `@tailwindcss/postcss` thay vì `tailwindcss` package cũ.

---

## 3. Cấu hình Environment Variables

### Tạo file `.env.local` trong thư mục gốc:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth (cho Admin login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Tạo file `.env.example` để làm mẫu:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**Lưu ý:** `.env.local` không được commit lên Git. Đảm bảo file này trong `.gitignore`.

---

## 4. Thiết lập Supabase

### Bước 1: Tạo tài khoản Supabase

1. Truy cập https://supabase.com
2. Đăng ký tài khoản (miễn phí)
3. Tạo project mới

### Bước 2: Lấy credentials

1. Vào **Project Settings** > **API**
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### Bước 3: Cấu hình Authentication

1.  Vào **Authentication** > **Providers**
2.  **Enable Email** provider
3.  **Enable Phone** provider.
    - **Lưu ý quan trọng**: Supabase có thể sẽ yêu cầu bạn cấu hình một nhà cung cấp SMS (như Twilio). Để bỏ qua bước này, bạn có thể chọn một nhà cung cấp bất kỳ (ví dụ: Twilio) và nhập các giá trị giả (ví dụ: `dummy` hoặc `123`) vào các trường `Account SID` và `Auth Token`. Sau đó lưu lại.
    - Hệ thống của chúng ta không sử dụng OTP nên không cần đến dịch vụ SMS thật.
4.  **Enable Google** provider (cho Admin login)
5.  Thêm Google OAuth credentials:
    - Client ID
    - Client Secret
    - Redirect URL: `http://localhost:3000/api/auth/callback`

### Bước 4: Setup Google OAuth

1. Truy cập https://console.cloud.google.com
2. Tạo project mới
3. **APIs & Services** > **Credentials** > **Create OAuth 2.0 Client ID**
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback`
5. Copy Client ID và Client Secret → thêm vào `.env.local`

---

## 5. Cấu hình UI Components

### Bước 1: Setup Tailwind CSS v4

Tailwind CSS v4 sử dụng cách tiếp cận khác so với v3 - không cần `tailwind.config.ts` mà sử dụng CSS variables và `@theme` directive.

#### Cập nhật file `src/app/globals.css`:

```css
@import "tailwindcss";

/* Piano Theme - Tone Vàng Kem */
@theme {
  /* Colors - Background & Foreground */
  --color-background: #fefcf0;
  --color-foreground: #2c3e50;

  /* Colors - Primary (Vàng tươi) */
  --color-primary: #e6a85c;
  --color-primary-foreground: #ffffff;

  /* Colors - Secondary (Vàng kem) */
  --color-secondary: #f7e7b5;
  --color-secondary-foreground: #2c3e50;

  /* Colors - Accent (Kem nhạt) */
  --color-accent: #fefcf0;
  --color-accent-foreground: #2c3e50;

  /* Colors - Muted (Xám nhạt) */
  --color-muted: rgb(245 247 248);
  --color-muted-foreground: rgb(90 108 125);

  /* Colors - Card */
  --color-card: #ffffff;
  --color-card-foreground: #2c3e50;

  /* Colors - Status */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Colors - Border */
  --color-border: #f7e7b5;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  /* Font - Be Vietnam Pro */
  --font-sans: var(--font-be-vietnam-pro);
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

### Bước 2: Setup Shadcn/UI

Shadcn/UI đã được khởi tạo sẵn với file `components.json`.

**Các component cần sử dụng trong dự án:**

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add table
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add alert-dialog
npx shadcn@latest add form
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add badge
npx shadcn@latest add skeleton
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sheet
npx shadcn@latest add toast
```

**Lưu ý:** Chỉ cài component khi thực sự cần sử dụng. Ưu tiên các component cần thiết cho authentication và CRUD operations trước.

### Bước 3: Import Be Vietnam Pro font

File `src/app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});

export const metadata = {
  title: "Piano Management System",
  description: "Hệ thống quản lý trung tâm piano",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${beVietnamPro.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

**Lưu ý:** Tailwind CSS v4 không cần `tailwind.config.ts` nữa. Tất cả theme được define trong CSS thông qua `@theme` directive.

#### Cách sử dụng màu sắc trong components:

Sau khi setup, bạn có thể sử dụng các class Tailwind:

```tsx
// Background colors
<div className="bg-background">Background kem nhạt</div>
<div className="bg-primary">Background vàng tươi</div>
<div className="bg-secondary">Background vàng kem</div>
<div className="bg-accent">Background kem nhạt</div>
<div className="bg-card">Background trắng</div>

// Text colors
<div className="text-foreground">Text xám đậm</div>
<div className="text-primary-foreground">Text trắng</div>
<div className="text-muted-foreground">Text xám nhạt</div>

// Border colors
<div className="border-border">Border vàng kem</div>

// Status colors
<div className="text-success">Success - Xanh lá</div>
<div className="text-warning">Warning - Cam</div>
<div className="text-error">Error - Đỏ</div>

// Border radius
<div className="rounded-sm">Small radius</div>
<div className="rounded-md">Medium radius</div>
<div className="rounded-lg">Large radius</div>
```

## 6. Setup Database

### Bước 1: Tạo Database Schema

1.  Truy cập **Supabase Dashboard** của bạn và đi đến mục **SQL Editor**.
2.  Tạo một query mới, sau đó copy và chạy toàn bộ kịch bản SQL trong file [**`docs/9_DATABASE_SETUP_SQL.md`**](./9_DATABASE_SETUP_SQL.md).
    - File này chứa tất cả các lệnh `CREATE TABLE` cần thiết để thiết lập database của bạn.

### Bước 2: Setup Row Level Security (RLS)

1.  Sau khi đã tạo bảng, bạn cần bật RLS cho từng bảng để bảo mật dữ liệu.
2.  Tham khảo hướng dẫn chi tiết và các ví dụ về policies trong file [**`docs/9_DATABASE_SETUP_SQL.md`**](./9_DATABASE_SETUP_SQL.md) để cấu hình quyền truy cập cho Admin và Teacher.

### Bước 3: Seed Data (Tùy chọn)

Để có dữ liệu mẫu cho việc phát triển, bạn có thể chạy kịch bản "seed".

1.  **Kiểm tra file kịch bản**:
    - Một file kịch bản chi tiết đã được tạo tại `scripts/seed.ts`.
    - File này sẽ xóa dữ liệu cũ và thêm vào các giáo viên, học sinh, lớp học mẫu cùng các dữ liệu liên quan.

2.  **Chạy lệnh seed**:
    - Mở terminal và chạy lệnh sau:
      ```bash
      npm run seed
      ```
    - Quá trình này sẽ kết nối đến Supabase (sử dụng credentials từ `.env.local`) và điền dữ liệu vào database của bạn.

**Lưu ý:** Lệnh `seed` đã được cấu hình sẵn trong `package.json` để thực thi file `scripts/seed.ts` bằng `tsx`.

---

## 7. Chạy dự án

### Development mode:

```bash
# Chạy dev server
npm run dev

# Hoặc với pnpm
pnpm dev

# Hoặc với yarn
yarn dev
```

Mở browser: http://localhost:3000

### Build production:

```bash
# Build production
npm run build

# Start production server
npm start
```

---

## 8. Troubleshooting

### Lỗi thường gặp:

#### 1. Supabase connection failed

**Giải pháp:**

- Kiểm tra `.env.local` có đúng credentials
- Kiểm tra Supabase project đang active
- Kiểm tra network connection

#### 2. Module not found errors

**Giải pháp:**

```bash
# Xóa node_modules và reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. TypeScript errors

**Giải pháp:**

- Đảm bảo tất cả dependencies đã được install
- Restart TypeScript server trong VS Code (Ctrl+Shift+P > "TypeScript: Restart TS Server")

#### 4. Tailwind không apply styles

**Giải pháp:**

- Đảm bảo `postcss.config.mjs` có plugin `@tailwindcss/postcss`
- Kiểm tra `globals.css` có `@import "tailwindcss";` ở đầu file
- Kiểm tra `@theme inline` directive đã được define
- Restart dev server
- **Lưu ý:** Tailwind CSS v4 không dùng `tailwind.config.ts` nữa, theme được define trong CSS

#### 5. Shadcn/UI components không hoạt động

**Giải pháp:**

- Kiểm tra `components.json` được tạo đúng
- Đảm bảo `tailwind.config.ts` extend colors từ Shadcn
- Reinstall components: `npx shadcn-ui@latest add [component-name]`

### Cần hỗ trợ thêm?

Xem các tài liệu tham khảo:

- `docs/1_BUSINESS_LOGIC.md` - Nghiệp vụ
- `docs/2_TECHNOLOGY_STACK.md` - Công nghệ
- `docs/3_AI_RULE.md` - Quy tắc làm việc
- `docs/4_DATABASE_SCHEMA.md` - Schema database
- `docs/5_PROJECT_STRUCTURE.md` - Cấu trúc project
- `docs/6_AUTH_FLOW.md` - Authentication flow
- `docs/7_UI_UX_FLOW.md` - UI/UX design

---

## Checklist Setup

Trước khi bắt đầu code, đảm bảo:

- [x] Node.js >= 18.0.0 đã cài đặt
- [x] Dependencies đã được install
- [ ] `.env.local` đã được cấu hình (cần fill Supabase credentials)
- [ ] Supabase project đã tạo
- [ ] Database schema đã được setup
- [ ] RLS policies đã được cấu hình
- [x] Tailwind CSS v4 đã được cấu hình với theme màu vàng kem
- [x] Be Vietnam Pro font đã được setup
- [x] Development server chạy được ở http://localhost:3000
- [x] Đã đọc các tài liệu trong `docs/`

**Các component Shadcn/UI sẽ cần:**

- button, input, table, card, dialog, alert-dialog, form, label, select (bắt buộc)
- badge, skeleton, calendar, popover, dropdown-menu, sheet (khi cần)

---

## Next Steps

Sau khi setup thành công, tiếp tục với:

1. **Authentication System**
   - Admin login (Google)
   - Teacher login (Phone + Password)
   - Session management

2. **Admin Dashboard**
   - Stats overview
   - Charts visualization

3. **CRUD Operations**
   - Teachers management
   - Students management
   - Classes management

4. **Advanced Features**
   - Payment tracking
   - Attendance system
   - Financial reports

Chúc bạn thành công! 🎹✨
