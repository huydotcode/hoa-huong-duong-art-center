"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { createTeacher } from "@/lib/services/admin-teachers-service";
import {
  createTeacherSchema,
  type CreateTeacherSchema,
} from "@/lib/validations/teacher";

interface CreateTeacherFormProps {
  children: React.ReactNode;
}

export function CreateTeacherForm({ children }: CreateTeacherFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const path = usePathname();

  const form = useForm<CreateTeacherSchema>({
    resolver: zodResolver(createTeacherSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      password: "",
      notes: "",
    },
  });

  async function onSubmit(values: CreateTeacherSchema) {
    setIsLoading(true);

    try {
      await createTeacher(values, path);
      toast.success("Thêm giáo viên thành công!");
      window.dispatchEvent(new CustomEvent("teacher-created"));
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error creating teacher:", error);
      toast.error("Thêm giáo viên thất bại", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thêm giáo viên mới</DialogTitle>
          <DialogDescription>
            Điền thông tin để thêm giáo viên mới vào hệ thống.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            autoComplete="off"
          >
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ và tên</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập họ và tên"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập số điện thoại"
                      autoComplete="off"
                      {...field}
                    />
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (tùy chọn)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập ghi chú"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Đang xử lý..." : "Thêm giáo viên"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
