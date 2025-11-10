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

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    new_password: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự."),
    confirm_password: z.string().min(6, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirm_password"],
  });

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
