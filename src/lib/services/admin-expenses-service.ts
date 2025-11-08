"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Expense,
  CreateExpenseData,
  UpdateExpenseData,
} from "@/types/database";
import { isTeacherSalaryExpense } from "@/lib/utils/expense";

export async function getExpenses(
  month?: number,
  year?: number,
  query?: string
): Promise<Expense[]> {
  const supabase = await createClient();
  let q = supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });

  if (month !== undefined) {
    q = q.eq("month", month);
  }
  if (year !== undefined) {
    q = q.eq("year", year);
  }

  const { data, error } = await q;
  if (error) throw error;

  let expenses = (data as Expense[]) || [];

  // Filter by reason if query provided
  if (query && query.trim().length > 0) {
    const trimmedQuery = query.trim().toLowerCase();
    expenses = expenses.filter((expense) =>
      expense.reason.toLowerCase().includes(trimmedQuery)
    );
  }

  return expenses;
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw error;
  }

  return (data as Expense) || null;
}

export async function createExpense(
  data: CreateExpenseData,
  path?: string
): Promise<string> {
  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("expenses")
    .insert(data)
    .select("id")
    .single();

  if (error) throw error;
  if (path) revalidatePath(path);
  return inserted?.id as string;
}

export async function updateExpense(
  id: string,
  data: UpdateExpenseData,
  path?: string
): Promise<void> {
  const supabase = await createClient();

  // Kiểm tra xem expense có phải là lương giáo viên không
  const { data: existingExpense, error: fetchError } = await supabase
    .from("expenses")
    .select("reason, month, year")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  if (existingExpense && isTeacherSalaryExpense(existingExpense)) {
    // Nếu là lương giáo viên, chỉ cho phép update amount
    // Không cho phép update reason, expense_date, month, year
    const restrictedData: UpdateExpenseData = {
      amount: data.amount,
    };
    const { error } = await supabase
      .from("expenses")
      .update({ ...restrictedData, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  } else {
    // Nếu không phải lương giáo viên, update bình thường
    const { error } = await supabase
      .from("expenses")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  }

  if (path) revalidatePath(path);
}

export async function deleteExpense(id: string, path?: string): Promise<void> {
  const supabase = await createClient();

  // Kiểm tra xem expense có phải là lương giáo viên không
  const { data: existingExpense, error: fetchError } = await supabase
    .from("expenses")
    .select("reason, month, year")
    .eq("id", id)
    .single();

  if (fetchError) {
    // Nếu không tìm thấy, có thể đã bị xóa rồi
    if (fetchError.code === "PGRST116") {
      return;
    }
    throw fetchError;
  }

  if (existingExpense && isTeacherSalaryExpense(existingExpense)) {
    throw new Error(
      "Không thể xóa chi phí lương giáo viên. Chi phí này được tự động quản lý bởi hệ thống."
    );
  }

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function getTotalExpensesByMonth(
  month: number,
  year: number
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("amount")
    .eq("month", month)
    .eq("year", year);

  if (error) throw error;

  const total =
    (data as { amount: number }[] | null)?.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    ) || 0;

  return total;
}

/**
 * Đồng bộ lương giáo viên vào expenses
 * Tự động tạo hoặc cập nhật chi phí lương giáo viên cho tháng/năm
 * @param month - Tháng (1-12)
 * @param year - Năm
 * @param shouldRevalidate - Có revalidate path không (mặc định false để tránh lỗi trong render)
 */
export async function syncTeacherSalaryExpense(
  month: number,
  year: number,
  shouldRevalidate: boolean = false
): Promise<void> {
  const supabase = await createClient();

  // Tính tổng lương giáo viên trong tháng
  const { getTotalTeachersSalaryByMonth } = await import(
    "./admin-teacher-salary-service"
  );
  const totalSalary = await getTotalTeachersSalaryByMonth(month, year);

  // Tạo reason với format "Lương giáo viên T{month}/{year}"
  const reason = `Lương giáo viên T${month}/${year}`;

  // Lấy tất cả expenses trong tháng
  const { data: allExpenses, error: fetchError } = await supabase
    .from("expenses")
    .select("id, amount, reason")
    .eq("month", month)
    .eq("year", year);

  if (fetchError) throw fetchError;

  // Tìm expense có reason chứa pattern lương giáo viên cho tháng này
  const existingExpense = allExpenses?.find(
    (exp) =>
      exp.reason.toLowerCase().includes("lương") &&
      exp.reason.includes(`T${month}/${year}`)
  );

  // Tạo expense_date là ngày cuối tháng
  const lastDayOfMonth = new Date(year, month, 0);
  const expenseDate = lastDayOfMonth.toISOString().split("T")[0];

  const path = shouldRevalidate ? "/admin/expenses" : undefined;

  if (totalSalary === 0) {
    // Nếu không có lương và đã có expense lương thì xóa
    if (existingExpense) {
      await deleteExpense(existingExpense.id, path);
    }
    return;
  }

  if (existingExpense) {
    // Update nếu đã tồn tại
    const needsUpdate =
      Number(existingExpense.amount) !== totalSalary ||
      existingExpense.reason !== reason;

    if (needsUpdate) {
      await updateExpense(
        existingExpense.id,
        {
          amount: totalSalary,
          reason: reason,
          expense_date: expenseDate,
        },
        path
      );
    }
  } else {
    // Create mới nếu chưa có
    await createExpense(
      {
        amount: totalSalary,
        reason: reason,
        expense_date: expenseDate,
        month,
        year,
      },
      path
    );
  }
}
