"use server";

import { createClient } from "@/lib/supabase/server";
import type { ClassRevenueItem, MonthlyStats } from "@/types/database";

/**
 * Get revenue data for each class in a specific month/year
 */
export async function getClassRevenue(
  month: number,
  year: number,
  classIds?: string[]
): Promise<ClassRevenueItem[]> {
  const supabase = await createClient();

  // Calculate start and end of month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Get all classes (filter by classIds if provided)
  let classesQuery = supabase
    .from("classes")
    .select("id, name, monthly_fee, start_date, end_date, is_active");

  // Filter by classIds if provided
  if (classIds && classIds.length > 0) {
    classesQuery = classesQuery.in("id", classIds);
  }

  // Only get active classes that are within the time period
  // A class is valid if:
  // - start_date <= endOfMonth AND (end_date IS NULL OR end_date >= startOfMonth)
  const { data: classes, error: classesError } = await classesQuery.eq(
    "is_active",
    true
  );

  if (classesError) throw classesError;
  if (!classes || classes.length === 0) return [];

  // Filter classes by date range
  const validClasses = classes.filter((c) => {
    const startDate = c.start_date ? new Date(c.start_date) : null;
    const endDate = c.end_date ? new Date(c.end_date) : null;

    // Class must have started before or during the month
    if (startDate && startDate > endOfMonth) return false;

    // Class must not have ended before the month (if end_date exists)
    if (endDate && endDate < startOfMonth) return false;

    return true;
  });

  if (validClasses.length === 0) return [];

  const validClassIds = validClasses.map((c) => c.id);

  // Get all enrollments for these classes that overlap with the month
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("student_class_enrollments")
    .select("id, student_id, class_id, enrollment_date, leave_date, status")
    .in("class_id", validClassIds)
    .in("status", ["active", "trial"]);

  if (enrollmentsError) throw enrollmentsError;

  // Get payment status for the month
  const { data: payments, error: paymentsError } = await supabase
    .from("payment_status")
    .select("id, student_id, class_id, month, year, is_paid, amount")
    .eq("month", month)
    .eq("year", year)
    .in("class_id", validClassIds);

  if (paymentsError) throw paymentsError;

  // Create class revenue map
  const classRevenueMap = new Map<string, ClassRevenueItem>();

  // Initialize with class info
  validClasses.forEach((c) => {
    classRevenueMap.set(c.id, {
      classId: c.id,
      className: String(c.name || ""),
      month,
      year,
      totalRevenue: 0,
      paidCount: 0,
      unpaidCount: 0,
      totalStudents: 0,
      startDate: c.start_date ? String(c.start_date) : null,
      endDate: c.end_date ? String(c.end_date) : null,
    });
  });

  // Process enrollments - count students per class that are enrolled in the month
  const enrollmentsByClass = new Map<string, Set<string>>(); // classId -> Set<studentId>

  enrollments?.forEach((enrollment) => {
    const enrollmentDate = new Date(enrollment.enrollment_date);
    const leaveDate = enrollment.leave_date
      ? new Date(enrollment.leave_date)
      : null;
    const classData = validClasses.find((c) => c.id === enrollment.class_id);
    if (!classData) return;

    // Check if enrollment overlaps with the month
    const classStartDate = classData.start_date
      ? new Date(classData.start_date)
      : null;
    const classEndDate = classData.end_date
      ? new Date(classData.end_date)
      : null;

    // Check if enrollment is active during the month
    const enrollmentEnd = leaveDate || classEndDate;
    if (enrollmentEnd && enrollmentEnd < startOfMonth) return;
    if (enrollmentDate > endOfMonth) return;

    // Enrollment overlaps with the month
    if (!enrollmentsByClass.has(enrollment.class_id)) {
      enrollmentsByClass.set(enrollment.class_id, new Set());
    }
    enrollmentsByClass.get(enrollment.class_id)?.add(enrollment.student_id);
  });

  // Update total students count
  enrollmentsByClass.forEach((studentSet, classId) => {
    const revenue = classRevenueMap.get(classId);
    if (revenue) {
      revenue.totalStudents = studentSet.size;
    }
  });

  // Process payments - create a map of student payments per class
  const studentPaymentMap = new Map<
    string,
    Map<string, { isPaid: boolean; amount: number }>
  >(); // classId -> studentId -> payment info

  payments?.forEach((payment) => {
    if (!studentPaymentMap.has(payment.class_id)) {
      studentPaymentMap.set(payment.class_id, new Map());
    }
    const classPaymentMap = studentPaymentMap.get(payment.class_id)!;
    const paymentAmount =
      payment.amount !== null
        ? Number(payment.amount)
        : Number(
            validClasses.find((c) => c.id === payment.class_id)?.monthly_fee ||
              0
          );

    classPaymentMap.set(payment.student_id, {
      isPaid: payment.is_paid,
      amount: paymentAmount,
    });
  });

  // Calculate revenue, paid count, and unpaid count
  enrollmentsByClass.forEach((studentSet, classId) => {
    const revenue = classRevenueMap.get(classId);
    if (!revenue) return;

    const classPaymentMap = studentPaymentMap.get(classId) || new Map();
    let paidCount = 0;
    let unpaidCount = 0;
    let totalRevenue = 0;

    studentSet.forEach((studentId) => {
      const payment = classPaymentMap.get(studentId);
      if (payment && payment.isPaid) {
        paidCount++;
        totalRevenue += payment.amount;
      } else {
        unpaidCount++;
      }
    });

    revenue.paidCount = paidCount;
    revenue.unpaidCount = unpaidCount;
    revenue.totalRevenue = totalRevenue;
  });

  return Array.from(classRevenueMap.values()).sort((a, b) =>
    a.className.localeCompare(b.className)
  );
}

/**
 * Get monthly revenue data with optional filtering by date range and classes
 */
export async function getMonthlyRevenueData(
  startMonth?: number,
  startYear?: number,
  endMonth?: number,
  endYear?: number,
  classIds?: string[]
): Promise<MonthlyStats[]> {
  const supabase = await createClient();

  // Build date range filter
  let enrollmentQuery = supabase
    .from("student_class_enrollments")
    .select("enrollment_date, leave_date, status, class_id");

  let paymentQuery = supabase
    .from("payment_status")
    .select("month, year, class_id, is_paid, amount");

  const expenseQuery = supabase.from("expenses").select("month, year, amount");

  // Filter by classIds if provided
  if (classIds && classIds.length > 0) {
    enrollmentQuery = enrollmentQuery.in("class_id", classIds);
    paymentQuery = paymentQuery.in("class_id", classIds);
  }

  // Execute queries
  const [enrollments, payments, expenses] = await Promise.all([
    enrollmentQuery,
    paymentQuery,
    expenseQuery,
  ]);

  const monthlyData: Record<string, MonthlyStats> = {};

  // Process enrollments - new and left students
  enrollments.data?.forEach((e) => {
    if (e.enrollment_date) {
      const date = new Date(e.enrollment_date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // Filter by date range if provided
      if (startYear && startMonth) {
        const startDate = new Date(startYear, startMonth - 1, 1);
        if (date < startDate) return;
      }
      if (endYear && endMonth) {
        const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);
        if (date > endDate) return;
      }

      const key = `${year}-${month}`;
      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: `${month}/${year}`,
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
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // Filter by date range if provided
      if (startYear && startMonth) {
        const startDate = new Date(startYear, startMonth - 1, 1);
        if (date < startDate) return;
      }
      if (endYear && endMonth) {
        const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);
        if (date > endDate) return;
      }

      const key = `${year}-${month}`;
      if (!monthlyData[key]) {
        monthlyData[key] = {
          month: `${month}/${year}`,
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

  // Get classes for monthly_fee fallback
  let classesQuery = supabase.from("classes").select("id, monthly_fee");
  if (classIds && classIds.length > 0) {
    classesQuery = classesQuery.in("id", classIds);
  }
  const { data: classes } = await classesQuery;
  const classFeeMap = new Map(classes?.map((c) => [c.id, c.monthly_fee]) || []);

  // Process payments - revenue
  payments.data?.forEach((p) => {
    // Filter by date range if provided
    if (startYear && startMonth) {
      const startDate = new Date(startYear, startMonth - 1, 1);
      const paymentDate = new Date(p.year, p.month - 1, 1);
      if (paymentDate < startDate) return;
    }
    if (endYear && endMonth) {
      const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);
      const paymentDate = new Date(p.year, p.month - 1, 1);
      if (paymentDate > endDate) return;
    }

    if (!p.is_paid) return;

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
    const paymentAmount =
      p.amount !== null
        ? Number(p.amount)
        : Number(classFeeMap.get(p.class_id) || 0);
    monthlyData[key].revenue += paymentAmount;
  });

  // Process expenses
  expenses.data?.forEach((e) => {
    // Filter by date range if provided
    if (startYear && startMonth) {
      const startDate = new Date(startYear, startMonth - 1, 1);
      const expenseDate = new Date(e.year, e.month - 1, 1);
      if (expenseDate < startDate) return;
    }
    if (endYear && endMonth) {
      const endDate = new Date(endYear, endMonth, 0, 23, 59, 59);
      const expenseDate = new Date(e.year, e.month - 1, 1);
      if (expenseDate > endDate) return;
    }

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

  // Calculate profit and sort
  const result = Object.values(monthlyData).map((data) => ({
    ...data,
    profit: data.revenue - data.expenses,
  }));

  return result.sort((a, b) => {
    const [aMonth, aYear] = a.month.split("/").map(Number);
    const [bMonth, bYear] = b.month.split("/").map(Number);
    if (aYear !== bYear) return aYear - bYear;
    return aMonth - bMonth;
  });
}
