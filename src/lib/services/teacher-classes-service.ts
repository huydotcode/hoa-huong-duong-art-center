"use server";

import { createClient } from "@/lib/supabase/server";
import type { ClassSchedule } from "@/types/database";

export interface TeacherClassListItem {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  days_of_week: ClassSchedule[];
  duration_minutes: number;
  current_student_count: number;
  max_student_count: number;
}

export async function getTeacherClasses(): Promise<TeacherClassListItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("teacher classes getUser error:", authError);
    return [];
  }

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("class_teachers")
    .select(
      `
      class:classes(
        id,
        name,
        start_date,
        end_date,
        days_of_week,
        duration_minutes,
        current_student_count,
        max_student_count
      )
    `
    )
    .eq("teacher_id", user.id);

  if (error) {
    console.error("Error fetching teacher classes:", error);
    return [];
  }

  const result: TeacherClassListItem[] = [];

  type SupabaseClassData = {
    id: string | number;
    name?: string | null;
    start_date: string;
    end_date: string;
    days_of_week?: unknown;
    duration_minutes?: number | null;
    current_student_count?: number | null;
    max_student_count?: number | null;
  };

  type SupabaseClassRow = {
    class: SupabaseClassData | SupabaseClassData[] | null;
  };

  ((data || []) as unknown as SupabaseClassRow[]).forEach((row) => {
    const cls = Array.isArray(row.class) ? row.class[0] : row.class;
    if (!cls) return;

    let days_of_week: ClassSchedule[] = [];
    try {
      if (Array.isArray(cls.days_of_week)) {
        days_of_week = cls.days_of_week as ClassSchedule[];
      } else if (cls.days_of_week) {
        days_of_week = JSON.parse(
          cls.days_of_week as string
        ) as ClassSchedule[];
      }
    } catch {
      days_of_week = [];
    }

    result.push({
      id: String(cls.id),
      name: String(cls.name || ""),
      start_date: String(cls.start_date),
      end_date: String(cls.end_date),
      days_of_week,
      duration_minutes: Number(cls.duration_minutes ?? 60),
      current_student_count: Number(cls.current_student_count ?? 0),
      max_student_count: Number(cls.max_student_count ?? 0),
    });
  });

  // Remove duplicates by class id (in case teacher assigned multiple times)
  const uniqueById = new Map<string, TeacherClassListItem>();
  result.forEach((item) => {
    uniqueById.set(item.id, item);
  });

  return Array.from(uniqueById.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
  );
}
