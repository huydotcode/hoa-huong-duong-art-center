# Cấu trúc dự án - Project Structure

Tài liệu này mô tả cấu trúc thư mục và tổ chức code của dự án.

## 1. Tổng quan

Dự án sử dụng cấu trúc Next.js mặc định với App Router, tổ chức theo module (Admin, Teacher, Parent) và chia components theo loại.

## 2. Cấu trúc thư mục chi tiết

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Route group cho Authentication
│   │   ├── login/
│   │   │   ├── page.tsx         # Trang đăng nhập (phân biệt Admin/Teacher)
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   │
│   ├── (admin)/                 # Route group cho Admin
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Dashboard với tổng quan thống kê
│   │   ├── teachers/
│   │   │   ├── page.tsx         # Danh sách giáo viên
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Chi tiết giáo viên
│   │   ├── students/
│   │   │   ├── page.tsx         # Danh sách học sinh
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Chi tiết học sinh
│   │   ├── classes/
│   │   │   ├── page.tsx         # Danh sách lớp học
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Chi tiết lớp + danh sách học sinh
│   │   ├── expenses/
│   │   │   └── page.tsx         # Quản lý chi phí
│   │   ├── attendance/
│   │   │   └── page.tsx         # Điểm danh giáo viên và học sinh
│   │   └── layout.tsx            # Layout riêng cho Admin (sidebar + header)
│   │
│   ├── (teacher)/               # Route group cho Teacher
│   │   ├── classes/
│   │   │   └── page.tsx         # Danh sách lớp của teacher
│   │   ├── classes/[id]/
│   │   │   └── page.tsx         # Chi tiết lớp (điểm danh, nhập điểm)
│   │   └── layout.tsx            # Layout riêng cho Teacher
│   │
│   ├── (parent)/                # Route group cho Phụ huynh (không cần đăng nhập)
│   │   ├── search/
│   │   │   └── page.tsx         # Trang tra cứu thông tin học sinh
│   │   └── layout.tsx
│   │
│   ├── api/                     # API Routes (nếu cần)
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts      # Supabase auth callback
│   │
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Homepage (redirect theo role)
│
├── components/                  # React Components
│   ├── ui/                     # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   └── ...                  # Các components khác từ Shadcn
│   │
│   ├── forms/                  # Form components chung
│   │   ├── login-form.tsx
│   │   ├── student-form.tsx
│   │   ├── teacher-form.tsx
│   │   └── class-form.tsx
│   │
│   ├── admin/                  # Components riêng của Admin
│   │   ├── teacher-table.tsx
│   │   ├── student-table.tsx
│   │   ├── class-card.tsx
│   │   ├── expense-form.tsx
│   │   ├── attendance-form.tsx
│   │   ├── dashboard-stats.tsx
│   │   └── monthly-report.tsx
│   │
│   ├── teacher/                # Components riêng của Teacher
│   │   ├── attendance-form.tsx
│   │   ├── grade-form.tsx
│   │   ├── class-list.tsx
│   │   └── student-attendance.tsx
│   │
│   ├── parent/                 # Components riêng của Phụ huynh
│   │   ├── search-form.tsx
│   │   └── student-info.tsx
│   │
│   └── layout/                 # Layout components
│       ├── admin-sidebar.tsx
│       ├── admin-header.tsx
│       ├── teacher-sidebar.tsx
│       └── teacher-header.tsx
│
├── lib/                        # Utilities & helpers
│   ├── supabase/
│   │   ├── client.ts           # Supabase client (client-side)
│   │   ├── server.ts           # Supabase client (server-side)
│   │   └── middleware.ts       # Supabase middleware
│   │
│   ├── types/                  # TypeScript types
│   │   ├── database.ts         # Database types (từ Supabase)
│   │   └── index.ts
│   │
│   ├── hooks/                  # Custom hooks đơn giản
│   │   └── use-auth.ts
│   │
│   ├── repositories/           # Database operations (CRUD)
│   │   ├── students.repository.ts
│   │   ├── teachers.repository.ts
│   │   ├── classes.repository.ts
│   │   ├── payments.repository.ts
│   │   ├── attendance.repository.ts
│   │   └── expenses.repository.ts
│   │
│   ├── queries/                # Tanstack Query hooks
│   │   ├── query-keys.ts       # Query keys tập trung
│   │   ├── students/
│   │   │   ├── use-students.ts
│   │   │   ├── use-student.ts
│   │   │   ├── use-create-student.ts
│   │   │   ├── use-update-student.ts
│   │   │   └── use-delete-student.ts
│   │   │
│   │   ├── teachers/
│   │   │   ├── use-teachers.ts
│   │   │   ├── use-teacher.ts
│   │   │   ├── use-create-teacher.ts
│   │   │   ├── use-update-teacher.ts
│   │   │   └── use-delete-teacher.ts
│   │   │
│   │   ├── classes/
│   │   ├── payments/
│   │   ├── attendance/
│   │   └── expenses/
│   │
│   ├── utils/                  # Pure utility functions
│   │   ├── cn.ts               # clsx + tailwind-merge
│   │   ├── date.ts             # date-fns helpers
│   │   ├── currency.ts         # Format tiền tệ VNĐ
│   │   └── excel.ts            # Import/Export Excel helpers
│   │
│   └── validations/            # Zod schemas
│       ├── student.ts
│       ├── teacher.ts
│       ├── class.ts
│       ├── payment.ts
│       └── index.ts
│
├── store/                      # Zustand stores
│   ├── auth-store.ts           # Auth state management
│   └── ui-store.ts             # UI state (sidebar, theme, etc.)
│
└── config/                     # Config files
    ├── env.ts                  # Environment variables
    └── constants.ts            # Constants
```

## 3. Chi tiết các phần quan trọng

### 3.1. Route Groups `(auth)`, `(admin)`, `(teacher)`, `(parent)`

- Route groups trong Next.js không tạo URL segment.
- Dùng để tổ chức và áp dụng layout riêng cho từng module.
- Ví dụ: URL `/dashboard` thay vì `/admin/dashboard`.

### 3.2. Quản lý Queries từ Supabase

**Cách tiếp cận:** Tách biệt giữa Database operations (repositories) và Tanstack Query hooks (queries).

**Repository Layer (`lib/repositories/`):**

Chứa tất cả các hàm CRUD cho mỗi entity, tập trung vào database operations.

**Ví dụ file `lib/repositories/students.repository.ts`:**

```typescript
import { supabase } from "@/lib/supabase/client";
import type { StudentInsert, StudentUpdate } from "@/lib/types/database";

export const studentsRepository = {
  // Get all students
  getAll: async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get student by ID
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create student
  create: async (student: StudentInsert) => {
    const { data, error } = await supabase
      .from("students")
      .insert(student)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update student
  update: async (id: string, student: StudentUpdate) => {
    const { data, error } = await supabase
      .from("students")
      .update(student)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete student (soft delete)
  delete: async (id: string) => {
    const { data, error } = await supabase
      .from("students")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
```

**Query Hooks Layer (`lib/queries/`):**

Chứa các Tanstack Query hooks sử dụng repositories.

**Ví dụ file `lib/queries/students/use-students.ts`:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { studentsRepository } from "@/lib/repositories/students.repository";

export const useStudents = () => {
  return useQuery({
    queryKey: ["students"],
    queryFn: studentsRepository.getAll,
  });
};
```

**Ví dụ file `lib/queries/students/use-create-student.ts`:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsRepository } from "@/lib/repositories/students.repository";

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: studentsRepository.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
};
```

**Cách tiếp cận:** Sử dụng Tanstack Query cho cả fetching và mutations, không dùng Server Actions.

**Repository Layer (`lib/repositories/`):**

Chứa tất cả các hàm CRUD cho mỗi entity, tập trung vào database operations.

**Ví dụ file `lib/repositories/students.repository.ts`:**

```typescript
import { supabase } from "@/lib/supabase/client";
import type { StudentInsert, StudentUpdate } from "@/lib/types/database";

export const studentsRepository = {
  // Get all students
  getAll: async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get student by ID
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create student
  create: async (student: StudentInsert) => {
    const { data, error } = await supabase
      .from("students")
      .insert(student)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update student
  update: async (id: string, student: StudentUpdate) => {
    const { data, error } = await supabase
      .from("students")
      .update(student)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete student (soft delete)
  delete: async (id: string) => {
    const { data, error } = await supabase
      .from("students")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
```

**Query Hooks Layer (`lib/queries/`):**

Chứa các Tanstack Query hooks sử dụng repositories cho cả fetching và mutations.

**Ví dụ file `lib/queries/query-keys.ts`:**

```typescript
/**
 * Centralized query keys for Tanstack Query
 * This ensures consistency and prevents typos across the application
 */

export const queryKeys = {
  // Students
  students: {
    all: ["students"] as const,
    lists: () => [...queryKeys.students.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.students.lists(), filters] as const,
    details: () => [...queryKeys.students.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
  },

  // Teachers
  teachers: {
    all: ["teachers"] as const,
    lists: () => [...queryKeys.teachers.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.teachers.lists(), filters] as const,
    details: () => [...queryKeys.teachers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.teachers.details(), id] as const,
  },

  // Classes
  classes: {
    all: ["classes"] as const,
    lists: () => [...queryKeys.classes.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.classes.lists(), filters] as const,
    details: () => [...queryKeys.classes.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.classes.details(), id] as const,
  },

  // Payments
  payments: {
    all: ["payments"] as const,
    lists: () => [...queryKeys.payments.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.payments.lists(), filters] as const,
  },

  // Attendance
  attendance: {
    all: ["attendance"] as const,
    lists: () => [...queryKeys.attendance.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.attendance.lists(), filters] as const,
  },

  // Expenses
  expenses: {
    all: ["expenses"] as const,
    lists: () => [...queryKeys.expenses.all, "list"] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.expenses.lists(), filters] as const,
  },
};
```

**Ví dụ file `lib/queries/students/use-students.ts`:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { studentsRepository } from "@/lib/repositories/students.repository";
import { queryKeys } from "@/lib/queries/query-keys";

export const useStudents = () => {
  return useQuery({
    queryKey: queryKeys.students.all,
    queryFn: studentsRepository.getAll,
  });
};
```

**Ví dụ file `lib/queries/students/use-student.ts`:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { studentsRepository } from "@/lib/repositories/students.repository";
import { queryKeys } from "@/lib/queries/query-keys";

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: () => studentsRepository.getById(id),
    enabled: !!id,
  });
};
```

**Ví dụ file `lib/queries/students/use-create-student.ts`:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsRepository } from "@/lib/repositories/students.repository";
import { queryKeys } from "@/lib/queries/query-keys";

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: studentsRepository.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
};
```

**Ví dụ file `lib/queries/students/use-update-student.ts`:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsRepository } from "@/lib/repositories/students.repository";
import { queryKeys } from "@/lib/queries/query-keys";

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StudentUpdate }) =>
      studentsRepository.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.detail(variables.id),
      });
    },
  });
};
```

**Ví dụ file `lib/queries/students/use-delete-student.ts`:**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsRepository } from "@/lib/repositories/students.repository";
import { queryKeys } from "@/lib/queries/query-keys";

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: studentsRepository.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
    },
  });
};
```

**Ưu điểm của cách này:**

- **Consistency:** Tất cả query keys ở một nơi
- **Type-safe:** TypeScript bắt lỗi khi dùng sai key
- **Prevent typos:** Không thể sai chính tả
- **Easy refactoring:** Dễ đổi tên key
- **Hierarchical:** Cấu trúc có phân cấp (list, detail, filters)

### 3.4. Components

**Chia theo:**

- **Loại** (`components/ui/`, `components/forms/`): Dùng chung cho nhiều module
- **Module** (`components/admin/`, `components/teacher/`): Dùng riêng cho từng module

**Ví dụ:**

- `components/ui/button.tsx` - Dùng chung
- `components/admin/teacher-table.tsx` - Chỉ Admin dùng
- `components/forms/login-form.tsx` - Dùng chung cho cả Admin và Teacher

## 4. Naming conventions

- **Files:** PascalCase cho components (`StudentTable.tsx`), camelCase cho utilities (`formatDate.ts`)
- **Folders:** lowercase với dấu gạch ngang (`student-class-enrollments/`)
- **Components:** PascalCase (`StudentCard`, `TeacherForm`)
- **Hooks:** camelCase với prefix `use` (`useStudents`, `useAuth`)
- **Functions:** camelCase (`getStudents`, `createStudent`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_URL`)

## 5. Lưu ý

- **Tanstack Query:** Dùng cho data fetching và mutations (bao gồm cả useMutation)
- **Zustand:** Dùng cho global state (auth, UI state)
- **Supabase:** Client-side và server-side clients riêng biệt
- **TypeScript:** Type-safe với database types từ Supabase
- **Query Keys:** Được quản lý tập trung trong `lib/queries/query-keys.ts` để tránh lỗi typo và đảm bảo consistency

---

## 6. Tóm tắt

- **Cấu trúc:** Next.js mặc định với route groups
- **Components:** Chia theo loại (chung) và module (riêng)
- **Repositories:** Database operations (CRUD) tập trung trong `lib/repositories/`
- **Queries:** Tanstack Query hooks riêng biệt trong `lib/queries/` (bao gồm cả useMutation)
- **State:** Tanstack Query (server state) + Zustand (client state)
