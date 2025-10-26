"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { ADMIN_NAV_ITEMS, type NavItem } from "@/constants/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface HeaderProps {
  navItems?: NavItem[];
  userNav?: React.ReactNode;
  welcome?: React.ReactNode;
}

export function Header({
  navItems = ADMIN_NAV_ITEMS,
  userNav,
  welcome,
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-b bg-secondary">
      <div className="flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/assets/images/logo.png"
            alt="Hoa Hướng Dương - Art Center"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          {/* Hiển thị "HHD" trên mobile, "Hoa Hướng Dương" trên desktop */}
          <span className="hidden text-lg font-bold sm:block">
            Hoa Hướng Dương
          </span>
          <span className="text-lg font-bold sm:hidden">HHD</span>
        </Link>

        {/* Right side */}
        {userNav && (
          <div className="ml-auto flex items-center space-x-2 lg:space-x-4">
            {/* Welcome message - Desktop only */}
            {welcome && <div className="hidden lg:flex">{welcome}</div>}

            {/* Mobile Menu */}
            {navItems && navItems.length > 0 && (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="p-4">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 p-4">
                    {navItems.map((item) => (
                      <Button
                        key={item.href}
                        asChild
                        variant={
                          pathname.startsWith(item.href) ? "secondary" : "ghost"
                        }
                        className="justify-start"
                        onClick={() => setIsOpen(false)}
                      >
                        <Link href={item.href}>{item.label}</Link>
                      </Button>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            {userNav}
          </div>
        )}
      </div>
    </header>
  );
}
