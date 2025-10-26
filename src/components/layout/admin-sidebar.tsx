"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_ITEMS } from "@/constants/navigation";
import { Button } from "@/components/ui/button";

interface NavContentProps {
  onLinkClick?: () => void;
}

function NavContent({ onLinkClick }: NavContentProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 p-4">
      {ADMIN_NAV_ITEMS.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={pathname.startsWith(item.href) ? "secondary" : "ghost"}
          className="justify-start"
          onClick={onLinkClick}
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  return (
    // Desktop Sidebar only
    <aside className="hidden w-64 flex-col border-r bg-background lg:flex">
      <NavContent />
    </aside>
  );
}
