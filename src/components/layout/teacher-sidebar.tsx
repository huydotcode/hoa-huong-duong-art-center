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
        const normalize = (value: string) => {
          if (value.length > 1 && value.endsWith("/")) {
            return value.slice(0, -1);
          }
          return value;
        };

        const currentPath = normalize(pathname);
        const itemHref = normalize(item.href);
        const isRootLink = itemHref === "/teacher";

        const isExactMatch = currentPath === itemHref;
        const isSubRoute =
          !isRootLink && currentPath.startsWith(`${itemHref}/`);

        const isActive = isExactMatch || isSubRoute;

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
