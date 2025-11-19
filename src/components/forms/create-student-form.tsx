"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { createStudent } from "@/lib/services/admin-students-service";
import {
  createStudentSchema,
  type CreateStudentSchema,
} from "@/lib/validations/student";
import type { StudentWithClassSummary } from "@/types";

interface CreateStudentFormProps {
  children: React.ReactNode;
}

export function CreateStudentForm({ children }: CreateStudentFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const path = usePathname();
  const dialogContentId = useId();

  const form = useForm<CreateStudentSchema>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      is_active: true,
      notes: "",
    },
  });

  async function onSubmit(values: CreateStudentSchema) {
    setIsLoading(true);

    try {
      const newStudent = await createStudent(
        {
          full_name: values.full_name,
          phone: values.phone || null,
          parent_phone: values.parent_phone || null,
          is_active: values.is_active,
          notes: values.notes?.trim() || null,
        },
        path
      );
      toast.success("Thêm học sinh thành công!");
      try {
        const enriched: StudentWithClassSummary = {
          ...newStudent,
          class_summary: [],
          first_enrollment_date: null,
          tuition_status: "not_created",
          attendance_today_status: "no_session",
          has_session_today: false,
          notes: values.notes?.trim() || null,
        };
        window.dispatchEvent(
          new CustomEvent("student-created", {
            detail: { student: enriched },
          })
        );
      } catch (eventError) {
        console.error("student-created event error:", eventError);
      }
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Error creating student:", error);
      toast.error("Thêm học sinh thất bại", {
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
      <DialogContent id={dialogContentId} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Thêm học sinh mới</DialogTitle>
          <DialogDescription>
            Điền thông tin để thêm học sinh mới vào hệ thống.
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
                  <FormLabel>Số điện thoại (tùy chọn)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập số điện thoại (10 số, bắt đầu bằng 0)"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Có thể để trống. Nếu nhập, phải có 10 số và bắt đầu bằng 0.
                  </p>
                </FormItem>
              )}
            />

            {/* Bỏ field SĐT phụ huynh khi tạo mới theo yêu cầu */}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập ghi chú (tùy chọn)"
                      rows={4}
                      {...field}
                      value={field.value ?? ""}
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
                {isLoading ? "Đang xử lý..." : "Thêm học sinh"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
