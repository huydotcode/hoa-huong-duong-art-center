"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Teacher,
  CreateTeacherData,
  UpdateTeacherData,
} from "@/types/database";

// Re-export for convenience
export type { Teacher, CreateTeacherData, UpdateTeacherData };

export async function getTeachers(query?: string): Promise<Teacher[]> {
  const supabase = await createClient();

  let request = supabase.from("teachers").select("*").order("created_at", {
    ascending: false,
  });

  const q = (query || "").trim();
  if (q) {
    const qDigits = q.replace(/\D/g, "");
    // Supabase OR filter across name and phone
    // If phone digits present, match by digits; also match raw query for name
    const phoneFilter = qDigits
      ? `phone.ilike.%${qDigits}%`
      : `phone.ilike.%${q}%`;
    request = request.or(`full_name.ilike.%${q}%,${phoneFilter}`);
  }

  const { data, error } = await request;

  if (error) {
    console.error("Error fetching teachers:", error);
    return [];
  }

  return data || [];
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

    console.log({
      authData,
    });

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
      salary_per_session: data.salary_per_session,
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
    if (data.salary_per_session !== undefined)
      updateData.salary_per_session = data.salary_per_session;
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
