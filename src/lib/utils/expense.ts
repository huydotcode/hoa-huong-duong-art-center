/**
 * Kiểm tra xem expense có phải là lương giáo viên không
 */
export function isTeacherSalaryExpense(expense: {
  reason: string;
  month?: number;
  year?: number;
}): boolean {
  return (
    expense.reason.toLowerCase().includes("lương") &&
    expense.reason.includes("T") &&
    /T\d+\/\d+/.test(expense.reason)
  );
}
