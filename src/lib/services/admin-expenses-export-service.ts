"use server";

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { normalizeText } from "@/lib/utils";
import type { Expense } from "@/types/database";

type ExportExpensesInput = {
  month?: number;
  year: number;
  query?: string;
  viewMode: "month" | "year";
};

function formatDate(dateString: string): string {
  if (!dateString) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function filterExpenses(expenses: Expense[], query?: string): Expense[] {
  if (!query) return expenses;
  const normalizedQuery = normalizeText(query);
  return expenses.filter((expense) =>
    normalizeText(expense.reason).includes(normalizedQuery)
  );
}

function buildExpenseSheet(expenses: Expense[]): XLSX.WorkSheet {
  const rows = [
    ["Ngày chi", "Tháng", "Năm", "Số tiền", "Lý do"],
    ...expenses.map((expense) => [
      formatDate(expense.expense_date),
      expense.month,
      expense.year,
      expense.amount,
      expense.reason,
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 8 },
    { wch: 8 },
    { wch: 15 },
    { wch: 60 },
  ];
  worksheet["!rows"] = [{ hpt: 22 }];
  return worksheet;
}

export async function exportExpensesToExcel(
  params: ExportExpensesInput
): Promise<{
  fileName: string;
  fileData: string;
  mimeType: string;
}> {
  const { month, year, query, viewMode } = params;
  if (!year || Number.isNaN(year)) {
    throw new Error("Thiếu hoặc sai định dạng năm.");
  }
  if (viewMode === "month" && (!month || Number.isNaN(month))) {
    throw new Error("Thiếu hoặc sai định dạng tháng.");
  }

  const supabase = await createClient();
  const workbook = XLSX.utils.book_new();

  if (viewMode === "year") {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("year", year)
      .order("expense_date", { ascending: false });

    if (error) throw error;
    const expensesByMonth = new Map<number, Expense[]>();
    (data as Expense[] | null)?.forEach((expense) => {
      const monthKey = Number(expense.month) || 0;
      if (!expensesByMonth.has(monthKey)) {
        expensesByMonth.set(monthKey, []);
      }
      expensesByMonth.get(monthKey)!.push(expense);
    });

    for (let m = 1; m <= 12; m++) {
      const monthExpenses = filterExpenses(expensesByMonth.get(m) || [], query);
      const worksheet = buildExpenseSheet(monthExpenses);
      XLSX.utils.book_append_sheet(workbook, worksheet, `Thang_${m}_${year}`);
    }
  } else {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .order("expense_date", { ascending: false });

    if (error) throw error;
    const expenses = filterExpenses((data as Expense[] | null) || [], query);
    const worksheet = buildExpenseSheet(expenses);
    XLSX.utils.book_append_sheet(workbook, worksheet, `Thang_${month}_${year}`);
  }

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  const fileName =
    viewMode === "year"
      ? `chi-phi_nam-${year}.xlsx`
      : `chi-phi_thang-${month}-nam-${year}.xlsx`;

  return {
    fileName,
    fileData: Buffer.from(buffer).toString("base64"),
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
