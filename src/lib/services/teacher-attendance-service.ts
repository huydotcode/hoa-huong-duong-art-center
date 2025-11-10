"use server";

import { createClient } from "@/lib/supabase/server";
import { toArray } from "@/lib/utils";
import type { ClassSchedule } from "@/types/database";

export async function getTeacherIdFromSession(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null; // teachers.id == auth.users.id
}

export async function getTeacherClassesInSession(
  teacherId: string,
  dateISO: string,
  sessionLabel: string
): Promise<string[]> {
  const supabase = await createClient();

  // Prefer lessons if present
  const { data: lessons, error: lessonsErr } = await supabase
    .from("lessons")
    .select("class_id")
    .eq("date", dateISO)
    .eq("session_time", sessionLabel)
    .eq("teacher_id", teacherId);

  if (!lessonsErr && Array.isArray(lessons) && lessons.length > 0) {
    return Array.from(
      new Set(
        (lessons as { class_id: string }[]).map((l) => String(l.class_id))
      )
    );
  }

  // Fallback: infer from classes + class_teachers + days_of_week JSON
  const weekday = new Date(dateISO).getDay(); // 0..6
  const { data: teacherClasses } = await supabase
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", teacherId);
  const teacherClassesArr: { class_id: string }[] = Array.isArray(
    teacherClasses
  )
    ? (teacherClasses as { class_id: string }[])
    : [];
  const classIds = Array.from(
    new Set(teacherClassesArr.map((r) => String(r.class_id)))
  );
  if (classIds.length === 0) return [];

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, start_date, end_date, duration_minutes, days_of_week")
    .in("id", classIds)
    .eq("is_active", true);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const inSession: string[] = [];
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
    let slots: { day: number; start_time: string }[] = [];
    try {
      const parsed = Array.isArray(c.days_of_week)
        ? c.days_of_week
        : JSON.parse((c.days_of_week as string) || "[]");
      slots = Array.isArray(parsed)
        ? (parsed as { day: number; start_time: string }[])
        : [];
    } catch {
      slots = [];
    }
    const matches = slots.some((s: { day: number; start_time: string }) => {
      if (Number(s.day) !== weekday) return false;
      const [hh, mm] = String(s.start_time || "00:00")
        .split(":")
        .map((v) => Number(v));
      const startMin = (hh || 0) * 60 + (mm || 0);
      const endMin = startMin + Number(c.duration_minutes || 60);
      return nowMinutes >= startMin && nowMinutes < endMin;
    });
    if (matches) inSession.push(String(c.id));
  });

  return Array.from(new Set(inSession));
}

export type TeacherAttendanceRow = {
  key: string; // `${kind}:${id}:${classId}`
  id: string;
  classId: string;
  className: string;
  full_name: string;
  phone: string;
  kind: "teacher" | "student";
};

export async function getParticipantsForClasses(
  classIds: string[]
): Promise<TeacherAttendanceRow[]> {
  if (classIds.length === 0) return [];
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
      .eq("is_active", true)
      .in("class_id", classIds),
  ]);

  const idToName = new Map<string, string>();
  (Array.isArray(classesData)
    ? (classesData as { id: string; name: string }[])
    : []
  ).forEach((c) => {
    idToName.set(String(c.id), String(c.name));
  });

  const rows: TeacherAttendanceRow[] = [];
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

  return rows;
}

export type TeacherClassSession = {
  classId: string;
  sessionTime: string;
  endTime: string;
};

export async function getTeacherClassesInSessionWithTimes(
  teacherId: string,
  dateISO: string,
  sessionLabel: string
): Promise<TeacherClassSession[]> {
  const supabase = await createClient();

  // Parse dateISO (YYYY-MM-DD) using UTC to avoid timezone issues
  const [year, month, day] = dateISO.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const weekday = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  const { data: teacherClasses } = await supabase
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", teacherId);
  const teacherClassesArr: { class_id: string }[] = Array.isArray(
    teacherClasses
  )
    ? (teacherClasses as { class_id: string }[])
    : [];
  const classIds = Array.from(
    new Set(teacherClassesArr.map((r) => String(r.class_id)))
  );
  if (classIds.length === 0) return [];

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, start_date, end_date, duration_minutes, days_of_week")
    .in("id", classIds)
    .eq("is_active", true);

  // Convert sessionLabel (e.g., "13:40") to minutes for comparison
  const [currentHour, currentMinute] = sessionLabel.split(":").map(Number);
  const currentMinutes = (currentHour || 0) * 60 + (currentMinute || 0);

  const matchedSessions: TeacherClassSession[] = [];
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

        let endMinutes: number;
        if (s.end_time) {
          const [endHour, endMin] = String(s.end_time).split(":").map(Number);
          endMinutes = (endHour || 0) * 60 + (endMin || 0);
        } else {
          endMinutes = startMinutes + Number(c.duration_minutes || 60);
        }

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      }
    );

    if (matchedSlot) {
      const [startHour, startMin] = String(matchedSlot.start_time || "00:00")
        .split(":")
        .map(Number);
      const startMinutes = (startHour || 0) * 60 + (startMin || 0);
      let endMinutes: number;
      if (matchedSlot.end_time) {
        const [endHour, endMin] = String(matchedSlot.end_time)
          .split(":")
          .map(Number);
        endMinutes = (endHour || 0) * 60 + (endMin || 0);
      } else {
        endMinutes = startMinutes + Number(c.duration_minutes || 60);
      }

      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

      matchedSessions.push({
        classId: String(c.id),
        sessionTime: String(matchedSlot.start_time || "00:00"),
        endTime,
      });
    }
  });

  return matchedSessions;
}

export async function getAttendanceStateForTeacherSessions(
  dateISO: string,
  classSessions: TeacherClassSession[]
): Promise<Record<string, boolean>> {
  if (classSessions.length === 0) return {};
  const supabase = await createClient();

  const classIds = classSessions.map((s) => s.classId);
  const sessionTimes = Array.from(
    new Set(classSessions.map((s) => s.sessionTime))
  );

  const { data: attendanceData } = await supabase
    .from("attendance")
    .select("class_id, student_id, session_time, is_present")
    .eq("attendance_date", dateISO)
    .in("class_id", classIds)
    .in("session_time", sessionTimes)
    .eq("is_present", true);

  const state: Record<string, boolean> = {};
  (Array.isArray(attendanceData)
    ? (attendanceData as {
        class_id: string;
        student_id: string;
        session_time: string;
        is_present: boolean;
      }[])
    : []
  ).forEach((a) => {
    const key = `student:${a.student_id}:${a.class_id}@@${a.session_time}`;
    state[key] = a.is_present === true;
  });

  return state;
}

export type TeacherAttendanceClass = {
  id: string;
  name: string;
  days_of_week: ClassSchedule[];
  duration_minutes: number;
  current_student_count: number;
  max_student_count: number;
};

export async function getClassesAndStudentsForTeacher(
  classIds: string[]
): Promise<{
  classes: TeacherAttendanceClass[];
  rows: TeacherAttendanceRow[];
}> {
  if (classIds.length === 0) return { classes: [], rows: [] };
  const supabase = await createClient();

  const [{ data: classesData }, { data: enrollments }] = await Promise.all([
    supabase
      .from("classes")
      .select(
        "id, name, days_of_week, duration_minutes, current_student_count, max_student_count"
      )
      .in("id", classIds),
    supabase
      .from("student_class_enrollments")
      .select("class_id, student:students(id, full_name, phone)")
      .eq("status", "active")
      .in("class_id", classIds),
  ]);

  const classes: TeacherAttendanceClass[] = (
    Array.isArray(classesData)
      ? (classesData as {
          id: string;
          name: string;
          days_of_week?: unknown;
          duration_minutes?: number | null;
          current_student_count?: number | null;
          max_student_count?: number | null;
        }[])
      : []
  ).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    days_of_week: toArray<ClassSchedule>(c.days_of_week),
    duration_minutes: Number(c.duration_minutes ?? 0),
    current_student_count: Number(c.current_student_count ?? 0),
    max_student_count: Number(c.max_student_count ?? 0),
  }));

  const idToName = new Map<string, string>();
  classes.forEach((c) => {
    idToName.set(c.id, c.name);
  });

  const rows: TeacherAttendanceRow[] = [];
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
