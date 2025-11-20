import { redirect } from "next/navigation";

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { classId } = await params;
  const { date } = await searchParams;

  const query = new URLSearchParams();
  if (classId) query.set("classId", classId);
  if (date) query.set("date", date);
  query.set("showAll", "true");

  redirect(`/admin/attendance?${query.toString()}`);
}
