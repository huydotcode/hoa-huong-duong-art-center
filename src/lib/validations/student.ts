import { z } from "zod";

// Phone validation: can be empty, but if provided must be valid format (10 digits, starts with 0)
const phoneSchema = z
  .string()
  .refine(
    (val) => {
      // Allow empty string
      const trimmed = val.trim();
      if (trimmed.length === 0) return true;
      // If provided, must be exactly 10 digits starting with 0
      return /^0\d{9}$/.test(trimmed);
    },
    {
      message: "Số điện thoại phải có 10 số và bắt đầu bằng 0.",
    }
  )
  .or(z.literal(""))
  .optional();

export const createStudentSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ và tên."),
  phone: phoneSchema,
  parent_phone: phoneSchema,
  is_active: z.boolean().optional(),
  notes: z
    .string()
    .max(1000, "Ghi chú tối đa 1000 ký tự.")
    .optional()
    .nullable(),
});

export const updateStudentSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ và tên.").optional(),
  phone: phoneSchema,
  parent_phone: phoneSchema,
  notes: z
    .string()
    .max(1000, "Ghi chú tối đa 1000 ký tự.")
    .optional()
    .nullable(),
  is_active: z.boolean().optional(),
});

export type CreateStudentSchema = z.infer<typeof createStudentSchema>;
export type UpdateStudentSchema = z.infer<typeof updateStudentSchema>;
