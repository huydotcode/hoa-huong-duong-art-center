import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentSessionLabel } from "@/lib/utils";
import AdminAttendanceClient from "./_components/admin-attendance-client";

function normalizeToHourSlot(time: string): string {
  const [hour] = time.split(":").map(Number);
  const roundedHour = Math.max(6, Math.min(22, hour));
  return `${String(roundedHour).padStart(2, "0")}:00`;
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    session?: string;
    showAll?: string;
    classId?: string;
  }>;
}) {
  const { date, session, showAll, classId } = await searchParams;
  const dateISO = (date ? new Date(date) : new Date())
    .toISOString()
    .slice(0, 10);
  const sessionLabel = session
    ? session
    : normalizeToHourSlot(getCurrentSessionLabel());

  const showAllClasses = showAll === "true";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Điểm danh</h1>
        <Button variant="secondary" asChild>
          <Link href="/admin/attendance/monthly">Thống kê tháng</Link>
        </Button>
      </div>
      <AdminAttendanceClient
        dateISO={dateISO}
        sessionLabel={sessionLabel}
        showAllClasses={showAllClasses}
        initialClassId={classId ?? null}
      />
    </div>
  );
}
