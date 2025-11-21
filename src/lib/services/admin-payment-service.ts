"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  PaymentStatus,
  CreatePaymentStatusData,
  UpdatePaymentStatusData,
} from "@/types/database";
import {
  normalizeText,
  normalizePhone,
  calculateTuitionSummary,
} from "@/lib/utils";
import { SUBJECTS } from "@/lib/constants/subjects";
import * as XLSX from "xlsx";

export interface TuitionItem {
  paymentStatusId: string | null;
  studentId: string;
  studentName: string;
  studentPhone: string;
  classId: string;
  className: string;
  monthlyFee: number;
  amount: number | null;
  isPaid: boolean | null;
  paidAt: string | null;
  enrollmentDate: string;
  leaveDate: string | null;
  enrollmentId: string;
  enrollmentStatus: "trial" | "active" | "inactive"; // Trạng thái học của học sinh
  classStartDate: string; // Ngày bắt đầu lớp
  classEndDate: string; // Ngày kết thúc lớp
  month: number; // Tháng áp dụng
}

export interface TuitionSummary {
  totalPaid: number;
  totalUnpaid: number;
  totalNotCreated: number;
}

/**
 * Get tuition data for a specific month/year
 * Option 1: Display ALL students enrolled in the month, payment_status can be null
 */
export async function getTuitionData(
  month: number,
  year: number,
  classId?: string,
  studentQuery?: string,
  status?: "all" | "paid" | "unpaid" | "not_created",
  subject?: string,
  learningStatus?: "all" | "enrolled" | "active" | "trial" | "inactive"
): Promise<TuitionItem[]> {
  const supabase = await createClient();

  // Calculate start and end of month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Get all enrollments that overlap with the month
  // An enrollment overlaps if:
  // 1. enrollment_date is in the month, OR
  // 2. enrollment_date < start_of_month AND (leave_date IS NULL OR leave_date >= start_of_month)

  let enrollmentQuery = supabase
    .from("student_class_enrollments")
    .select(
      `
      id,
      student_id,
      class_id,
      enrollment_date,
      leave_date,
      status,
      students(id, full_name, phone, is_active),
      classes(id, name, monthly_fee, is_active, start_date, end_date)
    `
    )
    .in("status", ["active", "trial", "inactive"]);

  // Filter by class if provided
  if (classId) {
    enrollmentQuery = enrollmentQuery.eq("class_id", classId);
  }

  const { data: allEnrollmentsData, error: enrollmentError } =
    await enrollmentQuery;

  if (enrollmentError) throw enrollmentError;
  if (!allEnrollmentsData || allEnrollmentsData.length === 0) return [];

  // Filter enrollments that overlap with the selected range
  const enrollments = allEnrollmentsData.filter((e) => {
    const enrollmentDate = new Date(e.enrollment_date);
    const leaveDate = e.leave_date ? new Date(e.leave_date) : null;

    const student = Array.isArray(e.students) ? e.students[0] : e.students;
    const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;

    // Filter out inactive students/classes
    if (!student?.is_active || !classData?.is_active) return false;

    // Check if class is still active during the queried month/year
    // If class ended before the queried month, don't show enrollment
    if (classData?.end_date) {
      const classEndDate = new Date(classData.end_date);
      classEndDate.setHours(23, 59, 59, 999); // End of day
      if (classEndDate < startOfMonth) {
        return false; // Class ended before the queried month
      }
    }

    // Filter by student query if provided (case-insensitive and diacritic-insensitive)
    if (studentQuery && studentQuery.trim()) {
      const trimmedQuery = studentQuery.trim();
      const normalizedQuery = normalizeText(trimmedQuery);

      // Normalize student name for matching
      const nameMatch = student?.full_name
        ? normalizeText(student.full_name).includes(normalizedQuery)
        : false;

      // Normalize phone for matching (remove separators)
      const normalizedPhone = student?.phone
        ? normalizePhone(student.phone)
        : "";
      const normalizedQueryForPhone = normalizePhone(trimmedQuery);
      const phoneMatch =
        normalizedPhone && normalizedQueryForPhone
          ? normalizedPhone.includes(normalizedQueryForPhone)
          : false;

      if (!nameMatch && !phoneMatch) return false;
    }

    // Filter by subject if provided (check if class name contains subject)
    if (subject && subject !== "all" && subject.trim()) {
      const normalizedSubject = normalizeText(subject.trim());
      const normalizedClassName = classData?.name
        ? normalizeText(classData.name)
        : "";
      if (!normalizedClassName.includes(normalizedSubject)) {
        return false;
      }
    }

    // Filter by learning status if provided
    if (learningStatus && learningStatus !== "all") {
      const enrollmentStatus = e.status as "active" | "trial" | "inactive";
      if (learningStatus === "enrolled") {
        // "enrolled" means active or trial (students currently enrolled)
        if (enrollmentStatus !== "active" && enrollmentStatus !== "trial") {
          return false;
        }
      } else if (learningStatus !== enrollmentStatus) {
        return false;
      }
    }

    // Get class end date for overlap checking
    const classEndDate = classData?.end_date
      ? new Date(classData.end_date)
      : null;
    if (classEndDate) {
      classEndDate.setHours(23, 59, 59, 999);
    }

    // Check if enrollment overlaps with the month
    // Case 1: Enrollment starts in the month
    // Also need to ensure class hasn't ended before enrollment starts in this month
    if (enrollmentDate >= startOfMonth && enrollmentDate <= endOfMonth) {
      // If class ends before enrollment date in this month, skip it
      if (classEndDate && classEndDate < enrollmentDate) {
        return false;
      }
      return true;
    }

    // Case 2: Enrollment started before month but is still active or left during/after month
    // Need to check: enrollment overlaps with month AND class is still active during month
    if (enrollmentDate < startOfMonth) {
      // Check if enrollment is still active during the month
      const enrollmentEnd = leaveDate || classEndDate;
      if (enrollmentEnd && enrollmentEnd < startOfMonth) {
        return false; // Enrollment/class ended before the queried month
      }
      // Enrollment overlaps with the month
      return true;
    }

    return false;
  });

  if (enrollments.length === 0) return [];

  // Get payment statuses for these enrollments
  const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));
  const classIds = Array.from(new Set(enrollments.map((e) => e.class_id)));

  // Fetch payment statuses
  const { data: paymentStatuses, error: paymentError } = await supabase
    .from("payment_status")
    .select("*")
    .eq("month", month)
    .eq("year", year)
    .in("student_id", studentIds)
    .in("class_id", classIds);

  if (paymentError) throw paymentError;

  // Create a map for quick lookup: key = `${studentId}:${classId}`
  const paymentMap = new Map<string, PaymentStatus>();
  paymentStatuses?.forEach((p) => {
    paymentMap.set(`${p.student_id}:${p.class_id}:${p.month}`, p);
  });

  // Build TuitionItem array
  const tuitionItems: TuitionItem[] = enrollments.map((e) => {
    const student = Array.isArray(e.students) ? e.students[0] : e.students;
    const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;

    const paymentKey = `${e.student_id}:${e.class_id}:${month}`;
    const payment = paymentMap.get(paymentKey) || null;

    return {
      paymentStatusId: payment?.id || null,
      studentId: e.student_id,
      studentName: student?.full_name || "",
      studentPhone: student?.phone || "",
      classId: e.class_id,
      className: classData?.name || "",
      monthlyFee: Number(classData?.monthly_fee || 0),
      amount: payment?.amount ? Number(payment.amount) : null,
      isPaid: payment ? payment.is_paid : null,
      paidAt: payment?.paid_at || null,
      enrollmentDate: e.enrollment_date,
      leaveDate: e.leave_date || null,
      enrollmentId: e.id,
      enrollmentStatus:
        (e.status as "trial" | "active" | "inactive") || "active",
      classStartDate: classData?.start_date || "",
      classEndDate: classData?.end_date || "",
      month,
    };
  });

  if (status && status !== "all") {
    return tuitionItems.filter((item) => {
      if (status === "not_created") {
        return item.paymentStatusId === null;
      }
      if (status === "paid") {
        return item.paymentStatusId !== null && item.isPaid === true;
      }
      if (status === "unpaid") {
        return (
          item.paymentStatusId !== null &&
          (item.isPaid === false || item.isPaid === null)
        );
      }
      return true;
    });
  }

  return tuitionItems;
}

/**
 * Get all classes a student was enrolled in during a specific month
 */
export async function getStudentClassesInMonth(
  studentId: string,
  month: number,
  year: number
): Promise<
  Array<{
    classId: string;
    className: string;
    monthlyFee: number;
    enrollmentDate: string;
    leaveDate: string | null;
    isLastClass: boolean;
  }>
> {
  const supabase = await createClient();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Get all enrollments for the student
  const { data: allEnrollments, error } = await supabase
    .from("student_class_enrollments")
    .select(
      `
      id,
      class_id,
      enrollment_date,
      leave_date,
      classes(id, name, monthly_fee, is_active, start_date, end_date)
    `
    )
    .eq("student_id", studentId);

  if (error) throw error;
  if (!allEnrollments || allEnrollments.length === 0) return [];

  // Filter enrollments that overlap with the month
  const enrollments = allEnrollments.filter((e) => {
    const enrollmentDate = new Date(e.enrollment_date);
    const leaveDate = e.leave_date ? new Date(e.leave_date) : null;
    const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;

    // Filter out inactive classes
    if (!classData?.is_active) return false;

    // Check if class is still active during the queried month/year
    // If class ended before the queried month, don't show enrollment
    if (classData?.end_date) {
      const classEndDate = new Date(classData.end_date);
      classEndDate.setHours(23, 59, 59, 999); // End of day
      if (classEndDate < startOfMonth) {
        return false; // Class ended before the queried month
      }
    }

    // Get class end date for overlap checking
    const classEndDate = classData?.end_date
      ? new Date(classData.end_date)
      : null;
    if (classEndDate) {
      classEndDate.setHours(23, 59, 59, 999);
    }

    // Check if enrollment overlaps with the month
    // Case 1: Enrollment starts in the month
    if (enrollmentDate >= startOfMonth && enrollmentDate <= endOfMonth) {
      // If class ends before enrollment date in this month, skip it
      if (classEndDate && classEndDate < enrollmentDate) {
        return false;
      }
      return true;
    }

    // Case 2: Enrollment started before month but is still active or left during/after month
    // Need to check: enrollment overlaps with month AND class is still active during month
    if (enrollmentDate < startOfMonth) {
      // Check if enrollment is still active during the month
      const enrollmentEnd = leaveDate || classEndDate;
      if (enrollmentEnd && enrollmentEnd < startOfMonth) {
        return false; // Enrollment/class ended before the queried month
      }
      // Enrollment overlaps with the month
      return true;
    }

    return false;
  });

  if (enrollments.length === 0) return [];

  // Sort by enrollment_date descending to find last class
  const sortedEnrollments = enrollments.sort((a, b) => {
    const dateA = new Date(a.enrollment_date).getTime();
    const dateB = new Date(b.enrollment_date).getTime();
    return dateB - dateA;
  });

  const lastEnrollmentDate = sortedEnrollments[0]?.enrollment_date;

  return enrollments.map((e) => {
    const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
    return {
      classId: e.class_id,
      className: classData?.name || "",
      monthlyFee: Number(classData?.monthly_fee || 0),
      enrollmentDate: e.enrollment_date,
      leaveDate: e.leave_date || null,
      isLastClass: e.enrollment_date === lastEnrollmentDate,
    };
  });
}

/**
 * Get tuition summary for a month/year
 */
export async function getTuitionSummary(
  month: number,
  year: number
): Promise<TuitionSummary> {
  const tuitionData = await getTuitionData(month, year);

  return calculateTuitionSummary(tuitionData);
}

export async function getTuitionDataForYear(
  year: number,
  classId?: string,
  studentQuery?: string,
  status?: "all" | "paid" | "unpaid" | "not_created",
  subject?: string,
  learningStatus?: "all" | "enrolled" | "active" | "trial" | "inactive"
): Promise<TuitionItem[]> {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const results = await Promise.all(
    months.map((month) =>
      getTuitionData(
        month,
        year,
        classId,
        studentQuery,
        status,
        subject,
        learningStatus
      )
    )
  );
  return results.flat();
}

/**
 * Create payment status
 */
export async function createPaymentStatus(
  data: CreatePaymentStatusData,
  path?: string
): Promise<string> {
  const supabase = await createClient();

  // Check if payment status already exists
  const { data: existing } = await supabase
    .from("payment_status")
    .select("id")
    .eq("student_id", data.student_id)
    .eq("class_id", data.class_id)
    .eq("month", data.month)
    .eq("year", data.year)
    .single();

  if (existing) {
    throw new Error(
      "Học phí cho học sinh này và lớp này trong tháng/năm đã tồn tại"
    );
  }

  const insertData: {
    student_id: string;
    class_id: string;
    month: number;
    year: number;
    amount: number | null;
    is_paid: boolean;
    paid_at?: string;
  } = {
    student_id: data.student_id,
    class_id: data.class_id,
    month: data.month,
    year: data.year,
    amount: data.amount || null,
    is_paid: data.is_paid || false,
  };

  // Auto-set paid_at when is_paid is true
  if (data.is_paid && !data.paid_at) {
    insertData.paid_at = new Date().toISOString();
  } else if (data.paid_at) {
    insertData.paid_at = data.paid_at;
  }

  const { data: inserted, error } = await supabase
    .from("payment_status")
    .insert(insertData)
    .select("id")
    .single();

  if (error) throw error;
  if (path) revalidatePath(path);

  return inserted?.id as string;
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  id: string,
  data: UpdatePaymentStatusData,
  path?: string
): Promise<void> {
  const supabase = await createClient();

  const updateData: Partial<PaymentStatus> = {};

  if (data.is_paid !== undefined) {
    updateData.is_paid = data.is_paid;
    // Auto-set paid_at when marking as paid
    if (data.is_paid && !data.paid_at) {
      updateData.paid_at = new Date().toISOString();
    } else if (!data.is_paid) {
      updateData.paid_at = null;
    }
  }

  if (data.amount !== undefined) {
    updateData.amount = data.amount;
  }

  if (data.paid_at !== undefined) {
    updateData.paid_at = data.paid_at;
  }

  const { error } = await supabase
    .from("payment_status")
    .update(updateData)
    .eq("id", id);

  if (error) throw error;
  if (path) revalidatePath(path);
}

/**
 * Bulk update payment status
 */
export async function bulkUpdatePaymentStatus(
  updates: Array<{ id: string; data: UpdatePaymentStatusData }>,
  path?: string
): Promise<void> {
  // Update each payment status
  for (const { id, data } of updates) {
    await updatePaymentStatus(id, data);
  }

  if (path) revalidatePath(path);
}

/**
 * Toggle payment status (đóng/hủy đóng) nhanh
 * Nếu chưa có payment_status, tạo mới với is_paid = true
 * Nếu đã có, toggle is_paid giữa true/false
 */
export async function togglePaymentStatus(
  item: TuitionItem,
  month: number,
  year: number,
  path?: string
): Promise<TuitionItem> {
  if (!item.paymentStatusId) {
    // Chưa có payment_status, tạo mới với is_paid = true
    const paymentStatusId = await createPaymentStatus(
      {
        student_id: item.studentId,
        class_id: item.classId,
        month,
        year,
        amount: item.monthlyFee,
        is_paid: true,
      },
      path
    );

    return {
      ...item,
      paymentStatusId,
      amount: item.monthlyFee,
      isPaid: true,
      paidAt: new Date().toISOString(),
    };
  } else {
    // Đã có payment_status, toggle is_paid
    const newIsPaid = !item.isPaid;
    await updatePaymentStatus(
      item.paymentStatusId,
      {
        is_paid: newIsPaid,
      },
      path
    );

    return {
      ...item,
      isPaid: newIsPaid,
      paidAt: newIsPaid ? new Date().toISOString() : null,
    };
  }
}

export type ExportStatus = "all" | "paid" | "unpaid" | "not_created";
export type ExportLearningStatus =
  | "all"
  | "enrolled"
  | "active"
  | "trial"
  | "inactive";

export type ExportTuitionInput = {
  month?: number;
  year: number;
  classId?: string;
  query?: string;
  status?: ExportStatus;
  subject?: string;
  learningStatus?: ExportLearningStatus;
  viewMode: "month" | "year";
};

export async function exportTuitionData(input: ExportTuitionInput): Promise<{
  fileName: string;
  fileData: string;
  mimeType: string;
}> {
  const {
    month,
    year,
    classId,
    query = "",
    status = "all",
    subject = "all",
    learningStatus = "enrolled",
    viewMode,
  } = input;

  if (!year || Number.isNaN(year)) {
    throw new Error("Thiếu hoặc sai định dạng năm.");
  }

  let tuitionData;
  if (viewMode === "year") {
    tuitionData = await getTuitionDataForYear(
      year,
      classId,
      query,
      status,
      subject,
      learningStatus
    );
  } else {
    if (!month || Number.isNaN(month)) {
      throw new Error("Thiếu hoặc sai định dạng tháng.");
    }
    tuitionData = await getTuitionData(
      month,
      year,
      classId,
      query,
      status,
      subject,
      learningStatus
    );
  }

  const formatEnrollmentStatus = (
    enrollmentStatus: "trial" | "active" | "inactive"
  ): string => {
    switch (enrollmentStatus) {
      case "trial":
        return "Học thử";
      case "active":
        return "Đang học";
      case "inactive":
        return "Ngừng học";
      default:
        return enrollmentStatus;
    }
  };

  const workbook = XLSX.utils.book_new();
  const subjectMatchers = SUBJECTS.map((subject) => ({
    label: subject,
    normalized: normalizeText(subject),
  }));

  if (tuitionData.length === 0) {
    const worksheet = XLSX.utils.json_to_sheet([]);
    worksheet["!rows"] = [{ hpt: 22 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Không có dữ liệu");
  } else if (viewMode === "year") {
    type MonthEntry = {
      display: string;
    };
    type YearRow = {
      studentName: string;
      studentPhone: string;
      className: string;
      enrollmentStatus: string;
      months: Record<number, MonthEntry | undefined>;
    };

    const subjectRows = new Map<string, Map<string, YearRow>>();

    tuitionData.forEach((item) => {
      const normalizedClassName = normalizeText(item.className || "");
      const matchedSubject =
        subjectMatchers.find((subject) =>
          normalizedClassName.includes(subject.normalized)
        )?.label || "Môn khác";

      if (!subjectRows.has(matchedSubject)) {
        subjectRows.set(matchedSubject, new Map());
      }
      const rowsMap = subjectRows.get(matchedSubject)!;

      const rowKey = `${item.studentId}-${item.classId}`;
      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          studentName: item.studentName,
          studentPhone: item.studentPhone,
          className: item.className,
          enrollmentStatus: formatEnrollmentStatus(item.enrollmentStatus),
          months: {},
        });
      }

      const row = rowsMap.get(rowKey)!;
      let display = "Chưa tạo";
      if (item.paymentStatusId) {
        display = item.isPaid
          ? item.amount
            ? `Đã đóng (${item.amount.toLocaleString("vi-VN")})`
            : "Đã đóng"
          : "Chưa đóng";
      }
      row.months[item.month] = { display };
    });

    const monthHeaders = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);
    const columnWidths = [
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      ...monthHeaders.map(() => ({ wch: 16 })),
    ];

    subjectRows.forEach((rowsMap, subject) => {
      const rows = Array.from(rowsMap.values()).map((row) => {
        const result: Record<string, string> = {
          "Họ tên": row.studentName,
          "Số điện thoại": row.studentPhone,
          Lớp: row.className,
          "Trạng thái học": row.enrollmentStatus,
        };
        monthHeaders.forEach((header, index) => {
          const month = index + 1;
          result[header] = row.months[month]?.display ?? "";
        });
        return result;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = columnWidths;
      worksheet["!rows"] = [{ hpt: 22 }];

      const sheetName =
        subject.length > 31 ? subject.slice(0, 28) + "..." : subject;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
  } else {
    const groupedSheets = new Map<string, Record<string, string | number>[]>();

    tuitionData.forEach((item) => {
      const normalizedClassName = normalizeText(item.className || "");
      const matchedSubject =
        subjectMatchers.find((subject) =>
          normalizedClassName.includes(subject.normalized)
        )?.label || "Môn khác";

      const row = {
        "Họ tên": item.studentName,
        "Số điện thoại": item.studentPhone,
        Lớp: item.className,
        Tháng: item.month,
        "Học phí": item.monthlyFee,
        "Trạng thái học phí": item.paymentStatusId
          ? item.isPaid
            ? "Đã đóng"
            : "Chưa đóng"
          : "Chưa tạo",
        "Số tiền đã đóng": item.isPaid && item.amount ? item.amount : "",
        "Ngày đóng": item.paidAt
          ? new Date(item.paidAt).toLocaleDateString()
          : "",
        "Trạng thái học": formatEnrollmentStatus(item.enrollmentStatus),
        "Ngày đăng ký": item.enrollmentDate
          ? new Date(item.enrollmentDate).toLocaleDateString()
          : "",
        "Ngày rời lớp": item.leaveDate
          ? new Date(item.leaveDate).toLocaleDateString()
          : "",
      };

      if (!groupedSheets.has(matchedSubject)) {
        groupedSheets.set(matchedSubject, []);
      }
      groupedSheets.get(matchedSubject)!.push(row);
    });

    const columnWidths = [
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 8 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
    ];

    groupedSheets.forEach((rows, subject) => {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = columnWidths;
      worksheet["!rows"] = [{ hpt: 22 }];

      const sheetName =
        subject.length > 31 ? subject.slice(0, 28) + "..." : subject;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
  }

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  const fileName =
    viewMode === "year"
      ? `hoc-phi-${year}.xlsx`
      : `hoc-phi-${month}-${year}.xlsx`;

  return {
    fileName,
    fileData: Buffer.from(buffer).toString("base64"),
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

/**
 * Tự động tạo payment status cho học sinh chưa có trong tháng/năm
 */
export async function syncTuitionPaymentStatus(
  month: number,
  year: number,
  shouldRevalidate: boolean = false
): Promise<{
  created: number;
  skipped: number;
}> {
  const supabase = await createClient();

  // Calculate start and end of month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Get all enrollments (active only) that overlap with the month
  // Chỉ tạo học phí cho học sinh đang học (active), không tạo cho học thử (trial)
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("student_class_enrollments")
    .select(
      `
      id,
      student_id,
      class_id,
      enrollment_date,
      leave_date,
      students!inner(id, is_active),
      classes!inner(id, monthly_fee, is_active, end_date)
    `
    )
    .eq("status", "active")
    .eq("students.is_active", true)
    .eq("classes.is_active", true);

  if (enrollmentError) throw enrollmentError;
  if (!enrollments || enrollments.length === 0) {
    return { created: 0, skipped: 0 };
  }

  // Filter enrollments that overlap with the month
  const validEnrollments = enrollments.filter((e) => {
    const enrollmentDate = new Date(e.enrollment_date);
    const leaveDate = e.leave_date ? new Date(e.leave_date) : null;

    // Get class end date
    const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
    const classEndDate = classData?.end_date
      ? new Date(classData.end_date)
      : null;

    // Check if class ended before the queried month
    if (classEndDate) {
      classEndDate.setHours(23, 59, 59, 999);
      if (classEndDate < startOfMonth) {
        return false; // Class ended before the queried month
      }
    }

    // Check if enrollment overlaps with the month
    const enrollmentStart = new Date(enrollmentDate);
    enrollmentStart.setHours(0, 0, 0, 0);
    // Enrollment ends when student leaves OR class ends, whichever comes first
    const enrollmentEnd = leaveDate
      ? new Date(leaveDate)
      : classEndDate
        ? new Date(classEndDate)
        : null;
    if (enrollmentEnd) {
      enrollmentEnd.setHours(23, 59, 59, 999);
    }

    return (
      enrollmentStart <= endOfMonth &&
      (!enrollmentEnd || enrollmentEnd >= startOfMonth)
    );
  });

  if (validEnrollments.length === 0) {
    return { created: 0, skipped: 0 };
  }

  // Get existing payment statuses for this month/year
  const studentIds = Array.from(
    new Set(validEnrollments.map((e) => e.student_id))
  );
  const classIds = Array.from(new Set(validEnrollments.map((e) => e.class_id)));

  const { data: existingPayments, error: paymentError } = await supabase
    .from("payment_status")
    .select("student_id, class_id")
    .eq("month", month)
    .eq("year", year)
    .in("student_id", studentIds)
    .in("class_id", classIds);

  if (paymentError) throw paymentError;

  // Create a set of existing payment keys: `${studentId}:${classId}`
  const existingKeys = new Set<string>();
  existingPayments?.forEach((p) => {
    existingKeys.add(`${p.student_id}:${p.class_id}`);
  });

  // Prepare new payment statuses to create
  const newPayments: Array<{
    student_id: string;
    class_id: string;
    month: number;
    year: number;
    amount: number | null;
    is_paid: boolean;
  }> = [];

  validEnrollments.forEach((e) => {
    const key = `${e.student_id}:${e.class_id}`;
    if (!existingKeys.has(key)) {
      const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
      newPayments.push({
        student_id: e.student_id,
        class_id: e.class_id,
        month,
        year,
        amount: classData?.monthly_fee || null,
        is_paid: false,
      });
    }
  });

  // Bulk insert new payment statuses
  let created = 0;
  if (newPayments.length > 0) {
    const { error: insertError } = await supabase
      .from("payment_status")
      .insert(newPayments);

    if (insertError) throw insertError;
    created = newPayments.length;
  }

  if (shouldRevalidate) {
    revalidatePath("/admin/tuition");
  }

  return {
    created,
    skipped: validEnrollments.length - created,
  };
}

/**
 * Chuyển học sinh từ trial hoặc inactive sang active sau khi đóng học phí
 */
export async function activateStudentEnrollment(
  enrollmentId: string,
  path?: string
): Promise<void> {
  const { updateStudentEnrollment } = await import("./admin-classes-service");

  await updateStudentEnrollment(
    enrollmentId,
    {
      status: "active",
    },
    path
  );
}

/**
 * @deprecated Use activateStudentEnrollment instead
 */
export async function activateTrialStudent(
  enrollmentId: string,
  path?: string
): Promise<void> {
  return activateStudentEnrollment(enrollmentId, path);
}
