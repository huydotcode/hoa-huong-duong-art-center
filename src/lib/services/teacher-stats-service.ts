"use server";

import { createClient } from "@/lib/supabase/server";
import { getTeacherIdFromSession } from "./teacher-attendance-service";

export type TeacherStats = {
  classes: number;
  students: number;
};

export async function getTeacherStats(): Promise<TeacherStats> {
  const supabase = await createClient();
  const teacherId = await getTeacherIdFromSession();

  if (!teacherId) {
    return { classes: 0, students: 0 };
  }

  // Lấy số lớp học của giáo viên
  const { data: teacherClasses, count: classesCount } = await supabase
    .from("class_teachers")
    .select("class_id", { count: "exact", head: false })
    .eq("teacher_id", teacherId);

  const classIds =
    teacherClasses?.map((tc) => String(tc.class_id)) || [];

  // Lấy số học sinh trong các lớp của giáo viên
  const { count: studentsCount } = await supabase
    .from("student_class_enrollments")
    .select("id", { count: "exact", head: true })
    .in("class_id", classIds)
    .eq("status", "active");

  return {
    classes: classesCount || 0,
    students: studentsCount || 0,
  };
}

