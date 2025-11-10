"use server";

import { revalidatePath } from "next/cache";

export interface CreateAdminData {
  full_name: string;
  email: string;
  password: string;
}

export async function createAdmin(
  data: CreateAdminData,
  path?: string
): Promise<{ success: true }> {
  try {
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
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            full_name: data.full_name,
          },
          app_metadata: {
            role: "admin",
          },
        }),
      }
    );

    const authData = await response.json();

    if (!response.ok) {
      const message =
        authData?.error_description ||
        authData?.error?.message ||
        "Không thể tạo tài khoản admin";
      throw new Error(message);
    }

    if (path) {
      revalidatePath(path);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in createAdmin:", error);
    throw error instanceof Error
      ? error
      : new Error("Không thể tạo tài khoản admin");
  }
}
