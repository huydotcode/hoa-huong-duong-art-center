import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Header } from "@/components/layout/header";
import { UserNav } from "@/components/layout/user-nav";
import { Welcome } from "@/components/layout/welcome";
import { ADMIN_NAV_ITEMS } from "@/constants/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header trải dài toàn bộ màn hình */}
      <Header
        navItems={ADMIN_NAV_ITEMS}
        userNav={<UserNav />}
        welcome={<Welcome />}
      />

      {/* Sidebar và Main content */}
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 bg-white p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
