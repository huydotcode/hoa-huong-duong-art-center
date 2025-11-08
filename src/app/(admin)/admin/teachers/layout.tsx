"use client";

import { CreateTeacherForm } from "@/components/forms/create-teacher-form";
import { RefreshButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

export default function TeachersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSalaryPage = pathname?.startsWith("/admin/teachers/salary");

  return (
    <div className="space-y-6">
      {!isSalaryPage && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">Quản lý giáo viên</h1>
          <div className="flex gap-2">
            <CreateTeacherForm>
              <Button size="sm" className="flex-1 sm:flex-none">
                <Plus className="h-4 w-4" />
                Thêm giáo viên
              </Button>
            </CreateTeacherForm>
            <RefreshButton />
          </div>
        </div>
      )}

      <Card>{children}</Card>
    </div>
  );
}
