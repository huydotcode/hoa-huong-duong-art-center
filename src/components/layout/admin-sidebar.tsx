"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_ITEMS } from "@/lib/constants/navigation";
import { Button } from "@/components/ui/button";

interface NavContentProps {
  onLinkClick?: () => void;
}

function NavContent({ onLinkClick }: NavContentProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 p-4">
      {ADMIN_NAV_ITEMS.map((item) => {
        // Check exact match first
        if (pathname === item.href) {
          return (
            <Button
              key={item.href}
              asChild
              variant="secondary"
              className="justify-start"
              onClick={onLinkClick}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          );
        }

        // Check if pathname starts with this item's href + "/"
        // But only if no other item has an exact match or is a more specific match
        const isSubRoute = pathname.startsWith(item.href + "/");

        // Check if there's a more specific route that matches
        const hasMoreSpecificMatch = ADMIN_NAV_ITEMS.some(
          (otherItem) =>
            otherItem.href !== item.href &&
            pathname.startsWith(otherItem.href) &&
            otherItem.href.length > item.href.length
        );

        const isActive = isSubRoute && !hasMoreSpecificMatch;

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

export function AdminSidebar() {
  return (
    // Desktop Sidebar only
    <aside className="hidden w-64 flex-col border-r bg-background lg:flex fixed top-14 left-0 h-screen">
      <NavContent />
    </aside>
  );
}
