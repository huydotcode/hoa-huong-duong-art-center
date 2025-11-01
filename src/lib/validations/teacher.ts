import { z } from "zod";

export const createTeacherSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ và tên."),
  phone: z
    .string()
    .length(10, "Số điện thoại phải có 10 số.")
    .regex(/^0\d{9,}$/, "Số điện thoại không hợp lệ."),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
  salary_per_session: z
    .number()
    .min(0, "Lương/buổi phải lớn hơn 0.")
    .positive("Lương/buổi phải là số dương."),
  notes: z.string().optional(),
});

export const updateTeacherSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ và tên.").optional(),
  phone: z
    .string()
    .length(10, "Số điện thoại phải có 10 số.")
    .regex(/^0\d{9,}$/, "Số điện thoại không hợp lệ.")
    .optional(),
  salary_per_session: z
    .number()
    .min(0, "Lương/buổi phải lớn hơn 0.")
    .positive("Lương/buổi phải là số dương.")
    .optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
});

export type CreateTeacherSchema = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherSchema = z.infer<typeof updateTeacherSchema>;
