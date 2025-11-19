import {
  getAdminClassesInSession,
  getAdminAllClassesInDay,
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
  searchParams: Promise<{ date?: string; session?: string; showAll?: string }>;
}) {
  const { date, session, showAll } = await searchParams;
  const dateISO = (date ? new Date(date) : new Date())
    .toISOString()
    .slice(0, 10);
  const sessionLabel = session
    ? session
    : normalizeToHourSlot(getCurrentSessionLabel());

  const showAllClasses = showAll === "true";

  // Nếu showAll = true, lấy tất cả các lớp trong ngày
  // Nếu không, lấy theo ca như cũ
  const classSessions = showAllClasses
    ? await getAdminAllClassesInDay(dateISO)
    : await getAdminClassesInSession(dateISO, sessionLabel);

  const classIds = classSessions.map((item) => item.classId);
  // Tạo map với key là classId, nhưng lưu tất cả các ca (vì một lớp có thể có nhiều ca)
  // Khi có nhiều ca, sẽ lấy ca đầu tiên để hiển thị default, nhưng client sẽ xử lý để hiển thị tất cả
  const classSessionTimesMap = new Map<
    string,
    { sessionTime: string; endTime: string }[]
  >();
  classSessions.forEach((item) => {
    const existing = classSessionTimesMap.get(item.classId) || [];
    existing.push({ sessionTime: item.sessionTime, endTime: item.endTime });
    classSessionTimesMap.set(item.classId, existing);
  });

  // Convert to object format expected by client
  // For multiple sessions, we'll pass all of them and client will handle grouping
  const classSessionTimes: Record<
    string,
    { sessionTime: string; endTime: string }
  > = {};
  classSessionTimesMap.forEach((sessions, classId) => {
    // Use first session as default, but we'll pass all sessions in the data
    classSessionTimes[classId] = sessions[0];
  });

  const [{ classes, rows }, attendanceState] = await Promise.all([
    getParticipantsForClasses(classIds),
    getAttendanceStateForSessions(dateISO, classSessions),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Điểm danh</h1>
      </div>
      <AdminAttendanceClient
        dateISO={dateISO}
        sessionLabel={sessionLabel}
        classSessionTimes={classSessionTimes}
        classSessions={classSessions}
        classes={classes}
        rows={rows}
        initialState={attendanceState.states}
        initialNotes={attendanceState.notes}
        showAllClasses={showAllClasses}
      />
    </div>
  );
}
