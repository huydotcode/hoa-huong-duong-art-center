"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  TeacherSalaryDetail,
  TeacherSalarySummary,
} from "@/types/database";

/**
 * Tính tổng lương của một giáo viên trong tháng
 */
export async function getTeacherSalaryByMonth(
  teacherId: string,
  month: number,
  year: number
): Promise<number> {
  const supabase = await createClient();

  // Bước 1: Lấy danh sách lớp của giáo viên
  const { data: teacherClasses } = await supabase
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", teacherId);

  if (!teacherClasses || teacherClasses.length === 0) {
    return 0;
  }

  const classIds = teacherClasses.map((tc) => String(tc.class_id));

  // Bước 2: Lấy thông tin lương/buổi của từng lớp
  const { data: classes } = await supabase
    .from("classes")
    .select("id, salary_per_session")
    .in("id", classIds);

  if (!classes || classes.length === 0) {
    return 0;
  }

  const classSalaryMap = new Map(
    classes.map((c) => [String(c.id), Number(c.salary_per_session) || 0])
  );

  // Bước 3: Đếm số buổi có mặt trong tháng cho từng lớp
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Last day of month

  const { data: attendanceWithDates } = await supabase
    .from("attendance")
    .select("class_id, attendance_date, session_time")
    .eq("teacher_id", teacherId)
    .eq("is_present", true)
    .in("class_id", classIds)
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate);

  if (!attendanceWithDates || attendanceWithDates.length === 0) {
    return 0;
  }

  // Bước 4: Tính số buổi cho từng lớp
  // Mỗi (class_id, attendance_date, session_time) là một buổi riêng biệt
  const classSessionSet = new Map<string, Set<string>>(); // classId -> Set of "date_sessionTime"

  attendanceWithDates.forEach((att) => {
    const classId = String(att.class_id);
    const date = String(att.attendance_date);
    const sessionTime = String(att.session_time || "");
    const key = `${date}_${sessionTime}`;

    if (!classSessionSet.has(classId)) {
      classSessionSet.set(classId, new Set());
    }
    classSessionSet.get(classId)!.add(key);
  });

  // Bước 5: Tính tổng lương
  let totalSalary = 0;
  classSessionSet.forEach((sessionSet, classId) => {
    const sessions = sessionSet.size;
    const salaryPerSession = classSalaryMap.get(classId) || 0;
    totalSalary += salaryPerSession * sessions;
  });

  return totalSalary;
}

/**
 * Lấy chi tiết lương theo từng lớp của một giáo viên trong tháng
 */
export async function getTeacherSalaryDetails(
  teacherId: string,
  month: number,
  year: number
): Promise<TeacherSalaryDetail[]> {
  const supabase = await createClient();

  // Bước 1: Lấy danh sách lớp của giáo viên
  const { data: teacherClasses } = await supabase
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", teacherId);

  if (!teacherClasses || teacherClasses.length === 0) {
    return [];
  }

  const classIds = teacherClasses.map((tc) => String(tc.class_id));

  // Bước 2: Lấy thông tin lớp (tên và lương/buổi)
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, salary_per_session")
    .in("id", classIds);

  if (!classes || classes.length === 0) {
    return [];
  }

  const classInfoMap = new Map(
    classes.map((c) => [
      String(c.id),
      {
        name: String(c.name || ""),
        salaryPerSession: Number(c.salary_per_session) || 0,
      },
    ])
  );

  // Bước 3: Đếm số buổi có mặt trong tháng cho từng lớp
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data: attendanceWithDates } = await supabase
    .from("attendance")
    .select("class_id, attendance_date, session_time")
    .eq("teacher_id", teacherId)
    .eq("is_present", true)
    .in("class_id", classIds)
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate);

  // Bước 4: Tính số buổi cho từng lớp
  // Mỗi (class_id, attendance_date, session_time) là một buổi riêng biệt
  const classSessionMap = new Map<string, Set<string>>(); // classId -> Set of "date_sessionTime"

  if (attendanceWithDates) {
    attendanceWithDates.forEach((att) => {
      const classId = String(att.class_id);
      const date = String(att.attendance_date);
      const sessionTime = String(att.session_time || "");
      const key = `${date}_${sessionTime}`;

      if (!classSessionMap.has(classId)) {
        classSessionMap.set(classId, new Set());
      }
      classSessionMap.get(classId)!.add(key);
    });
  }

  // Bước 5: Tạo danh sách chi tiết
  const details: TeacherSalaryDetail[] = [];
  classInfoMap.forEach((info, classId) => {
    const sessionSet = classSessionMap.get(classId) || new Set();
    const sessions = sessionSet.size;
    const salaryPerSession = info.salaryPerSession;
    const totalSalary = sessions * salaryPerSession;

    details.push({
      classId,
      className: info.name,
      sessions,
      salaryPerSession,
      totalSalary,
    });
  });

  // Sắp xếp theo tên lớp
  return details.sort((a, b) => a.className.localeCompare(b.className, "vi"));
}

/**
 * Tính lương tất cả giáo viên trong tháng
 */
export async function getAllTeachersSalaryByMonth(
  month: number,
  year: number
): Promise<TeacherSalarySummary[]> {
  const supabase = await createClient();

  // Lấy danh sách tất cả giáo viên đang hoạt động
  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, full_name, phone")
    .eq("is_active", true);

  if (!teachers || teachers.length === 0) {
    return [];
  }

  // Tính lương cho từng giáo viên
  const summaries: TeacherSalarySummary[] = [];

  for (const teacher of teachers) {
    const teacherId = String(teacher.id);
    const details = await getTeacherSalaryDetails(teacherId, month, year);

    const totalSessions = details.reduce((sum, d) => sum + d.sessions, 0);
    const totalSalary = details.reduce((sum, d) => sum + d.totalSalary, 0);

    summaries.push({
      teacherId,
      teacherName: String(teacher.full_name),
      phone: String(teacher.phone || ""),
      totalSessions,
      totalSalary,
      details,
    });
  }

  // Sắp xếp theo tên giáo viên
  return summaries.sort((a, b) =>
    a.teacherName.localeCompare(b.teacherName, "vi")
  );
}

/**
 * Tính tổng lương tất cả giáo viên trong tháng (dùng cho dashboard)
 */
export async function getTotalTeachersSalaryByMonth(
  month: number,
  year: number
): Promise<number> {
  const summaries = await getAllTeachersSalaryByMonth(month, year);
  return summaries.reduce((sum, s) => sum + s.totalSalary, 0);
}
