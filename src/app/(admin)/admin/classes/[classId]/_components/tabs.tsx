"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClassDetailTabs({ classId }: { classId: string }) {
  const pathname = usePathname();
  const base = `/admin/classes/${classId}`;
  const items = [
    { key: "overview", label: "Tổng quan", href: `${base}/overview` },
    { key: "teachers", label: "Giáo viên", href: `${base}/teachers` },
    { key: "students", label: "Học sinh", href: `${base}/students` },
    { key: "attendance", label: "Điểm danh", href: `${base}/attendance` },
  ];

  return (
    <Card className="mb-3 border-0 shadow-none md:mx-0 p-0 bg-transparent">
      <CardContent className="p-0 bg-transparent">
        <div className="-mx-3 px-3 md:mx-0 md:px-0 overflow-x-auto md:overflow-visible">
          <div className="flex w-max gap-2 rounded-md p-2 border-secondary border-2">
            {items.map((t) => {
              const active = pathname?.startsWith(t.href);
              return (
                <Link key={t.key} href={t.href}>
                  <Button
                    size="sm"
                    variant={active ? "secondary" : "ghost"}
                    className="px-3 shrink-0"
                  >
                    {t.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
