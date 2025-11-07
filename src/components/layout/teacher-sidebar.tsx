"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { TEACHER_NAV_ITEMS } from "@/lib/constants/navigation";
import { Button } from "@/components/ui/button";

interface NavContentProps {
  onLinkClick?: () => void;
}

function NavContent({ onLinkClick }: NavContentProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 p-4">
      {TEACHER_NAV_ITEMS.map((item) => {
        // Chỉ active khi exact match hoặc là sub-route (có "/" sau href)
        // Tránh trường hợp "/teacher" match với "/teacher/classes"
        const isActive =
          pathname === item.href ||
          (pathname.startsWith(item.href + "/") && item.href !== "/teacher");

        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "secondary" : "ghost"}
            className="justify-start"
            onClick={onLinkClick}
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function TeacherSidebar() {
  return (
    // Desktop Sidebar only
    <aside className="hidden w-64 flex-col border-r bg-background lg:flex fixed top-14 left-0 h-screen">
      <NavContent />
    </aside>
  );
}

