"use client";

import { useState } from "react";
import type { ClassRevenueItem, MonthlyStats } from "@/types/database";
import ReportsFilter from "./reports-filter";
import ClassRevenueTable from "./class-revenue-table";
import MonthlyStatsSection from "./monthly-stats-section";
import { exportReportsToExcel } from "@/lib/utils/export-reports";

interface ReportsClientProps {
  initialClassRevenue: ClassRevenueItem[];
  initialMonthlyStats: MonthlyStats[];
  initialMonth: number;
  initialYear: number;
}

export default function ReportsClient({
  initialClassRevenue,
  initialMonthlyStats,
  initialMonth,
  initialYear,
}: ReportsClientProps) {
  const [classRevenue] = useState(initialClassRevenue);
  const [monthlyStats] = useState(initialMonthlyStats);

  const month = initialMonth;
  const year = initialYear;

  const handleExport = () => {
    exportReportsToExcel(classRevenue, monthlyStats, {
      month,
      year,
    });
  };

  return (
    <div className="space-y-6">
      <ReportsFilter onExportClick={handleExport} />

      {/* Doanh thu từng lớp */}
      <ClassRevenueTable data={classRevenue} month={month} year={year} />

      {/* Thống kê theo tháng */}
      <MonthlyStatsSection data={monthlyStats} />
    </div>
  );
}
