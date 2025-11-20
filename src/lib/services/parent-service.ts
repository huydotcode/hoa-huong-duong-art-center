import { createClient } from "@/lib/supabase/client";
import { normalizeText } from "@/lib/utils";

export interface ParentStudentInfo {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  enrollments?: Array<{
    class_id: string;
    status: "trial" | "active" | "inactive";
    score_1?: number | null;
    score_2?: number | null;
    score_3?: number | null;
    classes?:
      | {
          name: string;
          start_date: string;
          end_date: string;
          days_of_week: unknown;
        }
      | {
          name: string;
          start_date: string;
          end_date: string;
          days_of_week: unknown;
        }[];
  }>;
  attendanceStats?: Record<string, { present: number; total: number }>;
}

export interface ClassOption {
  id: string;
  name: string;
}

/**
 * Lấy danh sách lớp đang hoạt động
 */
export async function getActiveClasses(): Promise<ClassOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Fetch classes error:", error);
    throw new Error("Không thể tải danh sách lớp");
  }

  return (data ?? []).map((cls) => ({ id: cls.id, name: cls.name }));
}

/**
 * Lấy thông tin học sinh theo ID (load tất cả enrollments)
 */
export async function getStudentById(
  studentId: string
): Promise<ParentStudentInfo | null> {
  const supabase = createClient();

  // Load thông tin học sinh
  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select(
      `
      id,
      full_name,
      phone,
      parent_phone,
      is_active,
      created_at,
      updated_at
    `
    )
    .eq("id", studentId)
    .single();

  if (studentError || !studentData) {
    console.error("Load student error:", studentError);
    return null;
  }

  // Load tất cả enrollments của học sinh
  const { data: enrollmentsRes, error: enrollmentsError } = await supabase
    .from("student_class_enrollments")
    .select(
      `
      class_id,
      status,
      score_1,
      score_2,
      score_3,
      classes(
        name,
        start_date,
        end_date,
        days_of_week
      )
    `
    )
    .eq("student_id", studentId);

  if (enrollmentsError) {
    console.error("Fetch enrollments error:", enrollmentsError);
  }

  // Attendance stats for current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startISO = monthStart.toISOString().slice(0, 10);
  const endISO = nextMonthStart.toISOString().slice(0, 10);

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("attendance")
    .select("class_id, is_present, attendance_date")
    .eq("student_id", studentId)
    .gte("attendance_date", startISO)
    .lt("attendance_date", endISO);

  if (attendanceError) {
    console.error("Fetch attendance error:", attendanceError);
  }

  const attendanceStats: Record<string, { present: number; total: number }> =
    {};
  (attendanceRows || []).forEach(
    (row: { class_id: string; is_present: boolean }) => {
      const classId = String(row.class_id || "");
      if (!attendanceStats[classId]) {
        attendanceStats[classId] = { present: 0, total: 0 };
      }
      attendanceStats[classId].total += 1;
      if (row.is_present === true) {
        attendanceStats[classId].present += 1;
      }
    }
  );

  return {
    id: studentData.id as string,
    full_name: String(studentData.full_name || ""),
    phone: studentData.phone ?? null,
    parent_phone: studentData.parent_phone ?? null,
    is_active: Boolean(studentData.is_active),
    created_at: String(studentData.created_at),
    updated_at: String(studentData.updated_at),
    enrollments: (enrollmentsRes ?? []) as ParentStudentInfo["enrollments"],
    attendanceStats,
  };
}

/**
 * Tìm kiếm học sinh theo tên và lớp
 */
export async function searchStudent(
  studentName: string,
  classId: string
): Promise<ParentStudentInfo | null> {
  const supabase = createClient();
  const trimmedQuery = studentName.trim();

  if (trimmedQuery.length === 0 || !classId) {
    return null;
  }

  // Query học sinh trong lớp, sau đó filter client-side với normalizeText
  const { data, error } = await supabase
    .from("students")
    .select(
      `
      id,
      full_name,
      phone,
      parent_phone,
      is_active,
      created_at,
      updated_at,
      enrollments:student_class_enrollments!inner(
        class_id,
        status,
        classes(
          name,
          start_date,
          end_date,
          days_of_week
        )
      )
    `
    )
    .eq("student_class_enrollments.class_id", classId);

  if (error) {
    console.error("Search error:", error);
    throw new Error("Đã xảy ra lỗi khi tìm kiếm");
  }

  if (!data || data.length === 0) {
    return null;
  }

  const normalizedQuery = normalizeText(trimmedQuery);
  // Lọc client-side theo tên không dấu
  const filtered = data.filter((s) =>
    normalizeText(s.full_name || "").includes(normalizedQuery)
  );
  const preferred = filtered[0] || null;

  if (!preferred) {
    return null;
  }

  const studentId = preferred.id;

  // Load enrollments và attendance cho lớp được chọn
  const [enrollmentsRes] = await Promise.all([
    supabase
      .from("student_class_enrollments")
      .select(
        `
        class_id,
        status,
        score_1,
        score_2,
        score_3,
        classes(
          name,
          start_date,
          end_date,
          days_of_week
        )
      `
      )
      .eq("student_id", studentId)
      .eq("class_id", classId),
  ]);

  if (enrollmentsRes.error) {
    console.error("Fetch enrollments error:", enrollmentsRes.error);
  }

  // Attendance stats for current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startISO = monthStart.toISOString().slice(0, 10);
  const endISO = nextMonthStart.toISOString().slice(0, 10);

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("attendance")
    .select("class_id, is_present, attendance_date")
    .eq("student_id", studentId)
    .gte("attendance_date", startISO)
    .lt("attendance_date", endISO);

  if (attendanceError) {
    console.error("Fetch attendance error:", attendanceError);
  }

  const attendanceStats: Record<string, { present: number; total: number }> =
    {};
  (attendanceRows || []).forEach(
    (row: { class_id: string; is_present: boolean }) => {
      const classId = String(row.class_id || "");
      if (!attendanceStats[classId]) {
        attendanceStats[classId] = { present: 0, total: 0 };
      }
      attendanceStats[classId].total += 1;
      if (row.is_present === true) {
        attendanceStats[classId].present += 1;
      }
    }
  );

  return {
    id: preferred.id as string,
    full_name: String(preferred.full_name || ""),
    phone: preferred.phone ?? null,
    parent_phone: preferred.parent_phone ?? null,
    is_active: Boolean(preferred.is_active),
    created_at: String(preferred.created_at),
    updated_at: String(preferred.updated_at),
    enrollments: (enrollmentsRes.data ??
      []) as ParentStudentInfo["enrollments"],
    attendanceStats,
  };
}
