"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CreateAdminData {
  full_name: string;
  email: string;
  password: string;
}

interface ChangePasswordData {
  current_password: string;
  new_password: string;
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

export async function changePassword(data: ChangePasswordData): Promise<{
  success: true;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !user) {
    throw new Error("Không thể xác định tài khoản hiện tại.");
  }

  const identifier = user.email || user.phone;
  if (!identifier) {
    throw new Error("Tài khoản không có email hoặc số điện thoại.");
  }

  const signInResponse = await supabase.auth.signInWithPassword(
    user.email
      ? { email: user.email, password: data.current_password }
      : {
          phone: user.phone!,
          password: data.current_password,
        }
  );

  if (signInResponse.error) {
    throw new Error("Mật khẩu hiện tại không chính xác.");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: data.new_password,
  });

  if (updateError) {
    throw new Error(updateError.message || "Không thể đổi mật khẩu.");
  }

  return { success: true };
}
