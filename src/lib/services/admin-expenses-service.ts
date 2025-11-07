"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  Expense,
  CreateExpenseData,
  UpdateExpenseData,
} from "@/types/database";

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
  const { error } = await supabase
    .from("expenses")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function deleteExpense(id: string, path?: string): Promise<void> {
  const supabase = await createClient();
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
