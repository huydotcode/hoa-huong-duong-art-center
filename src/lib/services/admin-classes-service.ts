"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  Class,
  Teacher,
  Student,
  CreateClassData,
  UpdateClassData,
  EnrollmentStatus,
  ClassListItem,
  ClassTeacherItem,
  ClassStudentItem,
} from "@/types";
import { toArray } from "@/lib/utils";

/*
getClasses(query?, { is_active? }): trả về danh sách lớp có kèm đếm teachers_count, students_count dùng embed class_teachers(count), student_class_enrollments(count), sắp xếp theo tên.
getClassById(id): trả về Class | null.
createClass(data, { teacherIds?, path? }): tạo lớp, optional gán giáo viên ban đầu, revalidatePath(path), trả về classId.
updateClass(id, data, path?): cập nhật lớp, revalidatePath.
getClassTeachers(classId): trả về mảng Teacher từ bảng mapping.
setClassTeachers(classId, teacherIds, path?): replace toàn bộ mapping cho lớp.
getClassStudents(classId, { status? }): trả về danh sách enrollment dạng { enrollment_id, status, student } (join students(*)).
*/

export async function getClassesCount(
  query: string = "",
  opts?: { is_active?: boolean; subject?: string }
): Promise<number> {
  const supabase = await createClient();
  let q = supabase.from("classes").select("*", { count: "exact", head: true });

  const trimmed = query.trim();
  if (trimmed) {
    q = q.ilike("name", `%${trimmed}%`);
  }
  if (opts?.subject) {
    q = q.ilike("name", `%${opts.subject}%`);
  }
  if (opts?.is_active !== undefined) {
    q = q.eq("is_active", opts.is_active);
  }

  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function getClasses(
  query: string = "",
  opts?: { is_active?: boolean; limit?: number; subject?: string }
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
  if (opts?.subject) {
    q = q.ilike("name", `%${opts.subject}%`);
  }
  if (opts?.is_active !== undefined) {
    q = q.eq("is_active", opts.is_active);
  }
  if (opts?.limit !== undefined) {
    q = q.limit(opts.limit);
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
  const payload: CreateClassData = { ...data } as CreateClassData;
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

export async function updateClassDaySchedule(
  classId: string,
  daySchedules: Array<{ day: number; start_time: string; end_time?: string }>,
  path?: string,
  day?: number // Optional day parameter for when daySchedules is empty
): Promise<void> {
  const supabase = await createClient();

  // Get current class to merge with existing days_of_week
  const { data: currentClass, error: fetchError } = await supabase
    .from("classes")
    .select("days_of_week")
    .eq("id", classId)
    .single();

  if (fetchError) throw fetchError;

  const existingDays = toArray<{
    day: number;
    start_time: string;
    end_time?: string;
  }>(currentClass?.days_of_week);

  // Get the day to update - from daySchedules if available, otherwise from day parameter
  const dayToUpdate =
    daySchedules.length > 0 ? daySchedules[0].day : (day ?? null);

  if (dayToUpdate === null) {
    throw new Error("Không có ngày để cập nhật");
  }

  // Remove all schedules for the specific day
  const filteredDays = existingDays.filter((item) => item.day !== dayToUpdate);

  // Merge with new schedules (can be empty array to clear all schedules for the day)
  const updatedDaysOfWeek = [...filteredDays, ...daySchedules];

  const { error } = await supabase
    .from("classes")
    .update({ days_of_week: updatedDaysOfWeek })
    .eq("id", classId);

  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function getClassTeachers(
  classId: string
): Promise<ClassTeacherItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_teachers")
    .select("id,created_at,teachers(*)")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const teachersData = data as unknown as
    | Array<{
        id: string;
        created_at: string;
        teachers: Teacher | null;
      }>
    | null
    | undefined;
  const items: ClassTeacherItem[] =
    teachersData
      ?.map((row) => ({
        assignment_id: row.id,
        start_date: row.created_at,
        teacher: row.teachers,
      }))
      .filter((item): item is ClassTeacherItem => Boolean(item.teacher)) || [];
  return items;
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

export async function addClassTeachers(
  classId: string,
  teacherIds: string[],
  path?: string
): Promise<void> {
  if (teacherIds.length === 0) return;

  const supabase = await createClient();

  // Check for existing assignments
  const { data: existing } = await supabase
    .from("class_teachers")
    .select("teacher_id")
    .eq("class_id", classId)
    .in("teacher_id", teacherIds);

  if (existing && existing.length > 0) {
    const existingIds = existing.map((e) => e.teacher_id);
    const duplicates = teacherIds.filter((id) => existingIds.includes(id));
    throw new Error(
      `Giáo viên đã có trong lớp: ${duplicates.length} giáo viên`
    );
  }

  const rows = teacherIds.map((teacherId) => ({
    class_id: classId,
    teacher_id: teacherId,
  }));

  const { error } = await supabase.from("class_teachers").insert(rows);

  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function removeClassTeacher(
  assignmentId: string,
  path?: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_teachers")
    .delete()
    .eq("id", assignmentId);
  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function getClassStudents(
  classId: string,
  opts?: { status?: EnrollmentStatus }
): Promise<ClassStudentItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("student_class_enrollments")
    .select("id,status,enrollment_date,students(*)")
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
        enrollment_date: string;
        students: Student;
      }>
    | null
    | undefined;
  const items: ClassStudentItem[] =
    rows?.map((row) => ({
      enrollment_id: row.id,
      status: row.status,
      enrollment_date: row.enrollment_date,
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

export async function removeClassEnrollments(
  classId: string,
  studentIds: string[],
  path?: string
): Promise<void> {
  if (studentIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("student_class_enrollments")
    .delete()
    .eq("class_id", classId)
    .in("student_id", studentIds);
  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function copyStudentsToClass(
  sourceClassId: string,
  targetClassId: string,
  studentIds: string[],
  options?: {
    enrollment_date?: string;
    status?: EnrollmentStatus;
    skipExisting?: boolean; // default true
    updateIfExists?: boolean; // default false
  },
  path?: string
): Promise<{ inserted: number; updated: number; skipped: number }> {
  if (studentIds.length === 0) return { inserted: 0, updated: 0, skipped: 0 };
  const supabase = await createClient();

  // Find existing in target
  const { data: existing } = await supabase
    .from("student_class_enrollments")
    .select("student_id, id")
    .eq("class_id", targetClassId)
    .in("student_id", studentIds);

  const existingRows = (existing || []) as Array<{
    student_id: string;
    id: string;
  }>;
  const existingIds = new Set(existingRows.map((e) => e.student_id));
  const toInsert = studentIds.filter((id) => !existingIds.has(id));
  const toUpdate = existingRows.map((e) => e.id);

  let inserted = 0;
  let updated = 0;
  let skipped = studentIds.length - toInsert.length;

  // Insert new
  if (toInsert.length > 0) {
    const enrollmentDate =
      options?.enrollment_date || new Date().toISOString().split("T")[0];
    const status = options?.status || "trial";
    const rows = toInsert.map((studentId) => ({
      class_id: targetClassId,
      student_id: studentId,
      enrollment_date: enrollmentDate,
      status,
    }));
    const { error: insErr } = await supabase
      .from("student_class_enrollments")
      .insert(rows);
    if (insErr) throw insErr;
    inserted = toInsert.length;
  }

  // Optionally update existing
  if (options?.updateIfExists && toUpdate.length > 0) {
    const patch: Partial<{
      status: EnrollmentStatus;
      enrollment_date: string;
    }> = {};
    if (options.status) patch.status = options.status;
    if (options.enrollment_date)
      patch.enrollment_date = options.enrollment_date;
    if (Object.keys(patch).length > 0) {
      const { error: updErr } = await supabase
        .from("student_class_enrollments")
        .update(patch)
        .in("id", toUpdate);
      if (updErr) throw updErr;
      updated = toUpdate.length;
      if (options?.skipExisting === false) skipped = 0; // treat as handled
    }
  }

  if (path) revalidatePath(path);
  return { inserted, updated, skipped };
}

export async function moveStudentsToClass(
  sourceClassId: string,
  targetClassId: string,
  studentIds: string[],
  options?: {
    enrollment_date?: string;
    status?: EnrollmentStatus;
    skipExisting?: boolean; // default true
    updateIfExists?: boolean; // default false
  },
  path?: string
): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  removedFromSource: number;
}> {
  const { inserted, updated, skipped } = await copyStudentsToClass(
    sourceClassId,
    targetClassId,
    studentIds,
    options,
    path
  );

  // Always remove from source regardless of duplicate state (policy for Cut)
  await removeClassEnrollments(sourceClassId, studentIds, path);
  return { inserted, updated, skipped, removedFromSource: studentIds.length };
}

export async function updateStudentEnrollment(
  enrollmentId: string,
  data: { status?: EnrollmentStatus; enrollment_date?: string },
  path?: string
): Promise<void> {
  const supabase = await createClient();
  const updateData: { status?: EnrollmentStatus; enrollment_date?: string } =
    {};
  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.enrollment_date !== undefined) {
    updateData.enrollment_date = data.enrollment_date;
  }
  const { error } = await supabase
    .from("student_class_enrollments")
    .update(updateData)
    .eq("id", enrollmentId);
  if (error) throw error;
  if (path) revalidatePath(path);
}
