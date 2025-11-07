import {
  getClassesAndStudentsForTeacher,
  getTeacherClassesInSessionWithTimes,
  getTeacherIdFromSession,
  getAttendanceStateForTeacherSessions,
} from "@/lib/services/teacher-attendance-service";
import { getCurrentSessionLabel } from "@/lib/utils";
import { notFound } from "next/navigation";
import TeacherAttendanceClient from "./_components/teacher-attendance-client";

function normalizeToHourSlot(time: string): string {
  const [hour] = time.split(":").map(Number);
  const roundedHour = Math.max(6, Math.min(22, hour));
  return `${String(roundedHour).padStart(2, "0")}:00`;
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; session?: string }>;
}) {
  const { date, session } = await searchParams;
  const dateISO = (date ? new Date(date) : new Date())
    .toISOString()
    .slice(0, 10);
  const sessionLabel = session
    ? session
    : normalizeToHourSlot(getCurrentSessionLabel());

  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) return notFound();

  const classSessions = await getTeacherClassesInSessionWithTimes(
    teacherId,
    dateISO,
    sessionLabel
  );
  const classIds = classSessions.map((item) => item.classId);
  const classSessionTimes = Object.fromEntries(
    classSessions.map((item) => [
      item.classId,
      { sessionTime: item.sessionTime, endTime: item.endTime },
    ])
  );
  const { classes, rows } = await getClassesAndStudentsForTeacher(classIds);
  const attendanceState = await getAttendanceStateForTeacherSessions(
    dateISO,
    classSessions
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Điểm danh</h1>
      </div>
      <TeacherAttendanceClient
        dateISO={dateISO}
        sessionLabel={sessionLabel}
        classSessionTimes={classSessionTimes}
        classes={classes}
        rows={rows}
        initialState={attendanceState}
      />
    </div>
  );
}
