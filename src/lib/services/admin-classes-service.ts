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
import { toArray, normalizeText } from "@/lib/utils";
import { DAY_ORDER } from "@/lib/constants/schedule";

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
  // Use head: true to only get count, not data
  let q = supabase.from("classes").select("id", { count: "exact", head: true });

  const trimmed = query.trim();
  const sanitizedQuery = trimmed.replace(/[%_]/g, "\\$&");
  if (sanitizedQuery) {
    q = q.ilike("name", `%${sanitizedQuery}%`);
  }
  if (opts?.subject) {
    const sanitizedSubject = opts.subject.trim().replace(/[%_]/g, "\\$&");
    if (sanitizedSubject) {
      q = q.ilike("name", `%${sanitizedSubject}%`);
    }
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
  opts?: {
    is_active?: boolean;
    limit?: number;
    offset?: number;
    subject?: string;
  }
): Promise<ClassListItem[]> {
  const supabase = await createClient();
  const trimmedQuery = query.trim();
  const trimmedSubject = opts?.subject?.trim() ?? "";
  const hasQuery = trimmedQuery.length > 0;
  const hasSubjectFilter = trimmedSubject.length > 0;

  // Use relationship counts via PostgREST embedding
  let q = supabase
    .from("classes")
    .select(`*, class_teachers(count), student_class_enrollments(count)`)
    .order("name", { ascending: true });

  if (opts?.is_active !== undefined) {
    q = q.eq("is_active", opts.is_active);
  }

  const sanitizedQuery = trimmedQuery.replace(/[%_]/g, "\\$&");
  if (sanitizedQuery) {
    q = q.ilike("name", `%${sanitizedQuery}%`);
  }
  const sanitizedSubject = trimmedSubject.replace(/[%_]/g, "\\$&");
  if (sanitizedSubject) {
    q = q.ilike("name", `%${sanitizedSubject}%`);
  }

  if (typeof opts?.limit === "number") {
    const offset = Math.max(opts.offset ?? 0, 0);
    const limit = Math.max(opts.limit, 0);
    if (limit > 0) {
      q = q.range(offset, offset + limit - 1);
    }
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

/**
 * Get only id and name of all classes (lightweight query for dropdowns)
 */
export async function getClassesIdAndName(
  excludeClassId?: string
): Promise<Array<{ id: string; name: string }>> {
  const supabase = await createClient();
  let q = supabase
    .from("classes")
    .select("id, name")
    .order("name", { ascending: true });

  if (excludeClassId) {
    q = q.neq("id", excludeClassId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as Array<{ id: string; name: string }>) || [];
}

/**
 * Check if a class name already exists (case-insensitive)
 * @param name Class name to check
 * @param excludeId Optional class ID to exclude from check (for update)
 * @returns true if name exists, false otherwise
 */
export async function checkClassNameExists(
  name: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from("classes")
    .select("id", { count: "exact", head: true })
    .ilike("name", name.trim()); // Case-insensitive search

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createClass(
  data: CreateClassData,
  options?: { teacherIds?: string[]; path?: string }
): Promise<string> {
  const supabase = await createClient();

  // Check if class name already exists
  const nameExists = await checkClassNameExists(data.name);
  if (nameExists) {
    throw new Error("Tên lớp đã tồn tại. Vui lòng chọn tên khác.");
  }

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

  // Check if class name already exists (exclude current class)
  if (data.name) {
    const nameExists = await checkClassNameExists(data.name, id);
    if (nameExists) {
      throw new Error("Tên lớp đã tồn tại. Vui lòng chọn tên khác.");
    }
  }

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

  // Sort daySchedules by start_time within the same day
  const sortedDaySchedules = [...daySchedules].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  // Merge with new schedules (can be empty array to clear all schedules for the day)
  const updatedDaysOfWeek = [...filteredDays, ...sortedDaySchedules];

  // Sort by day (DAY_ORDER: 1,2,3,4,5,6,0) then by start_time within each day
  const dayOrderMap = new Map<number, number>(DAY_ORDER.map((d, i) => [d, i]));

  const sortedDaysOfWeek = updatedDaysOfWeek.sort((a, b) => {
    // First sort by day order
    const dayOrderA = dayOrderMap.get(a.day) ?? 999;
    const dayOrderB = dayOrderMap.get(b.day) ?? 999;

    if (dayOrderA !== dayOrderB) {
      return dayOrderA - dayOrderB;
    }

    // If same day, sort by start_time
    return a.start_time.localeCompare(b.start_time);
  });

  const { error } = await supabase
    .from("classes")
    .update({ days_of_week: sortedDaysOfWeek })
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

/**
 * Get lightweight teacher data for attendance (only id, full_name, phone)
 */
export async function getClassTeachersLite(
  classId: string
): Promise<Array<{ id: string; full_name: string; phone: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_teachers")
    .select("teachers(id, full_name, phone)")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const teachers: Array<{ id: string; full_name: string; phone: string }> = [];
  for (const row of (data || []) as unknown as Array<{
    teachers:
      | Teacher
      | null
      | { id: string; full_name: string; phone: string }
      | null;
  }>) {
    const teacher = row.teachers;
    if (teacher && typeof teacher === "object" && "id" in teacher) {
      teachers.push({
        id: teacher.id,
        full_name: teacher.full_name,
        phone: teacher.phone,
      });
    }
  }

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
    .select("id,status,enrollment_date,leave_date,leave_reason,students(*)")
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
        leave_date: string | null;
        leave_reason: string | null;
        students: Student;
      }>
    | null
    | undefined;
  const items: ClassStudentItem[] =
    rows?.map((row) => ({
      enrollment_id: row.id,
      status: row.status,
      enrollment_date: row.enrollment_date,
      leave_date: row.leave_date,
      leave_reason: row.leave_reason,
      student: row.students,
    })) || [];
  return items;
}

/**
 * Get lightweight student data for attendance (only id, full_name, phone)
 */
export async function getClassStudentsLite(
  classId: string,
  opts?: { status?: EnrollmentStatus }
): Promise<Array<{ id: string; full_name: string; phone: string | null }>> {
  const supabase = await createClient();
  let q = supabase
    .from("student_class_enrollments")
    .select("students(id, full_name, phone)")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (opts?.status) {
    q = q.eq("status", opts.status);
  }

  const { data, error } = await q;
  if (error) throw error;

  const students: Array<{
    id: string;
    full_name: string;
    phone: string | null;
  }> = [];
  for (const row of (data || []) as unknown as Array<{
    students:
      | Student
      | null
      | { id: string; full_name: string; phone: string | null }
      | null;
  }>) {
    const student = row.students;
    if (student && typeof student === "object" && "id" in student) {
      students.push({
        id: student.id,
        full_name: student.full_name,
        phone: student.phone,
      });
    }
  }

  return students;
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

/**
 * Deactivate student enrollments by setting leave_date and leave_reason
 * instead of deleting the record (preserves history)
 */
export async function deactivateStudentEnrollments(
  classId: string,
  studentIds: string[],
  options?: {
    leave_date?: string;
    leave_reason?: string;
  },
  path?: string
): Promise<void> {
  if (studentIds.length === 0) return;
  const supabase = await createClient();

  // Get enrollment IDs for the students
  const { data: enrollments } = await supabase
    .from("student_class_enrollments")
    .select("id")
    .eq("class_id", classId)
    .in("student_id", studentIds);

  if (!enrollments || enrollments.length === 0) return;

  const enrollmentIds = enrollments.map((e) => e.id);
  const leaveDate =
    options?.leave_date || new Date().toISOString().split("T")[0];
  const leaveReason = options?.leave_reason || "Xóa khỏi lớp";

  const { error } = await supabase
    .from("student_class_enrollments")
    .update({
      status: "inactive",
      leave_date: leaveDate,
      leave_reason: leaveReason,
    })
    .in("id", enrollmentIds);

  if (error) throw error;
  if (path) revalidatePath(path);
}

/**
 * Remove student enrollments (hard delete - use with caution)
 * Prefer deactivateStudentEnrollments to preserve history
 */
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

  // Deactivate enrollments in source class (preserves history with leave_date and leave_reason)
  // instead of deleting them
  await deactivateStudentEnrollments(
    sourceClassId,
    studentIds,
    {
      leave_date: new Date().toISOString().split("T")[0],
      leave_reason: "Chuyển lớp",
    },
    path
  );
  return { inserted, updated, skipped, removedFromSource: studentIds.length };
}

export async function updateStudentEnrollment(
  enrollmentId: string,
  data: {
    status?: EnrollmentStatus;
    enrollment_date?: string;
    leave_date?: string | null;
    leave_reason?: string | null;
  },
  path?: string
): Promise<void> {
  const supabase = await createClient();

  // Get current enrollment to check old status
  const { data: currentEnrollment } = await supabase
    .from("student_class_enrollments")
    .select("status, leave_date")
    .eq("id", enrollmentId)
    .single();

  const oldStatus = currentEnrollment?.status;
  const updateData: {
    status?: EnrollmentStatus;
    enrollment_date?: string;
    leave_date?: string | null;
    leave_reason?: string | null;
  } = {};

  // Handle status changes
  if (data.status !== undefined) {
    updateData.status = data.status;

    // Auto-set leave_date when status changes to "inactive"
    if (data.status === "inactive" && oldStatus !== "inactive") {
      // If leave_date is explicitly provided, use it; otherwise set to today
      if (data.leave_date !== undefined) {
        updateData.leave_date = data.leave_date;
      } else {
        updateData.leave_date = new Date().toISOString().split("T")[0];
      }
      // If leave_reason is explicitly provided, use it; otherwise keep existing or null
      if (data.leave_reason !== undefined) {
        updateData.leave_reason = data.leave_reason;
      }
    }

    // Clear leave_date and leave_reason when reactivating from "inactive"
    if (data.status !== "inactive" && oldStatus === "inactive") {
      updateData.leave_date = null;
      updateData.leave_reason = null;
    }
  }

  // Handle enrollment_date updates
  if (data.enrollment_date !== undefined) {
    updateData.enrollment_date = data.enrollment_date;
  }

  // Allow explicit setting of leave_date and leave_reason (only if status is not changing)
  // If status is changing, the logic above handles it
  if (data.status === undefined) {
    // Only allow explicit setting if status is not being changed
    if (data.leave_date !== undefined) {
      updateData.leave_date = data.leave_date;
    }
    if (data.leave_reason !== undefined) {
      updateData.leave_reason = data.leave_reason;
    }
  } else if (data.status === "inactive") {
    // If status is being set to inactive, allow explicit override of leave_date/leave_reason
    if (data.leave_date !== undefined) {
      updateData.leave_date = data.leave_date;
    }
    if (data.leave_reason !== undefined) {
      updateData.leave_reason = data.leave_reason;
    }
  }

  const { error } = await supabase
    .from("student_class_enrollments")
    .update(updateData)
    .eq("id", enrollmentId);
  if (error) throw error;
  if (path) revalidatePath(path);
}

/**
 * Get classes by subject (matching class name with subject)
 */
export async function getClassesBySubject(
  subject: string,
  excludeClassIds?: string[]
): Promise<ClassListItem[]> {
  const supabase = await createClient();
  const normalizedSubject = normalizeText(subject.trim());

  // Fetch all active classes
  const q = supabase
    .from("classes")
    .select(`*, class_teachers(count), student_class_enrollments(count)`, {
      count: "exact",
    })
    .eq("is_active", true)
    .order("name", { ascending: true });

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

  // Filter by subject (diacritic-insensitive)
  const filtered = mapped.filter((item) => {
    const normalizedName = normalizeText(item.name);
    const matchesSubject = normalizedName.includes(normalizedSubject);

    // Exclude specified class IDs
    if (excludeClassIds && excludeClassIds.includes(item.id)) {
      return false;
    }

    return matchesSubject;
  });

  return filtered;
}
