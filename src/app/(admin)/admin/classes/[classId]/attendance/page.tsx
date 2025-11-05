import AttendancePageClient from "./_components/attendance-page-client";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;

  return <AttendancePageClient classId={classId} />;
}
