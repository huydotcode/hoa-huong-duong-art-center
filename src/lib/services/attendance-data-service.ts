"use server";

import {
  getClassById,
  getClassStudentsLite,
  getClassTeachersLite,
} from "@/lib/services/admin-classes-service";
import {
  listAttendanceByClassDate,
  listTeacherAttendanceByClassDate,
  type AttendanceMap,
  type TeacherAttendanceMap,
} from "@/lib/services/attendance-service";
import type { Class } from "@/types";

export interface AttendancePageData {
  class: Class | null;
  students: Array<{ id: string; full_name: string; phone: string | null }>;
  teachers: Array<{ id: string; full_name: string; phone: string }>;
  attendanceMap: AttendanceMap;
  teacherAttendanceMap: TeacherAttendanceMap;
}

/**
 * Preload all data needed for attendance page in a single call
 * This reduces network round-trips from 5+ to 1
 */
export async function getAttendancePageData(
  classId: string,
  date: string
): Promise<AttendancePageData> {
  // Fetch all data in parallel
  const [classData, students, teachers, attendanceMap, teacherAttendanceMap] =
    await Promise.all([
      getClassById(classId),
      getClassStudentsLite(classId, { status: "active" }),
      getClassTeachersLite(classId),
      listAttendanceByClassDate(classId, date),
      listTeacherAttendanceByClassDate(classId, date),
    ]);

  return {
    class: classData,
    students,
    teachers,
    attendanceMap,
    teacherAttendanceMap,
  };
}
