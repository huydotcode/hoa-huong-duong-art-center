"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getClassRevenue,
  getMonthlyRevenueData,
} from "@/lib/services/admin-reports-service";
import ReportsFilter from "./reports-filter";
import ClassRevenueTable from "./class-revenue-table";
import MonthlyStatsSection from "./monthly-stats-section";
import { exportReportsToExcel } from "@/lib/utils/export-reports";
import { Loader2 } from "lucide-react";

interface ReportsClientProps {
  initialMonth: number;
  initialYear: number;
}

export default function ReportsClient({
  initialMonth,
  initialYear,
}: ReportsClientProps) {
  const month = initialMonth;
  const year = initialYear;

  // Data fetching
  const { data: classRevenue = [], isLoading: isClassRevenueLoading } =
    useQuery({
      queryKey: ["admin-reports-class-revenue", { month, year }],
      queryFn: async () => getClassRevenue(month, year),
    });

  const { data: monthlyStats = [], isLoading: isMonthlyStatsLoading } =
    useQuery({
      queryKey: ["admin-reports-monthly-stats", { month, year }],
      queryFn: async () => getMonthlyRevenueData(month, year, month, year),
    });

  const isLoading = isClassRevenueLoading || isMonthlyStatsLoading;

  const handleExport = () => {
    exportReportsToExcel(classRevenue, monthlyStats, {
      month,
      year,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
