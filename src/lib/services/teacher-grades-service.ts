"use server";

import { createClient } from "@/lib/supabase/server";

export type GradeRow = {
  enrollment_id: string;
  class_id: string;
  class_name: string;
  student_id: string;
  student_name: string;
  phone: string | null;
  score_1: number | null;
  score_2: number | null;
  score_3: number | null;
  teacher_notes: string | null;
};

export async function getTeacherClassesForGrades(): Promise<
  Array<{ id: string; name: string }>
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("getTeacherClassesForGrades getUser error:", authError);
    return [];
  }

  if (!user) return [];

  const { data, error } = await supabase
    .from("class_teachers")
    .select("class:classes(id, name)")
    .eq("teacher_id", user.id);

  if (error) {
    console.error("Error fetching teacher classes for grades:", error);
    return [];
  }

  const result: Array<{ id: string; name: string }> = [];
  (data || []).forEach(
    (row: {
      class:
        | { id: string | number; name: string }
        | Array<{ id: string | number; name: string }>;
    }) => {
      const cls = Array.isArray(row.class) ? row.class[0] : row.class;
      if (cls) {
        result.push({
          id: String(cls.id),
          name: String(cls.name || ""),
        });
      }
    }
  );

  // Remove duplicates by class ID
  const unique = new Map<string, { id: string; name: string }>();
  result.forEach((item) => unique.set(item.id, item));

  return Array.from(unique.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
  );
}

export async function getEnrollmentsByClassForGrades(
  classId: string
): Promise<GradeRow[]> {
  if (!classId) return [];
  const supabase = await createClient();

  // Lấy thông tin lớp
  const { data: classData } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .single();

  const className = classData?.name ? String(classData.name) : "";

  const { data, error } = await supabase
    .from("student_class_enrollments")
    .select(
      `
      id,
      student:students(id, full_name, phone),
      score_1,
      score_2,
      score_3,
      teacher_notes
    `
    )
    .eq("class_id", classId)
    .in("status", ["active", "trial"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching enrollments for grades:", error);
    return [];
  }

  const rows: GradeRow[] = [];

  (data || []).forEach(
    (row: {
      id: string | number;
      student:
        | { id: string | number; full_name: string; phone: string | null }
        | Array<{
            id: string | number;
            full_name: string;
            phone: string | null;
          }>;
      score_1: number | null;
      score_2: number | null;
      score_3: number | null;
      teacher_notes: string | null;
    }) => {
      const student = Array.isArray(row.student) ? row.student[0] : row.student;
      if (!student) return;

      rows.push({
        enrollment_id: String(row.id),
        class_id: classId,
        class_name: className,
        student_id: String(student.id),
        student_name: String(student.full_name || ""),
        phone: student.phone ? String(student.phone) : null,
        score_1: row.score_1 ?? null,
        score_2: row.score_2 ?? null,
        score_3: row.score_3 ?? null,
        teacher_notes: row.teacher_notes ? String(row.teacher_notes) : null,
      });
    }
  );

  return rows;
}

export async function getAllEnrollmentsForTeacher(): Promise<GradeRow[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  // Lấy tất cả các lớp của giáo viên
  const { data: teacherClasses, error: classesError } = await supabase
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", user.id);

  if (classesError || !teacherClasses || teacherClasses.length === 0) {
    return [];
  }

  const classIds = Array.from(
    new Set(teacherClasses.map((tc) => String(tc.class_id)))
  );

  // Lấy tất cả enrollments từ các lớp này
  const { data, error } = await supabase
    .from("student_class_enrollments")
    .select(
      `
      id,
      class_id,
      class:classes(id, name),
      student:students(id, full_name, phone),
      score_1,
      score_2,
      score_3,
      teacher_notes
    `
    )
    .in("class_id", classIds)
    .in("status", ["active", "trial"])
    .order("class_id", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching all enrollments for teacher:", error);
    return [];
  }

  const rows: GradeRow[] = [];

  (data || []).forEach(
    (row: {
      id: string | number;
      class_id: string | number;
      class:
        | { id: string | number; name: string }
        | Array<{ id: string | number; name: string }>;
      student:
        | { id: string | number; full_name: string; phone: string | null }
        | Array<{
            id: string | number;
            full_name: string;
            phone: string | null;
          }>;
      score_1: number | null;
      score_2: number | null;
      score_3: number | null;
      teacher_notes: string | null;
    }) => {
      const student = Array.isArray(row.student) ? row.student[0] : row.student;
      const classData = Array.isArray(row.class) ? row.class[0] : row.class;
      if (!student || !classData) return;

      rows.push({
        enrollment_id: String(row.id),
        class_id: String(row.class_id),
        class_name: String(classData.name || ""),
        student_id: String(student.id),
        student_name: String(student.full_name || ""),
        phone: student.phone ? String(student.phone) : null,
        score_1: row.score_1 ?? null,
        score_2: row.score_2 ?? null,
        score_3: row.score_3 ?? null,
        teacher_notes: row.teacher_notes ? String(row.teacher_notes) : null,
      });
    }
  );

  return rows;
}

export async function updateEnrollmentScores(
  enrollmentId: string,
  scores: {
    score_1?: number | null;
    score_2?: number | null;
    score_3?: number | null;
    teacher_notes?: string | null;
  }
) {
  if (!enrollmentId) return;

  const supabase = await createClient();
  const payload: Record<string, number | null | string> = {};

  if (scores.score_1 !== undefined) payload.score_1 = scores.score_1;
  if (scores.score_2 !== undefined) payload.score_2 = scores.score_2;
  if (scores.score_3 !== undefined) payload.score_3 = scores.score_3;
  if (scores.teacher_notes !== undefined)
    payload.teacher_notes = scores.teacher_notes;

  const { error } = await supabase
    .from("student_class_enrollments")
    .update(payload)
    .eq("id", enrollmentId);

  if (error) {
    console.error("Error updating enrollment scores:", error);
    throw new Error(error.message);
  }
}

export async function bulkUpdateScores(
  classId: string,
  rows: Array<{
    enrollment_id: string;
    score_1?: number | null;
    score_2?: number | null;
    score_3?: number | null;
    teacher_notes?: string | null;
  }>
) {
  if (!classId || rows.length === 0) return;

  const supabase = await createClient();

  for (const row of rows) {
    const payload: Record<string, number | null | string> = {};
    if (row.score_1 !== undefined) payload.score_1 = row.score_1;
    if (row.score_2 !== undefined) payload.score_2 = row.score_2;
    if (row.score_3 !== undefined) payload.score_3 = row.score_3;
    if (row.teacher_notes !== undefined)
      payload.teacher_notes = row.teacher_notes;

    const { error } = await supabase
      .from("student_class_enrollments")
      .update(payload)
      .eq("id", row.enrollment_id)
      .eq("class_id", classId);

    if (error) {
      console.error("Error updating scores:", error);
      throw new Error(error.message);
    }
  }
}
