"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DateSessionToolbar } from "@/components/shared/attendance/date-session-toolbar";

export function AttendanceToolbarClient(props: {
  basePath: string; // e.g. /admin/classes/{id}/attendance or /teacher/classes/{id}/attendance
  date: string;
  session: string;
  sessions: string[];
}) {
  const { basePath, date, session, sessions } = props;
  const router = useRouter();
  const sp = useSearchParams();

  const apply = (next: { date?: string; session?: string }) => {
    const q = new URLSearchParams(sp?.toString() || "");
    if (next.date !== undefined) q.set("date", next.date);
    if (next.session !== undefined) q.set("session", next.session);
    router.push(`${basePath}?${q.toString()}`);
  };

  return (
    <DateSessionToolbar
      date={date}
      onDateChange={(v) => apply({ date: v })}
      sessions={sessions}
      session={session}
      onSessionChange={(v) => apply({ session: v })}
      quickPreset="yd"
    />
  );
}
