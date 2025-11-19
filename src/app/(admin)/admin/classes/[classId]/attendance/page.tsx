import AttendancePageClient from "./_components/attendance-page-client";
import { getAttendancePageData } from "@/lib/services/attendance-data-service";

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { classId } = await params;
  const { date } = await searchParams;

  // Get default date (today)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;
  const attendanceDate = date || defaultDate;

  // Preload all data on server
  const initialData = await getAttendancePageData(classId, attendanceDate);

  return (
    <AttendancePageClient
      classId={classId}
      initialData={initialData}
      date={attendanceDate}
    />
  );
}
