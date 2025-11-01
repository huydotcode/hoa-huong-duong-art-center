"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginSchema } from "@/lib/validations/auth";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginSchema) {
    setIsLoading(true);

    const isEmail = values.emailOrPhone.includes("@");

    const { error } = await supabase.auth.signInWithPassword({
      ...(isEmail
        ? { email: values.emailOrPhone }
        : {
            phone: values.emailOrPhone.startsWith("0")
              ? `+84${values.emailOrPhone.substring(1)}`
              : values.emailOrPhone,
          }),
      password: values.password,
    });

    setIsLoading(false);

    if (error) {
      console.error("LoginForm error", error);

      toast.error("Đăng nhập thất bại", {
        description: "Email/SĐT hoặc mật khẩu không chính xác.",
      });
      return;
    }

    toast.success("Đăng nhập thành công!");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        autoComplete="off"
      >
        <FormField
          control={form.control}
          name="emailOrPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email hoặc Số điện thoại</FormLabel>
              <FormControl>
                <Input placeholder="Nhập email hoặc số điện thoại" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mật khẩu</FormLabel>
              <FormControl>
                <PasswordInput placeholder="Nhập mật khẩu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Đang xử lý..." : "Đăng nhập"}
        </Button>
      </form>
    </Form>
  );
}
