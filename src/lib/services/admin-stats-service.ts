"use server";

import { createClient } from "@/lib/supabase/server";
import type { DashboardStats, MonthlyStats } from "@/types/database";

export async function getStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [teachersResult, studentsResult, classesResult] = await Promise.all([
    supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return {
    teachers: teachersResult.count || 0,
    students: studentsResult.count || 0,
    classes: classesResult.count || 0,
  };
}

export async function getRevenueData(): Promise<MonthlyStats[]> {
  const supabase = await createClient();

  // Lấy dữ liệu enrollment và payment
  const [enrollments, payments, expenses] = await Promise.all([
    supabase
      .from("student_class_enrollments")
      .select("enrollment_date, leave_date, status"),
    supabase
      .from("payment_status")
      .select("month, year, class_id, is_paid, amount"),
    supabase.from("expenses").select("month, year, amount"),
  ]);

  const monthlyData: Record<string, MonthlyStats> = {};

  // Xử lý học sinh mới và nghỉ
  enrollments.data?.forEach((e) => {
    if (e.enrollment_date) {
      const date = new Date(e.enrollment_date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: `${date.getMonth() + 1}/${date.getFullYear()}`,
          newStudents: 0,
          leftStudents: 0,
          revenue: 0,
          expenses: 0,
          profit: 0,
        };
      }
      monthlyData[key].newStudents++;
    }

    if (e.leave_date) {
      const date = new Date(e.leave_date);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: `${date.getMonth() + 1}/${date.getFullYear()}`,
          newStudents: 0,
          leftStudents: 0,
          revenue: 0,
          expenses: 0,
          profit: 0,
        };
      }
      monthlyData[key].leftStudents++;
    }
  });

  // Tính doanh thu (chỉ học phí đã đóng)
  if (payments.data) {
    // Cần lấy monthly_fee từ class
    const { data: classes } = await supabase
      .from("classes")
      .select("id, monthly_fee");

    const classFeeMap = new Map(
      classes?.map((c) => [c.id, c.monthly_fee]) || []
    );

    payments.data
      .filter((p) => p.is_paid)
      .forEach((p) => {
        const key = `${p.year}-${p.month}`;
        if (!monthlyData[key]) {
          monthlyData[key] = {
            month: `${p.month}/${p.year}`,
            newStudents: 0,
            leftStudents: 0,
            revenue: 0,
            expenses: 0,
            profit: 0,
          };
        }
        // Ưu tiên dùng amount từ payment_status, fallback về monthly_fee
        const paymentAmount =
          p.amount !== null
            ? Number(p.amount)
            : Number(classFeeMap.get(p.class_id) || 0);
        monthlyData[key].revenue += paymentAmount;
      });
  }

  // Xử lý chi phí (bao gồm cả lương giáo viên đã được sync vào expenses)
  expenses.data?.forEach((e) => {
    const key = `${e.year}-${e.month}`;
    if (!monthlyData[key]) {
      monthlyData[key] = {
        month: `${e.month}/${e.year}`,
        newStudents: 0,
        leftStudents: 0,
        revenue: 0,
        expenses: 0,
        profit: 0,
      };
    }
    monthlyData[key].expenses += Number(e.amount || 0);
  });

  // Tính lợi nhuận và sắp xếp
  const result = Object.values(monthlyData).map((data) => ({
    ...data,
    profit: data.revenue - data.expenses,
  }));

  return result.sort((a, b) => {
    const [aMonth, aYear] = a.month.split("/").map(Number);
    const [bMonth, bYear] = b.month.split("/").map(Number);
    if (aYear !== bYear) return bYear - aYear;
    return bMonth - aMonth;
  });
}
