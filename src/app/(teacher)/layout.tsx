import { TeacherSidebar } from "@/components/layout/teacher-sidebar";
import { Header } from "@/components/layout/header";
import { UserNav } from "@/components/layout/user-nav";
import { Welcome } from "@/components/layout/welcome";
import { TEACHER_NAV_ITEMS } from "@/lib/constants/navigation";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen max-w-[100vw]">
      {/* Header trải dài toàn bộ màn hình */}
      <Header
        navItems={TEACHER_NAV_ITEMS}
        userNav={<UserNav />}
        welcome={<Welcome />}
      />

      {/* Sidebar và Main content */}
      <div className="mt-14 max-w-[100vw]">
        <TeacherSidebar />
        <main className="w-full lg:ml-64 lg:max-w-[calc(100vw-280px)] max-w-[100vw] overflow-x-hidden">
          <div className="p-4 sm:p-6 mx-auto w-full lg:w-[calc(100vw-256px)] overflow-x-hidden">
            <div className="max-w-[1500px] mx-auto">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
