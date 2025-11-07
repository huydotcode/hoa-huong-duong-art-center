"use server";

import { createClient } from "@/lib/supabase/server";

export async function getTeacherIdFromSession(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null; // teachers.id == auth.users.id
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
