import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMonthlyAttendanceMatrix } from "@/lib/services/admin-attendance-service";
import MonthlyAttendanceClient from "./_components/monthly-attendance-client";

function parseMonthYear(value?: string, fallback?: number): number | undefined {
  if (!value) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export default async function MonthlyAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    year?: string;
    classId?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const initialMonth = Math.min(
    12,
    Math.max(
      1,
      parseMonthYear(params.month, now.getUTCMonth() + 1) ||
        now.getUTCMonth() + 1
    )
  );
  const initialYear = Math.max(
    2000,
    parseMonthYear(params.year, now.getUTCFullYear()) || now.getUTCFullYear()
  );
  const initialClassId = params.classId ?? null;

  const matrix = await getMonthlyAttendanceMatrix({
    month: initialMonth,
    year: initialYear,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Theo dõi chuyên cần
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Thống kê điểm danh theo tháng
          </h1>
          <p className="text-sm text-muted-foreground">
            Xem tổng quan mức độ tham gia của học sinh trong từng lớp theo
            tháng.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/attendance">Quay lại điểm danh hằng ngày</Link>
          </Button>
        </div>
      </div>
      <MonthlyAttendanceClient
        initialMonth={initialMonth}
        initialYear={initialYear}
        initialData={matrix}
        initialClassId={initialClassId}
      />
    </div>
  );
}
