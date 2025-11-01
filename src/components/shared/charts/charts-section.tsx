"use client";
import { BarChartStudents, ComboChartFinance } from "./index";

type StudentsMonthly = {
  month: string;
  newStudents: number;
  leftStudents: number;
};

type FinanceMonthly = {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
};

interface Props {
  studentsData: StudentsMonthly[];
  financeData: FinanceMonthly[];
}

export default function ChartsSection({ studentsData, financeData }: Props) {
  if (studentsData.length === 0 || financeData.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Chưa có dữ liệu
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="border rounded-md p-3">
        <h3 className="mb-2 font-semibold">HV mới / HV nghỉ</h3>
        <BarChartStudents data={studentsData} />
      </div>
      <div className="border rounded-md p-3">
        <h3 className="mb-2 font-semibold">Doanh thu, Chi phí, Lợi nhuận</h3>
        <ComboChartFinance data={financeData} />
      </div>
    </div>
  );
}
