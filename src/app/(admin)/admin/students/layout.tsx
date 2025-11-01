import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { RefreshButton } from "@/components/shared";
import StudentsSearchBar from "./_components/students-search-bar";
import { StudentsListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { CreateStudentForm } from "@/components/forms";
import { Plus } from "lucide-react";

export default function StudentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Quản lý học sinh</h1>
        <div className="flex gap-2">
          <CreateStudentForm>
            <Button size="sm" className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4" />
              Thêm học sinh
            </Button>
          </CreateStudentForm>
          <RefreshButton />
        </div>
      </div>
      <Card>
        <CardHeader className="px-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Danh sách học sinh</CardTitle>
            <StudentsSearchBar />
          </div>
        </CardHeader>
        <Suspense fallback={<StudentsListSkeleton />}>{children}</Suspense>
      </Card>
    </div>
  );
}
