"use server";

import { createClient } from "@/lib/supabase/server";
import type { EnrollmentStatus } from "@/types/database";

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
  // Khi chọn ca 18:00, hiển thị tất cả các lớp bắt đầu từ 18:00 đến trước 21:00 (3 giờ kế tiếp)
  const [currentHour, currentMinute] = sessionLabel.split(":").map(Number);
  const currentMinutes = (currentHour || 0) * 60 + (currentMinute || 0);
  const windowMinutes = currentMinutes + 180; // 3 giờ tiếp theo

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

        // Match nếu lớp bắt đầu trong khoảng từ giờ được chọn đến trước 3 giờ tiếp theo
        // Ví dụ: chọn 18:00 -> hiển thị lớp bắt đầu từ 18:00 đến trước 21:00
        return startMinutes >= currentMinutes && startMinutes < windowMinutes;
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


export type MonthlyAttendanceStudent = {
  id: string;
  fullName: string;
  status: EnrollmentStatus;
};

export type MonthlyAttendanceSession = {
  id: string;
  date: string;
  sessionTime: string;
  endTime?: string;
  weekday: number;
};

export type MonthlyAttendanceClassMatrix = {
  classId: string;
  className: string;
  teacherNames: string[];
  sessions: MonthlyAttendanceSession[];
  students: MonthlyAttendanceStudent[];
};

type MonthlyAttendanceCell = {
  isPresent: boolean | null;
  notes: string | null;
};

export type MonthlyAttendanceMeta = {
  month: number;
  year: number;
  totalClasses: number;
  totalSessions: number;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
};

export type MonthlyAttendanceMatrixResult = {
  classes: MonthlyAttendanceClassMatrix[];
  attendanceMap: Record<string, MonthlyAttendanceCell>;
  meta: MonthlyAttendanceMeta;
};

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const iso = `${value}T00:00:00.000Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function computeEndTime(
  startTime: string,
  endTime: string | undefined,
  durationMinutes: number | null | undefined
): string {
  if (endTime) {
    return endTime;
  }
  const [hour, minute] = startTime.split(":").map(Number);
  const totalMinutes = (hour || 0) * 60 + (minute || 0) + (durationMinutes || 60);
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

function buildSessionsForClass(
  monthStart: Date,
  monthEnd: Date,
  classInfo: {
    id: string;
    startDate: Date | null;
    endDate: Date | null;
    durationMinutes: number | null;
    schedules: { day?: number; start_time?: string; end_time?: string }[];
  }
): MonthlyAttendanceSession[] {
  const sessions: MonthlyAttendanceSession[] = [];
  if (classInfo.schedules.length === 0) {
    return sessions;
  }
  const classStart = classInfo.startDate ?? monthStart;
  const classEnd = classInfo.endDate ?? monthEnd;
  let cursor = new Date(monthStart.getTime());
  while (cursor.getTime() <= monthEnd.getTime()) {
    const dateISO = toISODate(cursor);
    if (cursor.getTime() >= classStart.getTime() && cursor.getTime() <= classEnd.getTime()) {
      const weekday = cursor.getUTCDay();
      classInfo.schedules.forEach((schedule) => {
        if (Number(schedule.day) === weekday && schedule.start_time) {
          const sessionTime = schedule.start_time;
          const sessionId = `${dateISO}@@${sessionTime}`;
          sessions.push({
            id: sessionId,
            date: dateISO,
            sessionTime,
            endTime: computeEndTime(
              sessionTime,
              schedule.end_time,
              classInfo.durationMinutes
            ),
            weekday,
          });
        }
      });
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  sessions.sort((a, b) => {
    if (a.date === b.date) {
      return a.sessionTime.localeCompare(b.sessionTime);
    }
    return a.date.localeCompare(b.date);
  });
  return sessions;
}

export async function getMonthlyAttendanceMatrix({
  month,
  year,
  classIds,
}: {
  month: number;
  year: number;
  classIds?: string[];
}): Promise<MonthlyAttendanceMatrixResult> {
  const supabase = await createClient();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const monthStartISO = toISODate(monthStart);
  const monthEndISO = toISODate(monthEnd);

  let classQuery = supabase
    .from("classes")
    .select("id, name, start_date, end_date, duration_minutes, days_of_week")
    .eq("is_active", true);

  if (classIds && classIds.length > 0) {
    classQuery = classQuery.in("id", classIds);
  }

  const { data: classesData } = await classQuery;

  const normalizedClasses = (Array.isArray(classesData)
    ? (classesData as {
        id: string;
        name: string;
        start_date: string | null;
        end_date: string | null;
        duration_minutes: number | null;
        days_of_week: unknown;
      }[])
    : []
  ).map((item) => {
    let schedules: { day?: number; start_time?: string; end_time?: string }[] = [];
    try {
      const raw = Array.isArray(item.days_of_week)
        ? item.days_of_week
        : JSON.parse((item.days_of_week as string) || "[]");
      schedules = Array.isArray(raw)
        ? (raw as { day?: number; start_time?: string; end_time?: string }[])
        : [];
    } catch {
      schedules = [];
    }
    return {
      id: String(item.id),
      name: String(item.name || ""),
      startDate: parseDate(item.start_date),
      endDate: parseDate(item.end_date),
      durationMinutes: item.duration_minutes,
      schedules,
    };
  });

  if (normalizedClasses.length === 0) {
    return {
      classes: [],
      attendanceMap: {},
      meta: {
        month,
        year,
        totalClasses: 0,
        totalSessions: 0,
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
      },
    };
  }

  const classIdList = normalizedClasses.map((cls) => cls.id);

  const [teachersResult, enrollmentsResult, attendanceResult] = await Promise.all([
    supabase
      .from("class_teachers")
      .select("class_id, teacher:teachers(id, full_name)")
      .in("class_id", classIdList),
    supabase
      .from("student_class_enrollments")
      .select("class_id, status, student:students(id, full_name)")
      .in("class_id", classIdList)
      .in("status", ["active", "trial"]),
    supabase
      .from("attendance")
      .select(
        "class_id, student_id, attendance_date, session_time, is_present, notes"
      )
      .gte("attendance_date", monthStartISO)
      .lte("attendance_date", monthEndISO)
      .in("class_id", classIdList),
  ]);

  const teacherNamesByClass = new Map<string, string[]>();
  (Array.isArray(teachersResult?.data)
    ? (teachersResult.data as {
        class_id: string;
        teacher:
          | { id: string; full_name: string }
          | { id: string; full_name: string }[]
          | null;
      }[])
    : []
  ).forEach((row) => {
    const classId = String(row.class_id);
    const teacherField = row.teacher;
    const names: string[] = [];
    if (Array.isArray(teacherField)) {
      teacherField.forEach((teacher) => {
        if (teacher) {
          names.push(String(teacher.full_name || ""));
        }
      });
    } else if (teacherField) {
      names.push(String(teacherField.full_name || ""));
    }
    if (names.length > 0) {
      const existing = teacherNamesByClass.get(classId) || [];
      teacherNamesByClass.set(classId, Array.from(new Set([...existing, ...names])));
    }
  });

  const studentsByClass = new Map<string, MonthlyAttendanceStudent[]>();
  (Array.isArray(enrollmentsResult?.data)
    ? (enrollmentsResult.data as {
        class_id: string;
        status: EnrollmentStatus;
        student:
          | { id: string; full_name: string }
          | { id: string; full_name: string }[]
          | null;
      }[])
    : []
  ).forEach((row) => {
    const classId = String(row.class_id);
    const studentField = row.student;
    const pushStudent = (student: { id: string; full_name: string } | null) => {
      if (!student) return;
      const entry: MonthlyAttendanceStudent = {
        id: String(student.id),
        fullName: String(student.full_name || ""),
        status: row.status,
      };
      const existing = studentsByClass.get(classId) || [];
      existing.push(entry);
      studentsByClass.set(classId, existing);
    };
    if (Array.isArray(studentField)) {
      studentField.forEach((st) => pushStudent(st));
    } else {
      pushStudent(studentField);
    }
  });

  const attendanceMap: Record<string, MonthlyAttendanceCell> = {};
  (Array.isArray(attendanceResult?.data)
    ? (attendanceResult.data as {
        class_id: string | number | null;
        student_id: string | number | null;
        attendance_date: string | null;
        session_time: string | null;
        is_present: boolean | null;
        notes: string | null;
      }[])
    : []
  ).forEach((row) => {
    if (!row.class_id || !row.student_id || !row.attendance_date || !row.session_time) {
      return;
    }
    const classId = String(row.class_id);
    const studentId = String(row.student_id);
    const sessionKey = `${row.attendance_date}@@${row.session_time}`;
    const key = `${classId}||${studentId}||${sessionKey}`;
    attendanceMap[key] = {
      isPresent:
        typeof row.is_present === "boolean" ? Boolean(row.is_present) : null,
      notes: row.notes ? String(row.notes) : null,
    };
  });

  const classes: MonthlyAttendanceClassMatrix[] = normalizedClasses
    .map((cls) => {
      const sessions = buildSessionsForClass(monthStart, monthEnd, {
        id: cls.id,
        startDate: cls.startDate,
        endDate: cls.endDate,
        durationMinutes: cls.durationMinutes,
        schedules: cls.schedules,
      });
      const students = (studentsByClass.get(cls.id) || []).sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "vi", { sensitivity: "base" })
      );
      return {
        classId: cls.id,
        className: cls.name || "Lớp chưa đặt tên",
        teacherNames: teacherNamesByClass.get(cls.id) || [],
        sessions,
        students,
      };
    })
    .filter((cls) => cls.sessions.length > 0 && cls.students.length > 0);

  const meta = {
    month,
    year,
    totalClasses: classes.length,
    totalSessions: classes.reduce((count, cls) => count + cls.sessions.length, 0),
    totalStudents: classes.reduce((count, cls) => count + cls.students.length, 0),
    presentCount: Object.values(attendanceMap).filter(
      (cell) => cell.isPresent === true
    ).length,
    absentCount: Object.values(attendanceMap).filter(
      (cell) => cell.isPresent === false
    ).length,
  } satisfies MonthlyAttendanceMeta;

  return {
    classes,
    attendanceMap,
    meta,
  };
}
