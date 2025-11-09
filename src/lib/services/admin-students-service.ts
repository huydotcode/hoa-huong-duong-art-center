"use server";
import { createClient } from "@/lib/supabase/server";
import { Student } from "@/types";
import { revalidatePath } from "next/cache";
import { normalizeText, normalizePhone, toArray } from "@/lib/utils";

export async function getStudents(
  query: string = "",
  opts?: { limit?: number; offset?: number }
): Promise<Student[]> {
  const supabase = await createClient();

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  // Fetch all students first (for client-side filtering when query exists)
  // If no query and has limit, use server-side pagination
  let q = supabase
    .from("students")
    .select("*")
    .order("full_name", { ascending: true });

  // Apply pagination only when no query (server-side pagination)
  if (!hasQuery && opts?.limit !== undefined) {
    const offset = opts.offset || 0;
    q = q.range(offset, offset + opts.limit - 1);
  }

  const { data, error } = await q;
  if (error) throw error;
  if (!data) return [];

  // If no query, return paginated results
  if (!hasQuery) {
    return (data as Student[]) || [];
  }

  // Filter client-side with diacritic-insensitive search (when query exists)
  const normalizedQuery = normalizeText(trimmed);
  const normalizedQueryForPhone = normalizePhone(trimmed);

  const filtered = (data as Student[]).filter((student) => {
    // Search by full_name (diacritic-insensitive)
    const nameMatch = student.full_name
      ? normalizeText(student.full_name).includes(normalizedQuery)
      : false;

    // Search by phone (remove separators)
    const phoneMatch = student.phone
      ? normalizePhone(student.phone).includes(normalizedQueryForPhone)
      : false;

    // Search by parent_phone (remove separators)
    const parentPhoneMatch = student.parent_phone
      ? normalizePhone(student.parent_phone).includes(normalizedQueryForPhone)
      : false;

    return nameMatch || phoneMatch || parentPhoneMatch;
  });

  // Apply client-side pagination for filtered results
  if (opts?.limit !== undefined) {
    const offset = opts.offset || 0;
    return filtered.slice(offset, offset + opts.limit);
  }

  return filtered;
}

// Add function to get total count (for pagination)
export async function getStudentsCount(query: string = ""): Promise<number> {
  const supabase = await createClient();

  // If query exists, we need to fetch all and filter client-side
  // Otherwise, we can use count query
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    const { count, error } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    return count ?? 0;
  }

  // For query, fetch all and count filtered results
  const { data, error } = await supabase.from("students").select("*");

  if (error) throw error;
  if (!data) return 0;

  const normalizedQuery = normalizeText(trimmed);
  const normalizedQueryForPhone = normalizePhone(trimmed);

  const filtered = (data as Student[]).filter((student) => {
    const nameMatch = student.full_name
      ? normalizeText(student.full_name).includes(normalizedQuery)
      : false;
    const phoneMatch = student.phone
      ? normalizePhone(student.phone).includes(normalizedQueryForPhone)
      : false;
    const parentPhoneMatch = student.parent_phone
      ? normalizePhone(student.parent_phone).includes(normalizedQueryForPhone)
      : false;
    return nameMatch || phoneMatch || parentPhoneMatch;
  });

  return filtered.length;
}

type CreateStudentData = Pick<
  Student,
  "full_name" | "phone" | "parent_phone" | "is_active"
>;

export async function createStudent(
  data: Omit<CreateStudentData, "is_active" | "parent_phone"> & {
    is_active?: boolean;
    parent_phone?: string | null;
  },
  path?: string
) {
  const supabase = await createClient();

  // Normalize phone: convert empty string to null, normalize if provided
  const normalizedPhone = data.phone
    ? data.phone.trim() === ""
      ? null
      : normalizePhone(data.phone)
    : null;

  // Normalize parent_phone: convert empty string to null, normalize if provided
  // If parent_phone is not provided, use phone as default
  const normalizedParentPhone = data.parent_phone
    ? data.parent_phone.trim() === ""
      ? null
      : normalizePhone(data.parent_phone)
    : normalizedPhone;

  const payload = {
    full_name: data.full_name.trim(),
    phone: normalizedPhone,
    parent_phone: normalizedParentPhone,
    is_active: data.is_active ?? true,
  };

  const { error } = await supabase.from("students").insert(payload);
  if (error) throw error;
  if (path) revalidatePath(path);
}

type UpdateStudentData = Partial<
  Pick<Student, "full_name" | "phone" | "parent_phone" | "is_active">
>;

export async function updateStudent(
  id: string,
  data: UpdateStudentData,
  path?: string
) {
  const supabase = await createClient();

  // Prepare update payload with normalized values
  const updatePayload: UpdateStudentData = {};

  if (data.full_name !== undefined) {
    updatePayload.full_name = data.full_name.trim();
  }

  if (data.phone !== undefined) {
    // Convert empty string to null, normalize if provided
    updatePayload.phone = data.phone
      ? data.phone.trim() === ""
        ? null
        : normalizePhone(data.phone)
      : null;
  }

  if (data.parent_phone !== undefined) {
    // Convert empty string to null, normalize if provided
    updatePayload.parent_phone = data.parent_phone
      ? data.parent_phone.trim() === ""
        ? null
        : normalizePhone(data.parent_phone)
      : null;
  }

  if (data.is_active !== undefined) {
    updatePayload.is_active = data.is_active;
  }

  const { error } = await supabase
    .from("students")
    .update(updatePayload)
    .eq("id", id);
  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function updateStudentFromForm(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const is_active_raw = String(formData.get("is_active") || "");
  const path = String(formData.get("path") || "/admin/students");

  if (!id) return;

  const payload: UpdateStudentData = {};
  if (full_name) payload.full_name = full_name;
  if (phone) payload.phone = phone;
  if (is_active_raw) payload.is_active = is_active_raw === "true";

  await updateStudent(id, payload, path);
}

/**
 * Get all current classes a student is enrolled in (active or trial, not left)
 */
export async function getStudentCurrentClasses(studentId: string): Promise<
  Array<{
    enrollmentId: string;
    classId: string;
    className: string;
    daysOfWeek: Array<{
      day: number;
      start_time: string;
      end_time?: string;
    }>;
    durationMinutes: number;
    enrollmentDate: string;
    status: "trial" | "active" | "inactive";
  }>
> {
  const supabase = await createClient();

  const { data: enrollments, error } = await supabase
    .from("student_class_enrollments")
    .select(
      `
      id,
      class_id,
      enrollment_date,
      status,
      classes(id, name, days_of_week, duration_minutes, is_active)
    `
    )
    .eq("student_id", studentId)
    .in("status", ["active", "trial"])
    .is("leave_date", null);

  if (error) throw error;
  if (!enrollments || enrollments.length === 0) return [];

  return enrollments
    .filter((e) => {
      const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
      return classData?.is_active === true;
    })
    .map((e) => {
      const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
      return {
        enrollmentId: e.id,
        classId: e.class_id,
        className: classData?.name || "",
        daysOfWeek: toArray<{
          day: number;
          start_time: string;
          end_time?: string;
        }>(classData?.days_of_week || []),
        durationMinutes: Number(classData?.duration_minutes || 0),
        enrollmentDate: e.enrollment_date,
        status: e.status as "trial" | "active" | "inactive",
      };
    });
}

/**
 * Import students from Excel file
 * @param students Array of student data to import
 * @param path Optional path to revalidate after import
 * @returns Result with success count and errors
 */
export async function importStudentsFromExcel(
  students: Array<{ full_name: string; phone: string; rowIndex?: number }>,
  path?: string
): Promise<{
  success: number;
  errors: Array<{ row: number; errors: string[] }>;
}> {
  const supabase = await createClient();

  if (students.length === 0) {
    return { success: 0, errors: [] };
  }

  // Normalize all phone numbers first to ensure consistency
  // If phone is empty after normalization, set to null
  // Allow duplicate phones - no duplicate check needed
  const normalizedStudents = students.map((s) => {
    const normalizedPhone = normalizePhone(s.phone);
    const phone =
      normalizedPhone && normalizedPhone.length > 0 ? normalizedPhone : null;

    return {
      ...s,
      phone,
    };
  });

  // Prepare insert data - duplicate phones are allowed
  const toInsert: Array<{
    full_name: string;
    phone: string | null;
    parent_phone: string | null;
    is_active: boolean;
  }> = [];

  const errors: Array<{ row: number; errors: string[] }> = [];

  normalizedStudents.forEach((student) => {
    toInsert.push({
      full_name: student.full_name.trim(),
      phone: student.phone, // Can be null, can be duplicate
      parent_phone: student.phone, // Use phone as parent_phone, or null if phone is null
      is_active: true,
    });
  });

  if (toInsert.length === 0) {
    return { success: 0, errors };
  }

  // Bulk insert
  const { error } = await supabase.from("students").insert(toInsert);

  if (error) {
    throw new Error(`Lỗi khi import học sinh: ${error.message}`);
  }

  if (path) revalidatePath(path);

  return {
    success: toInsert.length,
    errors,
  };
}
