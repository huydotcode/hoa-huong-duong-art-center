"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminClassSession = {
  classId: string;
  sessionTime: string;
  endTime: string;
};

export async function getAdminClassesInSession(
  dateISO: string,
  sessionLabel: string
): Promise<AdminClassSession[]> {
  const supabase = await createClient();

  // Infer from classes + days_of_week JSON
  // Parse dateISO (YYYY-MM-DD) using UTC to avoid timezone issues
  const [year, month, day] = dateISO.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const weekday = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, start_date, end_date, duration_minutes, days_of_week")
    .eq("is_active", true);

  // Convert sessionLabel (e.g., "18:00") to minutes for comparison
  // Khi chọn ca 18:00, hiển thị tất cả các lớp bắt đầu từ 18:00 đến trước 19:00
  const [currentHour, currentMinute] = sessionLabel.split(":").map(Number);
  const currentMinutes = (currentHour || 0) * 60 + (currentMinute || 0);
  const nextHourMinutes = currentMinutes + 60; // Giờ tiếp theo (ví dụ 18:00 -> 19:00)

  const matchedSessions = new Map<string, string>();
  (Array.isArray(classesData)
    ? (classesData as {
        id: string;
        start_date: string;
        end_date: string;
        duration_minutes: number;
        days_of_week: unknown;
      }[])
    : []
  ).forEach((c) => {
    const start = new Date(String(c.start_date));
    const end = new Date(String(c.end_date));
    if (new Date(dateISO) < start || new Date(dateISO) > end) return;
    let slots: { day: number; start_time: string; end_time?: string }[] = [];
    try {
      const parsed = Array.isArray(c.days_of_week)
        ? c.days_of_week
        : JSON.parse((c.days_of_week as string) || "[]");
      slots = Array.isArray(parsed)
        ? (parsed as { day: number; start_time: string; end_time?: string }[])
        : [];
    } catch {
      slots = [];
    }
    const matchedSlot = slots.find(
      (s: { day: number; start_time: string; end_time?: string }) => {
        const slotDay = Number(s.day);
        if (slotDay !== weekday) {
          return false;
        }

        const [startHour, startMin] = String(s.start_time || "00:00")
          .split(":")
          .map(Number);
        const startMinutes = (startHour || 0) * 60 + (startMin || 0);

        // Match nếu lớp bắt đầu trong khoảng từ giờ được chọn đến giờ tiếp theo
        // Ví dụ: chọn 18:00 -> hiển thị lớp bắt đầu từ 18:00 đến trước 19:00
        return startMinutes >= currentMinutes && startMinutes < nextHourMinutes;
      }
    );

    if (matchedSlot) {
      const classId = String(c.id);
      const sessionTime = String(matchedSlot.start_time || sessionLabel);
      let endTime: string;
      if (matchedSlot.end_time) {
        endTime = String(matchedSlot.end_time);
      } else {
        const [startHour, startMin] = String(matchedSlot.start_time || "00:00")
          .split(":")
          .map(Number);
        const duration = Number(c.duration_minutes || 60);
        const startTotalMinutes = (startHour || 0) * 60 + (startMin || 0);
        const endTotalMinutes = startTotalMinutes + duration;
        const endHour = Math.floor(endTotalMinutes / 60) % 24;
        const endMinute = endTotalMinutes % 60;
        endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
      }
      matchedSessions.set(classId, `${sessionTime}||${endTime}`);
    }
  });

  return Array.from(matchedSessions.entries()).map(([classId, value]) => {
    const [sessionTime, endTime] = value.split("||");
    return {
      classId,
      sessionTime,
      endTime,
    };
  });
}

export async function getAdminAllClassesInDay(
  dateISO: string
): Promise<AdminClassSession[]> {
  const supabase = await createClient();

  // Parse dateISO (YYYY-MM-DD) using UTC to avoid timezone issues
  const [year, month, day] = dateISO.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const weekday = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, start_date, end_date, duration_minutes, days_of_week")
    .eq("is_active", true);

  const matchedSessions: AdminClassSession[] = [];

  (Array.isArray(classesData)
    ? (classesData as {
        id: string;
        start_date: string;
        end_date: string;
        duration_minutes: number;
        days_of_week: unknown;
      }[])
    : []
  ).forEach((c) => {
    const start = new Date(String(c.start_date));
    const end = new Date(String(c.end_date));
    if (new Date(dateISO) < start || new Date(dateISO) > end) return;

    let slots: { day: number; start_time: string; end_time?: string }[] = [];
    try {
      const parsed = Array.isArray(c.days_of_week)
        ? c.days_of_week
        : JSON.parse((c.days_of_week as string) || "[]");
      slots = Array.isArray(parsed)
        ? (parsed as { day: number; start_time: string; end_time?: string }[])
        : [];
    } catch {
      slots = [];
    }

    // Lấy tất cả các slot trong ngày này (không lọc theo session)
    slots.forEach(
      (s: { day: number; start_time: string; end_time?: string }) => {
        const slotDay = Number(s.day);
        if (slotDay !== weekday) {
          return;
        }

        const sessionTime = String(s.start_time || "00:00");
        let endTime: string;
        if (s.end_time) {
          endTime = String(s.end_time);
        } else {
          const [startHour, startMin] = sessionTime.split(":").map(Number);
          const duration = Number(c.duration_minutes || 60);
          const startTotalMinutes = (startHour || 0) * 60 + (startMin || 0);
          const endTotalMinutes = startTotalMinutes + duration;
          const endHour = Math.floor(endTotalMinutes / 60) % 24;
          const endMinute = endTotalMinutes % 60;
          endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
        }

        const classId = String(c.id);
        matchedSessions.push({
          classId,
          sessionTime,
          endTime,
        });
      }
    );
  });

  return matchedSessions;
}

export type AdminAttendanceRow = {
  key: string; // `${kind}:${id}:${classId}`
  id: string;
  classId: string;
  className: string;
  full_name: string;
  phone: string;
  kind: "teacher" | "student";
};

export type AdminAttendanceClass = {
  id: string;
  name: string;
};

export async function getParticipantsForClasses(
  classIds: string[]
): Promise<{ classes: AdminAttendanceClass[]; rows: AdminAttendanceRow[] }> {
  if (classIds.length === 0) {
    return { classes: [], rows: [] };
  }
  const supabase = await createClient();

  const [
    { data: classesData },
    { data: classTeachers },
    { data: enrollments },
  ] = await Promise.all([
    supabase.from("classes").select("id, name").in("id", classIds),
    supabase
      .from("class_teachers")
      .select("class_id, teacher:teachers(id, full_name, phone)")
      .in("class_id", classIds),
    supabase
      .from("student_class_enrollments")
      .select("class_id, student:students(id, full_name, phone)")
      .in("class_id", classIds)
      .in("status", ["trial", "active"]),
  ]);

  const idToName = new Map<string, string>();
  const classes: AdminAttendanceClass[] = (
    Array.isArray(classesData)
      ? (classesData as { id: string; name: string }[])
      : []
  ).map((c) => {
    const id = String(c.id);
    const name = String(c.name || "");
    idToName.set(id, name);
    return { id, name };
  });

  const rows: AdminAttendanceRow[] = [];
  (Array.isArray(classTeachers)
    ? (classTeachers as {
        class_id: string;
        teacher:
          | { id: string; full_name: string; phone: string }
          | { id: string; full_name: string; phone: string }[];
      }[])
    : []
  ).forEach((ct) => {
    const tArr =
      (ct.teacher as { id: string; full_name: string; phone: string }[]) || [];
    const t = Array.isArray(ct.teacher)
      ? tArr[0]
      : (ct.teacher as { id: string; full_name: string; phone: string });
    if (!t) return;
    const classId = String(ct.class_id);
    rows.push({
      key: `teacher:${t.id}:${classId}`,
      id: String(t.id),
      classId,
      className: idToName.get(classId) || "",
      full_name: String(t.full_name),
      phone: String(t.phone || ""),
      kind: "teacher",
    });
  });

  (Array.isArray(enrollments)
    ? (enrollments as {
        class_id: string;
        student:
          | { id: string; full_name: string; phone: string }
          | { id: string; full_name: string; phone: string }[];
      }[])
    : []
  ).forEach((se) => {
    const stArr =
      (se.student as { id: string; full_name: string; phone: string }[]) || [];
    const st = Array.isArray(se.student)
      ? stArr[0]
      : (se.student as { id: string; full_name: string; phone: string });
    if (!st) return;
    const classId = String(se.class_id);
    rows.push({
      key: `student:${st.id}:${classId}`,
      id: String(st.id),
      classId,
      className: idToName.get(classId) || "",
      full_name: String(st.full_name),
      phone: String(st.phone || ""),
      kind: "student",
    });
  });

  return { classes, rows };
}

export type AttendanceStateResult = {
  states: Record<string, boolean>;
  notes: Record<string, string | null>;
};

export async function getAttendanceStateForSessions(
  dateISO: string,
  classSessions: AdminClassSession[]
): Promise<AttendanceStateResult> {
  if (classSessions.length === 0) {
    return { states: {}, notes: {} };
  }

  const supabase = await createClient();
  const classIds = Array.from(
    new Set(classSessions.map((item) => item.classId))
  );
  const sessionTimes = Array.from(
    new Set(classSessions.map((item) => item.sessionTime))
  );

  // Create a set of valid (classId, sessionTime) pairs for faster lookup
  // This supports multiple sessions for the same class
  const validSessions = new Set(
    classSessions.map((item) => `${item.classId}::${item.sessionTime}`)
  );

  const { data, error } = await supabase
    .from("attendance")
    .select("class_id, student_id, teacher_id, session_time, is_present, notes")
    .eq("attendance_date", dateISO)
    .in("class_id", classIds)
    .in("session_time", sessionTimes);

  if (error) {
    throw error;
  }

  const states: Record<string, boolean> = {};
  const notes: Record<string, string | null> = {};
  for (const row of (data as
    | {
        class_id: string | number | null;
        student_id: string | number | null;
        teacher_id: string | number | null;
        session_time: string | null;
        is_present: boolean | null;
        notes: string | null;
      }[]
    | null
    | undefined) || []) {
    const classId = row.class_id ? String(row.class_id) : null;
    const session = row.session_time ? String(row.session_time) : null;
    if (!classId || !session) continue;

    // Check if this (classId, sessionTime) combination is in our valid sessions
    if (!validSessions.has(`${classId}::${session}`)) continue;

    let baseKey: string | null = null;
    if (row.student_id) {
      baseKey = `student:${row.student_id}:${classId}`;
    } else if (row.teacher_id) {
      baseKey = `teacher:${row.teacher_id}:${classId}`;
    }
    if (!baseKey) continue;
    const key = `${baseKey}@@${session}`;
    if (typeof row.is_present === "boolean") {
      states[key] = row.is_present;
    }
    if (row.notes !== undefined && row.notes !== null) {
      const noteValue =
        typeof row.notes === "string" && row.notes.trim().length > 0
          ? row.notes
          : null;
      if (noteValue !== null) {
        notes[key] = noteValue;
      } else {
        delete notes[key];
      }
    }
  }

  return { states, notes };
}
