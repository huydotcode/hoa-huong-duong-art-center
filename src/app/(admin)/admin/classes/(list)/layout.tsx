import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { RefreshButton } from "@/components/shared";
import { ClassesListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateClassForm } from "@/components/forms/create-class-form";
import ClassesSearchBar from "../_components/classes-search-bar";

export default function ClassesListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Quản lý lớp học</h1>
        <div className="flex gap-2">
          <CreateClassForm>
            <Button size="sm" className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4" />
              Thêm lớp học
            </Button>
          </CreateClassForm>
          <RefreshButton />
        </div>
      </div>
      <Card>
        <CardHeader className="px-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Danh sách lớp học</CardTitle>
            <ClassesSearchBar />
          </div>
        </CardHeader>
        <Suspense fallback={<ClassesListSkeleton />}>{children}</Suspense>
      </Card>
    </div>
  );
}
