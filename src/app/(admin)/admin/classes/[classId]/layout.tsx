import { RefreshButton } from "@/components/shared";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getClassById } from "@/lib/services/admin-classes-service";
import ClassDetailTabs from "./_components/tabs";

export default async function ClassDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const cls = await getClassById(classId);
  const name = cls?.name || "Chi tiết lớp học";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link href="/admin/classes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">{name}</h1>
      </div>

      {/* Tabs navigation across detail subroutes */}
      <ClassDetailTabs classId={classId} />

      {/* No card header or search bar on detail page */}
      {children}
    </div>
  );
}
