"use server";
import { createClient } from "@/lib/supabase/server";
import {
  EnrollmentStatus,
  Student,
  StudentAttendanceTodayStatus,
  StudentClassSummary,
  StudentTuitionStatus,
  StudentWithClassSummary,
} from "@/types";
import { revalidatePath } from "next/cache";
import { normalizePhone, toArray } from "@/lib/utils";

export async function getStudents(
  query: string = "",
  opts: { limit?: number; offset?: number } = {}
): Promise<StudentWithClassSummary[]> {
  const supabase = await createClient();
  const now = new Date();
  const todayDayOfWeek = now.getDay();
  const todayISO = now.toISOString().slice(0, 10);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const limit = opts.limit ?? 30;
  const offset = opts.offset ?? 0;
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const selectColumns = `
    id,
    full_name,
    phone,
    parent_phone,
    is_active,
    created_at,
    updated_at,
    student_class_enrollments:student_class_enrollments (
      id,
      status,
      leave_date,
      class_id,
      enrollment_date,
      classes (
        id,
        name,
        is_active,
        days_of_week
      )
    )
  `;

  let request = supabase
    .from("students")
    .select(selectColumns)
    .order("full_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (hasQuery) {
    const sanitized = trimmed.replace(/[%_]/g, "\\$&");
    const pattern = `%${sanitized}%`;
    request = request.or(
      `full_name.ilike.${pattern},phone.ilike.${pattern},parent_phone.ilike.${pattern}`
    );
  }

  const { data, error } = await request;
  if (error) throw error;

  type RawEnrollment = {
    id: string;
    status: EnrollmentStatus;
    leave_date: string | null;
    class_id: string;
    enrollment_date: string | null;
    classes?:
      | {
          id?: string;
          name?: string;
          is_active?: boolean;
          days_of_week?: unknown;
        }
      | Array<{
          id?: string;
          name?: string;
          is_active?: boolean;
          days_of_week?: unknown;
        }>;
  };

  type RawStudent = Student & {
    student_class_enrollments?: RawEnrollment | RawEnrollment[];
  };

  const students = ((data as RawStudent[]) ?? []).map(
    ({ student_class_enrollments, ...rest }) => {
      const enrollmentsRaw = Array.isArray(student_class_enrollments)
        ? student_class_enrollments
        : student_class_enrollments
          ? [student_class_enrollments]
          : [];

      const class_summary: StudentClassSummary[] = [];
      let firstEnrollmentDate: string | null = null;
      let hasSessionToday = false;

      for (const enrollment of enrollmentsRaw) {
        const enrollmentDate = enrollment.enrollment_date;
        if (enrollmentDate) {
          if (!firstEnrollmentDate) {
            firstEnrollmentDate = enrollmentDate;
          } else {
            const currentFirst = new Date(firstEnrollmentDate);
            const candidate = new Date(enrollmentDate);
            if (
              !isNaN(candidate.getTime()) &&
              (isNaN(currentFirst.getTime()) ||
                candidate.getTime() < currentFirst.getTime())
            ) {
              firstEnrollmentDate = enrollmentDate;
            }
          }
        }

        const isActiveEnrollment =
          !enrollment.leave_date &&
          (enrollment.status === "active" || enrollment.status === "trial");

        if (!isActiveEnrollment) {
          continue;
        }

        const cls = Array.isArray(enrollment.classes)
          ? enrollment.classes[0]
          : enrollment.classes;

        if (!hasSessionToday && cls?.days_of_week) {
          const schedule = toArray<{ day?: number }>(cls.days_of_week);
          hasSessionToday = schedule.some(
            (item) => Number(item.day) === todayDayOfWeek
          );
        }

        class_summary.push({
          classId: cls?.id ?? enrollment.class_id,
          className: cls?.name ?? "Lớp chưa đặt tên",
          status: enrollment.status,
        });
      }

      return {
        ...rest,
        class_summary,
        first_enrollment_date: firstEnrollmentDate,
        has_session_today: hasSessionToday,
      } as StudentWithClassSummary;
    }
  );

  if (students.length === 0) {
    return students;
  }

  const studentIds = students.map((s) => s.id);

  const [
    { data: paymentData, error: paymentError },
    { data: attendanceData, error: attendanceError },
  ] = await Promise.all([
    supabase
      .from("payment_status")
      .select("student_id, is_paid")
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .in("student_id", studentIds),
    supabase
      .from("attendance")
      .select("student_id, is_present")
      .eq("attendance_date", todayISO)
      .in("student_id", studentIds)
      .not("student_id", "is", null),
  ]);

  if (paymentError) throw paymentError;
  if (attendanceError) throw attendanceError;

  const paymentMap = new Map<
    string,
    Array<{
      is_paid: boolean;
    }>
  >();
  (
    (paymentData as Array<{
      student_id: string | null;
      is_paid: boolean;
    }> | null) ?? []
  ).forEach((row) => {
    if (!row.student_id) return;
    if (!paymentMap.has(row.student_id)) {
      paymentMap.set(row.student_id, []);
    }
    paymentMap.get(row.student_id)!.push({ is_paid: row.is_paid });
  });

  const attendanceMap = new Map<
    string,
    Array<{
      is_present: boolean | null;
    }>
  >();
  (
    (attendanceData as Array<{
      student_id: string | null;
      is_present: boolean | null;
    }> | null) ?? []
  ).forEach((row) => {
    if (!row.student_id) return;
    if (!attendanceMap.has(row.student_id)) {
      attendanceMap.set(row.student_id, []);
    }
    attendanceMap.get(row.student_id)!.push({ is_present: row.is_present });
  });

  const resolveTuitionStatus = (
    payments: Array<{ is_paid: boolean }>
  ): StudentTuitionStatus => {
    if (!payments || payments.length === 0) return "not_created";
    const paidCount = payments.filter((p) => p.is_paid).length;
    if (paidCount === payments.length) return "paid";
    if (paidCount === 0) return "unpaid";
    return "partial";
  };

  const resolveAttendanceStatus = (
    hasSessionToday: boolean | undefined,
    records: Array<{ is_present: boolean | null }>
  ): StudentAttendanceTodayStatus => {
    if (!hasSessionToday) return "no_session";
    if (!records || records.length === 0) return "pending";
    if (records.some((r) => r.is_present === true)) return "present";
    if (records.some((r) => r.is_present === false)) return "absent";
    return "pending";
  };

  students.forEach((student) => {
    const tuitionStatus = resolveTuitionStatus(
      paymentMap.get(student.id) ?? []
    );
    const attendanceStatus = resolveAttendanceStatus(
      student.has_session_today,
      attendanceMap.get(student.id) ?? []
    );
    student.tuition_status = tuitionStatus;
    student.attendance_today_status = attendanceStatus;
  });

  return students;
}

// Add function to get total count (for pagination)
export async function getStudentsCount(query: string = ""): Promise<number> {
  const supabase = await createClient();

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  let request = supabase
    .from("students")
    .select("*", { count: "exact", head: true });

  if (hasQuery) {
    const sanitized = trimmed.replace(/[%_]/g, "\\$&");
    const pattern = `%${sanitized}%`;
    request = request.or(
      `full_name.ilike.${pattern},phone.ilike.${pattern},parent_phone.ilike.${pattern}`
    );
  }

  const { count, error } = await request;
  if (error) throw error;
  return count ?? 0;
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

  const { data: inserted, error } = await supabase
    .from("students")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  if (path) revalidatePath(path);

  return inserted as Student;
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

export async function deleteStudent(id: string, path?: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error(`Lỗi khi xóa học sinh: ${error.message}`);
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
  studentIds: Array<{ rowIndex: number; studentId: string }>;
}> {
  const supabase = await createClient();

  if (students.length === 0) {
    return { success: 0, errors: [], studentIds: [] };
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
    return { success: 0, errors, studentIds: [] };
  }

  // Bulk insert and return inserted rows with IDs
  const { data: inserted, error } = await supabase
    .from("students")
    .insert(toInsert)
    .select("id");

  if (error) {
    throw new Error(`Lỗi khi import học sinh: ${error.message}`);
  }

  // Map rowIndex to studentId
  const studentIds: Array<{ rowIndex: number; studentId: string }> = [];
  if (inserted && inserted.length > 0) {
    inserted.forEach((student, index) => {
      const rowIndex = normalizedStudents[index]?.rowIndex;
      if (rowIndex && student.id) {
        studentIds.push({
          rowIndex,
          studentId: student.id as string,
        });
      }
    });
  }

  if (path) revalidatePath(path);

  return {
    success: toInsert.length,
    errors,
    studentIds,
  };
}
