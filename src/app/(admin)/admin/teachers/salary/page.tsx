import {
  getAllTeachersSalaryByMonth,
  getTotalTeachersSalaryByMonth,
} from "@/lib/services/admin-teacher-salary-service";
import { getTeacherSalaryExpensesMap } from "@/lib/services/admin-expenses-service";
import SalaryClient from "./_components/salary-client";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import Loading from "./loading";

interface SearchProps {
  searchParams?: Promise<{ month?: string; year?: string; q?: string }>;
}

export default async function TeacherSalaryPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month;
  const yearParam = searchParams?.year;

  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  // Fetch data
  const [salaries, totalSalary, salaryExpenses] = await Promise.all([
    getAllTeachersSalaryByMonth(month, year),
    getTotalTeachersSalaryByMonth(month, year),
    getTeacherSalaryExpensesMap(month, year),
  ]);

  return (
    <div className="">
      <CardHeader className="px-3">
        <CardTitle>Lương giáo viên</CardTitle>
      </CardHeader>

      <Suspense fallback={<Loading />}>
        <SalaryClient
          initialSalaries={salaries}
          initialMonth={month}
          initialYear={year}
          initialTotal={totalSalary}
          initialExpenses={salaryExpenses}
        />
      </Suspense>
    </div>
  );
}
