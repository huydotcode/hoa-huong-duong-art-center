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
