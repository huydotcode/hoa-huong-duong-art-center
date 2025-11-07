import {
  getParticipantsForClasses,
  getTeacherClassesInSession,
  getTeacherIdFromSession,
} from "@/lib/services/teacher-attendance-service";
import { getCurrentSessionLabel } from "@/lib/utils";
import { notFound } from "next/navigation";
import TeacherAttendanceClient from "./_components/teacher-attendance-client";

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; session?: string }>;
}) {
  const { date, session } = await searchParams;
  const dateISO = (date ? new Date(date) : new Date())
    .toISOString()
    .slice(0, 10);
  const sessionLabel = session || getCurrentSessionLabel();

  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) return notFound();

  const classIds = await getTeacherClassesInSession(
    teacherId,
    dateISO,
    sessionLabel
  );
  const rows = await getParticipantsForClasses(classIds);

  return (
    <TeacherAttendanceClient
      dateISO={dateISO}
      sessionLabel={sessionLabel}
      rows={rows}
    />
  );
}
