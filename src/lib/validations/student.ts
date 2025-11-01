import { z } from "zod";

export const createStudentSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ và tên."),
  phone: z
    .string()
    .length(10, "Số điện thoại phải có 10 số.")
    .regex(/^0\d{9,}$/, "Số điện thoại không hợp lệ."),
  parent_phone: z
    .string()
    .length(10, "Số điện thoại phải có 10 số.")
    .regex(/^0\d{9,}$/, "Số điện thoại không hợp lệ.")
    .optional(),
  is_active: z.boolean().optional(),
});

export const updateStudentSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ và tên.").optional(),
  phone: z
    .string()
    .length(10, "Số điện thoại phải có 10 số.")
    .regex(/^0\d{9,}$/, "Số điện thoại không hợp lệ.")
    .optional(),
  parent_phone: z
    .string()
    .length(10, "Số điện thoại phải có 10 số.")
    .regex(/^0\d{9,}$/, "Số điện thoại không hợp lệ.")
    .optional(),
  is_active: z.boolean().optional(),
});

export type CreateStudentSchema = z.infer<typeof createStudentSchema>;
export type UpdateStudentSchema = z.infer<typeof updateStudentSchema>;
