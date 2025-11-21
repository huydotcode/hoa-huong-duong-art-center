"use server";

import { revalidatePath } from "next/cache";
import { upsertTeacherSalaryExpense } from "@/lib/services/admin-expenses-service";

export type SaveTeacherSalaryExpenseInput = {
  teacherId: string;
  teacherName: string;
  amount: number;
  month: number;
  year: number;
  expenseDate?: string;
};

export async function saveTeacherSalaryExpense(
  input: SaveTeacherSalaryExpenseInput
): Promise<void> {
  await upsertTeacherSalaryExpense(input, undefined);
  revalidatePath("/admin/teachers/salary");
  revalidatePath("/admin/expenses");
}
