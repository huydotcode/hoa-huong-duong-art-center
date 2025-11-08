import {
  getExpenses,
  getTotalExpensesByMonth,
  syncTeacherSalaryExpense,
} from "@/lib/services/admin-expenses-service";
import ExpensesClient from "./_components/expenses-client";

// Đánh dấu page là dynamic để đảm bảo data được refresh
export const dynamic = "force-dynamic";

interface SearchProps {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    q?: string;
  }>;
}

export default async function ExpensesPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month;
  const yearParam = searchParams?.year;
  const query = searchParams?.q || "";

  // Default to current month/year if not provided
  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  // Validate month and year
  const validMonth = month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const validYear = year >= 2020 && year <= 2100 ? year : now.getFullYear();

  // Đồng bộ lương giáo viên vào expenses trước khi fetch
  // Không revalidate trong render để tránh lỗi Next.js
  await syncTeacherSalaryExpense(validMonth, validYear, false);

  const [expenses, total] = await Promise.all([
    getExpenses(validMonth, validYear, query),
    getTotalExpensesByMonth(validMonth, validYear),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quản lý chi phí</h1>
      </div>
      <ExpensesClient
        initialExpenses={expenses}
        initialMonth={validMonth}
        initialYear={validYear}
        initialQuery={query}
        initialTotal={total}
      />
    </div>
  );
}
