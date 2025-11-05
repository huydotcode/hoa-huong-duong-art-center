import { z } from "zod";

const classScheduleSchema = z.object({
  day: z.number().min(0).max(6),
  start_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Giờ không hợp lệ (HH:MM)"),
  end_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Giờ không hợp lệ (HH:MM)")
    .optional(),
});

export const createClassSchema = z
  .object({
    name: z.string().min(1, "Vui lòng nhập tên lớp."),
    days_of_week: z.array(classScheduleSchema).optional(),
    duration_minutes: z
      .number()
      .min(1, "Thời lượng phải lớn hơn 0.")
      .positive("Thời lượng phải là số dương."),
    max_student_count: z
      .number()
      .min(1, "Sĩ số tối đa phải lớn hơn 0.")
      .int("Sĩ số tối đa phải là số nguyên.")
      .optional(),
    monthly_fee: z
      .number()
      .min(0, "Học phí phải lớn hơn hoặc bằng 0.")
      .nonnegative("Học phí phải là số không âm."),
    salary_per_session: z
      .number()
      .min(0, "Lương/buổi phải lớn hơn hoặc bằng 0.")
      .nonnegative("Lương/buổi phải là số không âm."),
    start_date: z.string().min(1, "Vui lòng chọn ngày bắt đầu."),
    end_date: z.string().min(1, "Vui lòng chọn ngày kết thúc."),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: "Ngày kết thúc phải sau ngày bắt đầu.",
      path: ["end_date"],
    }
  )
  .refine(
    (data) => {
      // Check for duplicate day + start_time combinations
      if (!data.days_of_week || data.days_of_week.length === 0) return true;
      const seen = new Set<string>();
      for (const item of data.days_of_week) {
        const key = `${item.day}-${item.start_time}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
      }
      return true;
    },
    {
      message: "Không được có thời gian trùng lặp (cùng thứ, cùng giờ).",
      path: ["days_of_week"],
    }
  );

export const updateClassSchema = z
  .object({
    name: z.string().min(1, "Vui lòng nhập tên lớp.").optional(),
    days_of_week: z.array(classScheduleSchema).optional(),
    duration_minutes: z
      .number()
      .min(1, "Thời lượng phải lớn hơn 0.")
      .positive("Thời lượng phải là số dương.")
      .optional(),
    max_student_count: z
      .number()
      .min(1, "Sĩ số tối đa phải lớn hơn 0.")
      .int("Sĩ số tối đa phải là số nguyên.")
      .optional(),
    monthly_fee: z
      .number()
      .min(0, "Học phí phải lớn hơn hoặc bằng 0.")
      .nonnegative("Học phí phải là số không âm.")
      .optional(),
    salary_per_session: z
      .number()
      .min(0, "Lương/buổi phải lớn hơn hoặc bằng 0.")
      .nonnegative("Lương/buổi phải là số không âm.")
      .optional(),
    start_date: z.string().min(1, "Vui lòng chọn ngày bắt đầu.").optional(),
    end_date: z.string().min(1, "Vui lòng chọn ngày kết thúc.").optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: "Ngày kết thúc phải sau ngày bắt đầu.",
      path: ["end_date"],
    }
  )
  .refine(
    (data) => {
      // Check for duplicate day + start_time combinations
      if (!data.days_of_week || data.days_of_week.length === 0) return true;
      const seen = new Set<string>();
      for (const item of data.days_of_week) {
        const key = `${item.day}-${item.start_time}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
      }
      return true;
    },
    {
      message: "Không được có thời gian trùng lặp (cùng thứ, cùng giờ).",
      path: ["days_of_week"],
    }
  );

export type CreateClassSchema = z.infer<typeof createClassSchema>;
export type UpdateClassSchema = z.infer<typeof updateClassSchema>;
