## Teachers Module Guide (Admin)

This guide documents the Admin Teachers module: UI, routing, data flow, CRUD, caching, and reusable patterns to replicate across other pages.

### Scope and Goals

- Manage teachers: list, search, create, update.
- Fast, responsive UI with partial reloads and good skeleton states.
- Clean separation of concerns: layout vs page, server vs client, services vs UI.

## Routing and Structure

- Route: `/admin/teachers`
  - `src/app/(admin)/admin/teachers/layout.tsx`: page frame (title, actions, search, Suspense)
  - `src/app/(admin)/admin/teachers/page.tsx`: server component rendering list (cards on mobile, table on desktop)
  - `src/app/(admin)/admin/teachers/loading.tsx`: list-level skeleton for partial loading
  - `src/app/(admin)/admin/teachers/_components/`: page-only client components (e.g., `teachers-search-bar.tsx`)
- Shared components live in `src/components/shared` with `index.ts` barrel exports.

## Component Roles

- `layout.tsx` (Server):
  - Renders page title, actions (Create, Refresh), search bar.
  - Wraps `{children}` with `Suspense` and `TeachersListSkeleton` for partial loading.
- `page.tsx` (Server):
  - Reads `searchParams` (currently `q` for search).
  - Fetches data via service `getTeachers(q)`.
  - Renders notice text when searching: “Đang tìm danh sách giáo viên theo: q”.
  - Mobile: card list; Desktop: table.
- `_components/teachers-search-bar.tsx` (Client):
  - Manages `q` with `router.replace` inside `startTransition`.
  - “Hiện tất cả” clears `q` without full reload.
- `components/shared/refresh-button.tsx` (Client):
  - Uses `router.refresh()` to re-fetch data without full page reload.

## Data Layer and Services

- Service: `src/lib/services/admin-teachers-service.ts`
  - `getTeachers(query?: string)`: server-side fetch; supports `ilike` for name/phone.
  - `createTeacher(data, path?)`: creates Supabase Auth user (Admin API) + inserts into `teachers`; calls `revalidatePath(path)`.
  - `updateTeacher(id, data, path?)`: updates row; calls `revalidatePath(path)`.
- Types: `src/types/database.ts` and `src/types/index.ts` provide `Teacher`, `CreateTeacherData`, `UpdateTeacherData`.

## Authentication and Authorization

- Access control enforced via `src/proxy.ts` middleware: Admin-only sections.
- Public routes: `/parent`, search for parents.
- Never expose service keys to client. Auth user creation runs server-side only.

## UI/UX Patterns

- Search and Refresh
  - Search is client-side navigation: `router.replace(pathname + ?q=...)` so no full reload.
  - Refresh uses `router.refresh()` instead of `window.location.reload()`.
  - Keep the current `searchParams` intact for UX continuity.
- Loading States
  - Partial loading with `Suspense` around `{children}` and a list-specific skeleton (`TeachersListSkeleton`).
- Responsive List
  - Mobile: card view, concise, action icons only, truncate notes.
  - Desktop: table view with full columns and actions.
- Forms and Inputs
  - Disable autocomplete (`autoComplete="off"`) on forms and inputs.
  - Use `PasswordInput` (show/hide) for password fields.
  - Clear, short placeholders (e.g., “Tìm giáo viên...”)

## CRUD Flows

- Create Teacher
  1. Open `CreateTeacherForm` (client) from layout action.
  2. Validate with Zod (`createTeacherSchema`).
  3. Call server action/service: create Supabase Auth user (role=teacher) + insert into `teachers`.
  4. On success: `revalidatePath(currentPath)` and optionally close dialog; client may call `router.refresh()`.
  5. Handle duplicate phone with specific error messages.
- Update Teacher
  1. Trigger `UpdateTeacherForm` from each row/card.
  2. Validate with Zod (`updateTeacherSchema`).
  3. Update via service; `revalidatePath(currentPath)` then `router.refresh()` from client.
- Delete/Deactivate (planned)
  - Prefer soft delete via `is_active=false`. Provide quick toggle action.

## Caching and Revalidation

- Server actions/services call `revalidatePath(path)` after mutations to keep lists in sync.
- Client triggers `router.refresh()` to refetch current route with applied `searchParams`.

## Accessibility and Semantics

- Search: add `aria-label` on condensed buttons (planned).
- Status badges: add `title` attribute (planned).
- Buttons have clear labels on desktop, icon-only on mobile.

## Error Handling

- Display form-level and field-level validation messages.
- Dedicated duplicate phone error for `createTeacher`.
- Toasts for success/failure on client where appropriate.

## Future Enhancements (Roadmap)

- Sorting via `searchParams` (name, salary_per_session, active status) with sortable table headers.
- Quick filters for Active/Inactive next to search bar.
- Quick actions: Toggle active status on row/card.
- Pagination or "Load more" for large lists.
- Salary input UX: formatting, prevent negatives, locale-aware.
- Ensure `ADMIN_NAV_ITEMS` paths sync with route structure.
- Verify and harden role-based protection for `/admin/teachers`.

## Files Overview (Key)

- `src/app/(admin)/admin/teachers/layout.tsx`
- `src/app/(admin)/admin/teachers/page.tsx`
- `src/app/(admin)/admin/teachers/loading.tsx`
- `src/app/(admin)/admin/teachers/_components/teachers-search-bar.tsx`
- `src/components/shared/refresh-button.tsx`
- `src/components/forms/create-teacher-form.tsx`
- `src/components/forms/update-teacher-form.tsx`
- `src/lib/services/admin-teachers-service.ts`
- `src/types/database.ts`, `src/types/index.ts`

## Copy-Paste Checklist for New Modules

- Create route folder with `layout.tsx`, `page.tsx`, `loading.tsx`, `_components/`.
- Put page-only clients in `_components`, shared clients in `components/shared`.
- Use `Suspense` with list-specific skeleton.
- Use client search with `router.replace`; add “Show all” action.
- Use `router.refresh()` for refresh; use `revalidatePath(path)` after server mutations.
- Keep forms with `autoComplete="off"`, Zod validation, friendly errors.
- Mobile card + desktop table pattern; truncate long text.
