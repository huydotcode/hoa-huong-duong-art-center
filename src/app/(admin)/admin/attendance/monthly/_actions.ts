"use server";

import {
  getMonthlyAttendanceMatrix,
  type MonthlyAttendanceMatrixResult,
} from "@/lib/services/admin-attendance-service";

export type MonthlyAttendanceInput = {
  month: number;
  year: number;
  classIds?: string[];
};

const normalizeInput = (
  input: MonthlyAttendanceInput
): MonthlyAttendanceInput => {
  const safeMonth = Math.min(12, Math.max(1, Number(input.month) || 1));
  const safeYear = Math.max(
    2000,
    Math.min(2100, Number(input.year) || new Date().getUTCFullYear())
  );
  const classIds = Array.isArray(input.classIds)
    ? input.classIds.filter(
        (id) => typeof id === "string" && id.trim().length > 0
      )
    : undefined;
  return {
    month: safeMonth,
    year: safeYear,
    classIds: classIds && classIds.length > 0 ? classIds : undefined,
  };
};

export async function fetchMonthlyAttendanceMatrixAction(
  input: MonthlyAttendanceInput
): Promise<MonthlyAttendanceMatrixResult> {
  const normalized = normalizeInput(input);
  const result = await getMonthlyAttendanceMatrix(normalized);
  return result;
}
