"use server";
import { createClient } from "@/lib/supabase/server";
import { Student } from "@/types";
import { revalidatePath } from "next/cache";
import { normalizeText, normalizePhone, toArray } from "@/lib/utils";

export async function getStudents(query: string = ""): Promise<Student[]> {
  const supabase = await createClient();

  // Fetch all students first
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  const trimmed = query.trim();

  // If no query, return all students
  if (trimmed.length === 0) {
    return (data as Student[]) || [];
  }

  // Filter client-side with diacritic-insensitive search
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

  return filtered;
}

type CreateStudentData = Pick<
  Student,
  "full_name" | "phone" | "parent_phone" | "is_active"
>;

export async function createStudent(
  data: Omit<CreateStudentData, "is_active" | "parent_phone"> & {
    is_active?: boolean;
    parent_phone?: string;
  },
  path?: string
) {
  const supabase = await createClient();
  const payload = {
    ...data,
    // nếu không có SĐT phụ huynh, mặc định = SĐT học sinh để tránh null
    parent_phone: data.parent_phone ?? data.phone,
    is_active: data.is_active ?? true,
  };
  const { error } = await supabase.from("students").insert(payload);
  if (error) throw error;
  if (path) revalidatePath(path);
}

type UpdateStudentData = Partial<
  Pick<Student, "full_name" | "phone" | "is_active">
>;

export async function updateStudent(
  id: string,
  data: UpdateStudentData,
  path?: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ ...data })
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
