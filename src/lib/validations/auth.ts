import { z } from "zod";

export const loginSchema = z.object({
  emailOrPhone: z.string().min(1, {
    message: "Vui lòng nhập email hoặc số điện thoại.",
  }),
  password: z.string().min(1, {
    message: "Vui lòng nhập mật khẩu.",
  }),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const createAdminSchema = z.object({
  full_name: z.string().min(1, "Vui lòng nhập họ và tên."),
  email: z.string().email("Email không hợp lệ."),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
});

export type CreateAdminSchema = z.infer<typeof createAdminSchema>;
