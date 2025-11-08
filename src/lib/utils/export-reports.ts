import * as XLSX from "xlsx";
import type { ClassRevenueItem, MonthlyStats } from "@/types/database";

/**
 * Export reports data to Excel file
 * Creates multiple sheets: Class Revenue and Monthly Stats
 */
export function exportReportsToExcel(
  classRevenue: ClassRevenueItem[],
  monthlyStats: MonthlyStats[],
  options?: {
    month?: number;
    year?: number;
    startMonth?: number;
    startYear?: number;
    endMonth?: number;
    endYear?: number;
  }
): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Doanh thu từng lớp (Class Revenue)
  type ClassRevenueRow = {
    "Lớp học": string;
    Tháng: number | string;
    Năm: number | string;
    "Số học sinh": number;
    "Đã đóng": number;
    "Chưa đóng": number;
    "Tổng doanh thu": number;
    "Ngày bắt đầu": string;
    "Ngày kết thúc": string;
  };

  const classRevenueData: ClassRevenueRow[] = classRevenue.map((item) => ({
    "Lớp học": item.className,
    Tháng: item.month,
    Năm: item.year,
    "Số học sinh": item.totalStudents,
    "Đã đóng": item.paidCount,
    "Chưa đóng": item.unpaidCount,
    "Tổng doanh thu": item.totalRevenue,
    "Ngày bắt đầu": item.startDate
      ? new Date(item.startDate).toLocaleDateString("vi-VN")
      : "",
    "Ngày kết thúc": item.endDate
      ? new Date(item.endDate).toLocaleDateString("vi-VN")
      : "",
  }));

  // Add total row for class revenue
  const totalRevenue = classRevenue.reduce(
    (sum, item) => sum + item.totalRevenue,
    0
  );
  const totalPaid = classRevenue.reduce((sum, item) => sum + item.paidCount, 0);
  const totalUnpaid = classRevenue.reduce(
    (sum, item) => sum + item.unpaidCount,
    0
  );
  const totalStudents = classRevenue.reduce(
    (sum, item) => sum + item.totalStudents,
    0
  );

  classRevenueData.push({
    "Lớp học": "TỔNG CỘNG",
    Tháng: "",
    Năm: "",
    "Số học sinh": totalStudents,
    "Đã đóng": totalPaid,
    "Chưa đóng": totalUnpaid,
    "Tổng doanh thu": totalRevenue,
    "Ngày bắt đầu": "",
    "Ngày kết thúc": "",
  });

  // Sheet 2: Thống kê theo tháng (Monthly Stats)
  const monthlyStatsData = monthlyStats.map((stat) => ({
    Tháng: stat.month,
    "HV mới": stat.newStudents,
    "HV nghỉ": stat.leftStudents,
    "Doanh thu": stat.revenue,
    "Chi phí": stat.expenses,
    "Lợi nhuận": stat.profit,
  }));

  // Add total row for monthly stats
  const totalNewStudents = monthlyStats.reduce(
    (sum, stat) => sum + stat.newStudents,
    0
  );
  const totalLeftStudents = monthlyStats.reduce(
    (sum, stat) => sum + stat.leftStudents,
    0
  );
  const totalRevenueMonthly = monthlyStats.reduce(
    (sum, stat) => sum + stat.revenue,
    0
  );
  const totalExpensesMonthly = monthlyStats.reduce(
    (sum, stat) => sum + stat.expenses,
    0
  );
  const totalProfitMonthly = monthlyStats.reduce(
    (sum, stat) => sum + stat.profit,
    0
  );

  monthlyStatsData.push({
    Tháng: "TỔNG CỘNG",
    "HV mới": totalNewStudents,
    "HV nghỉ": totalLeftStudents,
    "Doanh thu": totalRevenueMonthly,
    "Chi phí": totalExpensesMonthly,
    "Lợi nhuận": totalProfitMonthly,
  });

  // Create worksheets
  const classRevenueSheet = XLSX.utils.json_to_sheet(classRevenueData);
  const monthlyStatsSheet = XLSX.utils.json_to_sheet(monthlyStatsData);

  // Set column widths for Class Revenue sheet
  classRevenueSheet["!cols"] = [
    { wch: 30 }, // Lớp học
    { wch: 10 }, // Tháng
    { wch: 10 }, // Năm
    { wch: 15 }, // Số học sinh
    { wch: 12 }, // Đã đóng
    { wch: 12 }, // Chưa đóng
    { wch: 20 }, // Tổng doanh thu
    { wch: 15 }, // Ngày bắt đầu
    { wch: 15 }, // Ngày kết thúc
  ];

  // Set column widths for Monthly Stats sheet
  monthlyStatsSheet["!cols"] = [
    { wch: 15 }, // Tháng
    { wch: 12 }, // HV mới
    { wch: 12 }, // HV nghỉ
    { wch: 20 }, // Doanh thu
    { wch: 20 }, // Chi phí
    { wch: 20 }, // Lợi nhuận
  ];

  // Add sheets to workbook
  XLSX.utils.book_append_sheet(
    workbook,
    classRevenueSheet,
    "Doanh thu từng lớp"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    monthlyStatsSheet,
    "Thống kê theo tháng"
  );

  // Generate file name
  let fileName = "Bao_cao_";
  if (options?.month && options?.year) {
    fileName += `Thang${options.month}_Nam${options.year}`;
  } else if (
    options?.startMonth &&
    options?.startYear &&
    options?.endMonth &&
    options?.endYear
  ) {
    fileName += `Tu_Thang${options.startMonth}_${options.startYear}_Den_Thang${options.endMonth}_${options.endYear}`;
  } else {
    fileName += new Date().toISOString().split("T")[0];
  }
  fileName += ".xlsx";

  // Write file
  XLSX.writeFile(workbook, fileName);
}
