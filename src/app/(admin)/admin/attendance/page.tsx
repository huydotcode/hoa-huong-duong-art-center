import {
  getAdminClassesInSession,
  getParticipantsForClasses,
  getAttendanceStateForSessions,
} from "@/lib/services/admin-attendance-service";
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
  searchParams: Promise<{ date?: string; session?: string }>;
}) {
  const { date, session } = await searchParams;
  const dateISO = (date ? new Date(date) : new Date())
    .toISOString()
    .slice(0, 10);
  const sessionLabel = session
    ? session
    : normalizeToHourSlot(getCurrentSessionLabel());

  const classSessions = await getAdminClassesInSession(dateISO, sessionLabel);
  const classIds = classSessions.map((item) => item.classId);
  const classSessionTimes = Object.fromEntries(
    classSessions.map((item) => [
      item.classId,
      { sessionTime: item.sessionTime, endTime: item.endTime },
    ])
  );
  const { classes, rows } = await getParticipantsForClasses(classIds);
  const attendanceState = await getAttendanceStateForSessions(
    dateISO,
    classSessions
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Điểm danh</h1>
      </div>
      <AdminAttendanceClient
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
