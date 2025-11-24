"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  CreateTeacherData,
  Teacher,
  UpdateTeacherData,
} from "@/types/database";
import { revalidatePath } from "next/cache";
import { normalizeText, normalizePhone } from "@/lib/utils";

// Re-export for convenience
export type { CreateTeacherData, Teacher, UpdateTeacherData };

export async function getTeachers(query?: string): Promise<Teacher[]> {
  const supabase = await createClient();

  // Fetch all teachers first
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Error fetching teachers:", error);
    return [];
  }

  if (!data) return [];

  const q = (query || "").trim();

  // If no query, return all teachers
  if (q.length === 0) {
    return data || [];
  }

  // Filter client-side with diacritic-insensitive search
  const normalizedQuery = normalizeText(q);
  const normalizedQueryForPhone = normalizePhone(q);

  const filtered = (data as Teacher[]).filter((teacher) => {
    // Search by full_name (diacritic-insensitive)
    const nameMatch = teacher.full_name
      ? normalizeText(teacher.full_name).includes(normalizedQuery)
      : false;

    // Search by phone (remove separators)
    const phoneMatch = teacher.phone
      ? normalizePhone(teacher.phone).includes(normalizedQueryForPhone)
      : false;

    return nameMatch || phoneMatch;
  });

  return filtered;
}

export async function createTeacher(data: CreateTeacherData, path?: string) {
  const supabase = await createClient();

  // Convert phone to E.164 format
  const phoneE164 = data.phone.startsWith("0")
    ? `+84${data.phone.substring(1)}`
    : data.phone;

  try {
    // Create auth user using admin API
    // Note: This requires SUPABASE_SERVICE_ROLE_KEY
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          phone: phoneE164,
          password: data.password,
          phone_confirm: true,
          app_metadata: { role: "teacher" },
        }),
      }
    );

    const authData = await response.json();
    if (authData.error_code === "phone_exists") {
      throw new Error("Số điện thoại đã tồn tại");
    }

    if (!response.ok) {
      throw new Error(authData.error?.message || "Failed to create user");
    }

    const userId = authData.id;

    // Create teacher record
    const { error: teacherError } = await supabase.from("teachers").insert({
      id: userId,
      full_name: data.full_name,
      phone: data.phone,
      notes: data.notes || null,
    });

    if (teacherError) {
      console.error("Error creating teacher:", teacherError);
      // Clean up: delete the auth user if teacher creation fails
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      throw new Error("Failed to create teacher record");
    }

    // Revalidate path if provided
    if (path) {
      revalidatePath(path);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in createTeacher:", error);
    throw error;
  }
}

export async function updateTeacher(
  id: string,
  data: UpdateTeacherData,
  path?: string
) {
  const supabase = await createClient();

  try {
    // Update only provided fields
    const updateData: Record<string, unknown> = {};

    if (data.full_name !== undefined) updateData.full_name = data.full_name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("teachers")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Error updating teacher:", error);
      throw new Error("Failed to update teacher");
    }

    // Revalidate path if provided
    if (path) {
      revalidatePath(path);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateTeacher:", error);
    throw error;
  }
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching teacher:", error);
    return null;
  }

  return data;
}

export async function deleteTeacher(id: string, path?: string) {
  const supabase = await createClient();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Thiếu cấu hình Supabase để xóa giáo viên");
  }

  try {
    const { data: assignments, error: assignmentsCheckError } = await supabase
      .from("class_teachers")
      .select("class_id")
      .eq("teacher_id", id);

    if (assignmentsCheckError) {
      console.error(
        "Error checking teacher assignments:",
        assignmentsCheckError
      );
      throw new Error("Không kiểm tra được tình trạng lớp của giáo viên");
    }

    if (assignments && assignments.length > 0) {
      throw new Error(
        "Không thể xóa giáo viên đang được phân công dạy lớp. Vui lòng chuyển hoặc xóa phân công trước."
      );
    }

    // Xóa phân công lớp trước để tránh lỗi ràng buộc
    const { error: assignmentsError } = await supabase
      .from("class_teachers")
      .delete()
      .eq("teacher_id", id);

    if (assignmentsError) {
      console.error("Error removing teacher assignments:", assignmentsError);
      throw new Error("Không thể xóa phân công lớp của giáo viên");
    }

    const { error: teacherError } = await supabase
      .from("teachers")
      .delete()
      .eq("id", id);

    if (teacherError) {
      console.error("Error deleting teacher:", teacherError);
      throw new Error("Không thể xóa giáo viên");
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      let errorMessage = "Không thể xóa tài khoản Supabase của giáo viên";
      try {
        const body = await response.json();
        if (body?.message) {
          errorMessage = body.message;
        }
      } catch (parseError) {
        console.error("Failed to parse Supabase delete response", parseError);
      }
      throw new Error(errorMessage);
    }

    if (path) {
      revalidatePath(path);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteTeacher:", error);
    throw error;
  }
}