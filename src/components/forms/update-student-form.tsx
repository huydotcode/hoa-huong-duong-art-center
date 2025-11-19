"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateStudent } from "@/lib/services/admin-students-service";
import {
  updateStudentSchema,
  type UpdateStudentSchema,
} from "@/lib/validations/student";
import { type Student } from "@/types";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  student: Student;
  children: React.ReactNode;
}

export function UpdateStudentForm({ student, children }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const path = usePathname();

  const form = useForm<UpdateStudentSchema>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: {
      full_name: student.full_name,
      phone: student.phone || "",
      is_active: student.is_active,
      notes: student.notes || "",
    },
  });

  // Reset form with latest student data whenever dialog opens
  // This ensures form always shows the most up-to-date data after refresh
  useEffect(() => {
    if (open) {
      form.reset({
        full_name: student.full_name,
        phone: student.phone || "",
        is_active: student.is_active,
        notes: student.notes || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    student.id,
    student.full_name,
    student.phone,
    student.is_active,
    student.updated_at,
  ]);

  async function onSubmit(values: UpdateStudentSchema) {
    setIsLoading(true);
    try {
      await updateStudent(student.id, values, path);
      toast.success("Cập nhật học sinh thành công!");
      try {
        window.dispatchEvent(
          new CustomEvent("student-updated", {
            detail: {
              student: {
                ...student,
                full_name: values.full_name,
                phone: values.phone?.trim() || null,
                is_active: values.is_active,
                notes: values.notes?.trim() || null,
                updated_at: new Date().toISOString(),
              },
            },
          })
        );
      } catch {}
      // Close dialog first
      setOpen(false);
      // Then refresh to get updated data from server
      // The key prop with updated_at will ensure form re-renders with new data
      router.refresh();
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("Cập nhật học sinh thất bại", {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa học sinh</DialogTitle>
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

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Hoạt động</SelectItem>
                      <SelectItem value="false">Ngừng hoạt động</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SĐT phụ huynh tạm thời không sử dụng */}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Nhập ghi chú (tùy chọn)"
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
                {isLoading ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
