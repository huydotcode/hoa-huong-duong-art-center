"use server";

import { createClient } from "@/lib/supabase/server";
import type { Attendance } from "@/types";

export type AttendanceMap = Record<string, Record<string, boolean>>; // session_time -> (student_id -> is_present)
export type TeacherAttendanceMap = Record<string, Record<string, boolean>>; // session_time -> (teacher_id -> is_present)

export async function listAttendanceByClassDate(
  classId: string,
  date: string
): Promise<AttendanceMap> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("student_id, session_time, is_present")
    .eq("class_id", classId)
    .eq("attendance_date", date)
    .not("student_id", "is", null);
  if (error) throw error;

  const map: AttendanceMap = {};
  for (const row of (data as Array<{
    session_time: string | null;
    student_id: string | null;
    is_present: boolean;
  }>) || []) {
    const session = row.session_time;
    const studentId = row.student_id;
    const present = row.is_present;
    if (!session || !studentId) continue;
    if (!map[session]) map[session] = {};
    map[session][studentId] = present;
  }
  return map;
}

export async function listTeacherAttendanceByClassDate(
  classId: string,
  date: string
): Promise<TeacherAttendanceMap> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("teacher_id, session_time, is_present")
    .eq("class_id", classId)
    .eq("attendance_date", date)
    .not("teacher_id", "is", null);
  if (error) throw error;

  const map: TeacherAttendanceMap = {};
  for (const row of (data as Array<{
    session_time: string | null;
    teacher_id: string | null;
    is_present: boolean;
  }>) || []) {
    const session = row.session_time;
    const teacherId = row.teacher_id;
    const present = row.is_present;
    if (!session || !teacherId) continue;
    if (!map[session]) map[session] = {};
    map[session][teacherId] = present;
  }
  return map;
}

export async function getStudentAttendanceCell(params: {
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  session_time: string; // HH:MM
}): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("is_present")
    .eq("class_id", params.classId)
    .eq("student_id", params.studentId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time)
    .maybeSingle();
  if (error) throw error;
  return (data as { is_present: boolean } | null)?.is_present ?? null;
}

export async function getTeacherAttendanceCell(params: {
  classId: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  session_time: string; // HH:MM
}): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("is_present")
    .eq("class_id", params.classId)
    .eq("teacher_id", params.teacherId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time)
    .maybeSingle();
  if (error) throw error;
  return (data as { is_present: boolean } | null)?.is_present ?? null;
}

export async function getAttendanceByClassDateSession(
  classId: string,
  date: string,
  sessionTime: string
): Promise<Attendance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("class_id", classId)
    .eq("attendance_date", date)
    .eq("session_time", sessionTime);
  if (error) throw error;
  return (data as Attendance[]) || [];
}

export async function upsertStudentAttendance(params: {
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  session_time: string; // HH:MM
  is_present: boolean;
  marked_by: "teacher" | "admin";
  notes?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const normalizedNotes =
    params.notes !== undefined && params.notes !== null
      ? params.notes.trim().length > 0
        ? params.notes.trim()
        : null
      : undefined;

  // Check if record exists
  const { data: existing, error: checkError } = await supabase
    .from("attendance")
    .select("id")
    .eq("class_id", params.classId)
    .eq("student_id", params.studentId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    // Update existing record
    const updatePayload: Record<string, unknown> = {
      is_present: params.is_present,
      marked_by: params.marked_by,
    };
    if (normalizedNotes !== undefined) {
      updatePayload.notes = normalizedNotes;
    }
    const { error } = await supabase
      .from("attendance")
      .update(updatePayload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    // Insert new record
    const insertPayload: Record<string, unknown> = {
      class_id: params.classId,
      student_id: params.studentId,
      attendance_date: params.date,
      session_time: params.session_time,
      is_present: params.is_present,
      marked_by: params.marked_by,
    };
    if (normalizedNotes !== undefined) {
      insertPayload.notes = normalizedNotes;
    }
    const { error } = await supabase.from("attendance").insert(insertPayload);
    if (error) throw error;
  }
}

export async function removeStudentAttendance(params: {
  classId: string;
  studentId: string;
  date: string;
  session_time: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("class_id", params.classId)
    .eq("student_id", params.studentId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time);
  if (error) throw error;
}

export async function upsertTeacherAttendance(params: {
  classId: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  session_time: string; // HH:MM
  is_present: boolean;
  marked_by: "teacher" | "admin";
  notes?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const normalizedNotes =
    params.notes !== undefined && params.notes !== null
      ? params.notes.trim().length > 0
        ? params.notes.trim()
        : null
      : undefined;

  // Check if record exists
  const { data: existing, error: checkError } = await supabase
    .from("attendance")
    .select("id")
    .eq("class_id", params.classId)
    .eq("teacher_id", params.teacherId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existing) {
    // Update existing record
    const updatePayload: Record<string, unknown> = {
      is_present: params.is_present,
      marked_by: params.marked_by,
    };
    if (normalizedNotes !== undefined) {
      updatePayload.notes = normalizedNotes;
    }
    const { error } = await supabase
      .from("attendance")
      .update(updatePayload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    // Insert new record
    const insertPayload: Record<string, unknown> = {
      class_id: params.classId,
      teacher_id: params.teacherId,
      attendance_date: params.date,
      session_time: params.session_time,
      is_present: params.is_present,
      marked_by: params.marked_by,
    };
    if (normalizedNotes !== undefined) {
      insertPayload.notes = normalizedNotes;
    }
    const { error } = await supabase.from("attendance").insert(insertPayload);
    if (error) throw error;
  }
}

export async function updateStudentAttendanceNote(params: {
  classId: string;
  studentId: string;
  date: string;
  session_time: string;
  notes: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const normalized =
    params.notes && params.notes.trim().length > 0 ? params.notes.trim() : null;

  const { error } = await supabase
    .from("attendance")
    .update({ notes: normalized })
    .eq("class_id", params.classId)
    .eq("student_id", params.studentId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time);

  if (error) throw error;
}

export async function updateTeacherAttendanceNote(params: {
  classId: string;
  teacherId: string;
  date: string;
  session_time: string;
  notes: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const normalized =
    params.notes && params.notes.trim().length > 0 ? params.notes.trim() : null;

  const { error } = await supabase
    .from("attendance")
    .update({ notes: normalized })
    .eq("class_id", params.classId)
    .eq("teacher_id", params.teacherId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time);

  if (error) throw error;
}

export async function removeTeacherAttendance(params: {
  classId: string;
  teacherId: string;
  date: string;
  session_time: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("class_id", params.classId)
    .eq("teacher_id", params.teacherId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time);
  if (error) throw error;
}

/**
 * Bulk upsert student attendance records (optimized for batch operations)
 */
export async function bulkUpsertStudentAttendance(params: {
  classId: string;
  date: string;
  session_time: string;
  entries: Array<{ studentId: string; is_present: boolean }>;
  marked_by: "teacher" | "admin";
}): Promise<void> {
  const supabase = await createClient();
  if (params.entries.length === 0) return;

  const studentIds = params.entries.map((e) => e.studentId);

  // Delete existing records for these students in this session
  const { error: deleteError } = await supabase
    .from("attendance")
    .delete()
    .eq("class_id", params.classId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time)
    .in("student_id", studentIds)
    .not("student_id", "is", null);

  if (deleteError) throw deleteError;

  // Insert new records
  const records = params.entries.map((entry) => ({
    class_id: params.classId,
    student_id: entry.studentId,
    attendance_date: params.date,
    session_time: params.session_time,
    is_present: entry.is_present,
    marked_by: params.marked_by,
  }));

  const { error: insertError } = await supabase
    .from("attendance")
    .insert(records);

  if (insertError) throw insertError;
}

/**
 * Bulk upsert teacher attendance records (optimized for batch operations)
 */
export async function bulkUpsertTeacherAttendance(params: {
  classId: string;
  date: string;
  session_time: string;
  entries: Array<{ teacherId: string; is_present: boolean }>;
  marked_by: "teacher" | "admin";
}): Promise<void> {
  const supabase = await createClient();
  if (params.entries.length === 0) return;

  // For teachers, we need to check existence first (due to different upsert logic)
  // But for bulk, we can use a simpler approach: delete then insert
  const teacherIds = params.entries.map((e) => e.teacherId);

  // Delete existing records for these teachers in this session
  const { error: deleteError } = await supabase
    .from("attendance")
    .delete()
    .eq("class_id", params.classId)
    .eq("attendance_date", params.date)
    .eq("session_time", params.session_time)
    .in("teacher_id", teacherIds)
    .not("teacher_id", "is", null);

  if (deleteError) throw deleteError;

  // Insert new records
  const records = params.entries.map((entry) => ({
    class_id: params.classId,
    teacher_id: entry.teacherId,
    attendance_date: params.date,
    session_time: params.session_time,
    is_present: entry.is_present,
    marked_by: params.marked_by,
  }));

  const { error: insertError } = await supabase
    .from("attendance")
    .insert(records);

  if (insertError) throw insertError;
}
