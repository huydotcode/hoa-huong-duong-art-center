"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Class, Teacher, Student } from "@/types";

/*
getClasses(query?, { is_active? }): trả về danh sách lớp có kèm đếm teachers_count, students_count dùng embed class_teachers(count), student_class_enrollments(count), sắp xếp theo tên.
getClassById(id): trả về Class | null.
createClass(data, { teacherIds?, path? }): tạo lớp, optional gán giáo viên ban đầu, revalidatePath(path), trả về classId.
updateClass(id, data, path?): cập nhật lớp, revalidatePath.
getClassTeachers(classId): trả về mảng Teacher từ bảng mapping.
setClassTeachers(classId, teacherIds, path?): replace toàn bộ mapping cho lớp.
getClassStudents(classId, { status? }): trả về danh sách enrollment dạng { enrollment_id, status, student } (join students(*)).
*/

export type CreateClassData = Pick<
  Class,
  | "name"
  | "days_of_week"
  | "duration_minutes"
  | "monthly_fee"
  | "salary_per_session"
  | "start_date"
  | "end_date"
  | "is_active"
>;

export type UpdateClassData = Partial<CreateClassData>;

export interface ClassListItem extends Class {
  teachers_count: number;
  students_count: number;
}

export async function getClasses(
  query: string = "",
  opts?: { is_active?: boolean }
): Promise<ClassListItem[]> {
  const supabase = await createClient();

  // Use relationship counts via PostgREST embedding
  let q = supabase
    .from("classes")
    .select(`*, class_teachers(count), student_class_enrollments(count)`, {
      count: "exact",
    })
    .order("name", { ascending: true });

  const trimmed = query.trim();
  if (trimmed) {
    q = q.ilike("name", `%${trimmed}%`);
  }
  if (opts?.is_active !== undefined) {
    q = q.eq("is_active", opts.is_active);
  }

  const { data, error } = await q;
  if (error) throw error;

  type RawRow = Class & {
    class_teachers?: { count?: number }[];
    student_class_enrollments?: { count?: number }[];
  };
  const mapped: ClassListItem[] =
    (data as RawRow[] | null | undefined)?.map((row) => ({
      ...(row as Class),
      teachers_count: Array.isArray(row.class_teachers)
        ? (row.class_teachers[0]?.count ?? 0)
        : 0,
      students_count: Array.isArray(row.student_class_enrollments)
        ? (row.student_class_enrollments[0]?.count ?? 0)
        : 0,
    })) || [];
  return mapped;
}

export async function getClassById(id: string): Promise<Class | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw error;
  }
  return (data as Class) ?? null;
}

export async function createClass(
  data: CreateClassData,
  options?: { teacherIds?: string[]; path?: string }
): Promise<string> {
  const supabase = await createClient();
  const payload: CreateClassData = {
    ...data,
    is_active: data.is_active ?? true,
  };
  const { data: inserted, error } = await supabase
    .from("classes")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  const classId: string = inserted?.id as string;

  if (options?.teacherIds && options.teacherIds.length > 0) {
    const rows = options.teacherIds.map((teacherId) => ({
      class_id: classId,
      teacher_id: teacherId,
    }));
    const { error: mapErr } = await supabase
      .from("class_teachers")
      .insert(rows);
    if (mapErr) throw mapErr;
  }

  if (options?.path) revalidatePath(options.path);
  return classId;
}

export async function updateClass(
  id: string,
  data: UpdateClassData,
  path?: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ ...data })
    .eq("id", id);
  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function getClassTeachers(classId: string): Promise<Teacher[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_teachers")
    .select("teachers(*)")
    .eq("class_id", classId);
  if (error) throw error;
  const teachersData = data as unknown as
    | Array<{ teachers: Teacher | null }>
    | null
    | undefined;
  const teachers: Teacher[] =
    teachersData
      ?.map((row) => row.teachers)
      .filter((t): t is Teacher => Boolean(t)) || [];
  return teachers;
}

export async function setClassTeachers(
  classId: string,
  teacherIds: string[],
  path?: string
): Promise<void> {
  const supabase = await createClient();
  const { error: delErr } = await supabase
    .from("class_teachers")
    .delete()
    .eq("class_id", classId);
  if (delErr) throw delErr;

  if (teacherIds.length > 0) {
    const rows = teacherIds.map((tid) => ({
      class_id: classId,
      teacher_id: tid,
    }));
    const { error: insErr } = await supabase
      .from("class_teachers")
      .insert(rows);
    if (insErr) throw insErr;
  }

  if (path) revalidatePath(path);
}

export type EnrollmentStatus = "trial" | "active" | "inactive";

export interface ClassStudentItem {
  enrollment_id: string;
  status: EnrollmentStatus;
  student: Student;
}

export async function getClassStudents(
  classId: string,
  opts?: { status?: EnrollmentStatus }
): Promise<ClassStudentItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("student_class_enrollments")
    .select("id,status,students(*)")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (opts?.status) {
    q = q.eq("status", opts.status);
  }

  const { data, error } = await q;
  if (error) throw error;
  const rows = data as unknown as
    | Array<{
        id: string;
        status: EnrollmentStatus;
        students: Student;
      }>
    | null
    | undefined;
  const items: ClassStudentItem[] =
    rows?.map((row) => ({
      enrollment_id: row.id,
      status: row.status,
      student: row.students,
    })) || [];
  return items;
}

export async function enrollStudent(
  classId: string,
  studentId: string,
  data?: { enrollment_date?: string; status?: EnrollmentStatus },
  path?: string
): Promise<void> {
  const supabase = await createClient();

  // Check if student is already enrolled
  const { data: existing } = await supabase
    .from("student_class_enrollments")
    .select("id")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .single();

  if (existing) {
    throw new Error("Học sinh đã có trong lớp này");
  }

  const enrollmentDate =
    data?.enrollment_date || new Date().toISOString().split("T")[0];
  const status = data?.status || "trial";

  const { error } = await supabase.from("student_class_enrollments").insert({
    class_id: classId,
    student_id: studentId,
    enrollment_date: enrollmentDate,
    status,
  });

  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function enrollStudents(
  classId: string,
  studentIds: string[],
  data?: { enrollment_date?: string; status?: EnrollmentStatus },
  path?: string
): Promise<void> {
  if (studentIds.length === 0) return;

  const supabase = await createClient();

  // Check for existing enrollments
  const { data: existing } = await supabase
    .from("student_class_enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .in("student_id", studentIds);

  if (existing && existing.length > 0) {
    const existingIds = existing.map((e) => e.student_id);
    const duplicates = studentIds.filter((id) => existingIds.includes(id));
    throw new Error(`Học sinh đã có trong lớp: ${duplicates.length} học sinh`);
  }

  const enrollmentDate =
    data?.enrollment_date || new Date().toISOString().split("T")[0];
  const status = data?.status || "trial";

  const rows = studentIds.map((studentId) => ({
    class_id: classId,
    student_id: studentId,
    enrollment_date: enrollmentDate,
    status,
  }));

  const { error } = await supabase
    .from("student_class_enrollments")
    .insert(rows);

  if (error) throw error;
  if (path) revalidatePath(path);
}
