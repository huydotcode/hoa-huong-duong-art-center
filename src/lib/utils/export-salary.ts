import * as XLSX from "xlsx";
import type { TeacherSalarySummary } from "@/types/database";
import { formatCurrencyVN } from "../utils";

/**
 * Export teacher salary data to Excel file
 * Creates 2 sheets: Summary and Details
 */
export function exportSalaryToExcel(
  salaries: TeacherSalarySummary[],
  month: number,
  year: number
): void {
  // Sheet 1: Summary (Tổng hợp)
  const summaryData = salaries.map((salary) => ({
    "Họ và tên": salary.teacherName,
    "Số điện thoại": salary.phone,
    "Tổng số buổi": salary.totalSessions,
    "Tổng lương": salary.totalSalary,
  }));

  // Add total row
  const totalSessions = salaries.reduce((sum, s) => sum + s.totalSessions, 0);
  const totalSalary = salaries.reduce((sum, s) => sum + s.totalSalary, 0);
  summaryData.push({
    "Họ và tên": "TỔNG CỘNG",
    "Số điện thoại": "",
    "Tổng số buổi": totalSessions,
    "Tổng lương": totalSalary,
  });

  // Sheet 2: Details (Chi tiết)
  const detailsData: Array<{
    "Họ và tên": string;
    "Lớp học": string;
    "Số buổi": number;
    "Lương/buổi": number;
    "Tổng lương lớp": number;
  }> = [];

  salaries.forEach((salary) => {
    if (salary.details.length === 0) {
      // If no details, still add a row for the teacher
      detailsData.push({
        "Họ và tên": salary.teacherName,
        "Lớp học": "Không có dữ liệu",
        "Số buổi": 0,
        "Lương/buổi": 0,
        "Tổng lương lớp": 0,
      });
    } else {
      salary.details.forEach((detail) => {
        detailsData.push({
          "Họ và tên": salary.teacherName,
          "Lớp học": detail.className,
          "Số buổi": detail.sessions,
          "Lương/buổi": detail.salaryPerSession,
          "Tổng lương lớp": detail.totalSalary,
        });
      });
    }
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create worksheets
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  const detailsSheet = XLSX.utils.json_to_sheet(detailsData);

  // Set column widths
  summarySheet["!cols"] = [
    { wch: 25 }, // Họ và tên
    { wch: 15 }, // Số điện thoại
    { wch: 15 }, // Tổng số buổi
    { wch: 20 }, // Tổng lương
  ];

  detailsSheet["!cols"] = [
    { wch: 25 }, // Họ và tên
    { wch: 30 }, // Lớp học
    { wch: 12 }, // Số buổi
    { wch: 15 }, // Lương/buổi
    { wch: 20 }, // Tổng lương lớp
  ];

  // Add sheets to workbook
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Tổng hợp");
  XLSX.utils.book_append_sheet(workbook, detailsSheet, "Chi tiết");

  // Generate file name
  const fileName = `Luong_giao_vien_Thang${month}_Nam${year}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, fileName);
}
