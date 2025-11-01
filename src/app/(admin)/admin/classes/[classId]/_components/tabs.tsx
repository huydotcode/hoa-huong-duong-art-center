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
  ];

  return (
    <Card className="mb-3 border-0 shadow-none md:mx-0 p-0 md:p-0">
      <CardContent className="p-0">
        <div className="inline-flex gap-2 rounded-md bg-muted">
          {items.map((t) => {
            const active = pathname?.startsWith(t.href);
            return (
              <Link key={t.key} href={t.href}>
                <Button
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                  className="px-3"
                >
                  {t.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
