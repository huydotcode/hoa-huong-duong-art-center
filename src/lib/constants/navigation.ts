export interface NavItem {
  href: string;
  label: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Tổng quan" },
  { href: "/admin/teachers", label: "Giáo viên" },
  { href: "/admin/teachers/salary", label: "Lương giáo viên" },
  { href: "/admin/students", label: "Học sinh" },
  { href: "/admin/classes", label: "Lớp học" },
  { href: "/admin/tuition", label: "Học phí" },
  { href: "/admin/expenses", label: "Chi phí" },
  { href: "/admin/attendance", label: "Điểm danh" },
  { href: "/admin/reports", label: "Báo cáo" },
];

export const TEACHER_NAV_ITEMS: NavItem[] = [
  { href: "/teacher", label: "Tổng quan" },
  { href: "/teacher/classes", label: "Lớp học" },
  { href: "/teacher/attendance", label: "Điểm danh" },
];
