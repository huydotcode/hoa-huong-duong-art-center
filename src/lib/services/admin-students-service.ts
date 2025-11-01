"use server";
import { createClient } from "@/lib/supabase/server";
import { Student } from "@/types";
import { revalidatePath } from "next/cache";

export async function getStudents(query: string = ""): Promise<Student[]> {
  const supabase = await createClient();
  let q = supabase
    .from("students")
    .select("*")
    .order("full_name", { ascending: true });

  const trimmed = query.trim();
  if (trimmed.length > 0) {
    // Search by full_name or phone or parent_phone (case-insensitive contains)
    q = q.or(
      `full_name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%,parent_phone.ilike.%${trimmed}%`
    );
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as Student[]) || [];
}

type CreateStudentData = Pick<
  Student,
  "full_name" | "phone" | "parent_phone" | "is_active"
>;

export async function createStudent(
  data: Omit<CreateStudentData, "is_active" | "parent_phone"> & {
    is_active?: boolean;
    parent_phone?: string;
  },
  path?: string
) {
  const supabase = await createClient();
  const payload = {
    ...data,
    // nếu không có SĐT phụ huynh, mặc định = SĐT học sinh để tránh null
    parent_phone: data.parent_phone ?? data.phone,
    is_active: data.is_active ?? true,
  };
  const { error } = await supabase.from("students").insert(payload);
  if (error) throw error;
  if (path) revalidatePath(path);
}

type UpdateStudentData = Partial<
  Pick<Student, "full_name" | "phone" | "is_active">
>;

export async function updateStudent(
  id: string,
  data: UpdateStudentData,
  path?: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ ...data })
    .eq("id", id);
  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function updateStudentFromForm(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const is_active_raw = String(formData.get("is_active") || "");
  const path = String(formData.get("path") || "/admin/students");

  if (!id) return;

  const payload: UpdateStudentData = {};
  if (full_name) payload.full_name = full_name;
  if (phone) payload.phone = phone;
  if (is_active_raw) payload.is_active = is_active_raw === "true";

  await updateStudent(id, payload, path);
}
