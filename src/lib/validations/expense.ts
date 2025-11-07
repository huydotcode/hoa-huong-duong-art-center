import { z } from "zod";

// Helper to extract month and year from date string
function extractMonthYear(dateString: string): { month: number; year: number } {
  const date = new Date(dateString);
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

// Max value: 999,000,000,000 VNĐ (999 trăm triệu)
// Note: Database schema needs to be DECIMAL(13,2) to support this value
const MAX_AMOUNT = 999000000000;

export const createExpenseSchema = z
  .object({
    amount: z
      .number()
      .nonnegative("Số tiền phải lớn hơn 0.")
      .max(
        MAX_AMOUNT,
        `Số tiền không được vượt quá ${MAX_AMOUNT.toLocaleString("vi-VN")} VNĐ.`
      ),
    reason: z.string().min(1, "Vui lòng nhập lý do chi phí."),
    expense_date: z.string().min(1, "Vui lòng chọn ngày chi."),
  })
  .transform((data) => {
    const { month, year } = extractMonthYear(data.expense_date);
    return {
      ...data,
      month,
      year,
    };
  });

export const updateExpenseSchema = z
  .object({
    amount: z
      .number()
      .positive("Số tiền phải lớn hơn 0.")
      .max(
        MAX_AMOUNT,
        `Số tiền không được vượt quá ${MAX_AMOUNT.toLocaleString("vi-VN")} VNĐ.`
      )
      .optional(),
    reason: z.string().min(1, "Vui lòng nhập lý do chi phí.").optional(),
    expense_date: z.string().min(1, "Vui lòng chọn ngày chi.").optional(),
  })
  .transform((data) => {
    if (data.expense_date) {
      const { month, year } = extractMonthYear(data.expense_date);
      return {
        ...data,
        month,
        year,
      };
    }
    return data;
  });

export type CreateExpenseSchema = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseSchema = z.infer<typeof updateExpenseSchema>;
