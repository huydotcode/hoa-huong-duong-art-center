"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateStudentEnrollment } from "@/lib/services/admin-classes-service";
import { ClassStudentItem } from "@/types";
import { z } from "zod";

const updateEnrollmentSchema = z.object({
  status: z.enum(["trial", "active", "inactive"]),
  enrollment_date: z.string().min(1, "Vui lòng chọn ngày đăng ký."),
  leave_date: z.string().optional().nullable(),
  leave_reason: z.string().optional().nullable(),
});

type UpdateEnrollmentSchema = z.infer<typeof updateEnrollmentSchema>;

interface UpdateEnrollmentFormProps {
  enrollment: ClassStudentItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateEnrollmentForm({
  enrollment,
  open,
  onOpenChange,
}: UpdateEnrollmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const path = usePathname();

  const form = useForm<UpdateEnrollmentSchema>({
    resolver: zodResolver(updateEnrollmentSchema),
    defaultValues: {
      status: enrollment.status,
      enrollment_date: enrollment.enrollment_date,
      leave_date: enrollment.leave_date || null,
      leave_reason: enrollment.leave_reason || null,
    },
  });

  const currentStatus = form.watch("status");
  const showLeaveFields = currentStatus === "inactive";

  useEffect(() => {
    if (open) {
      form.reset({
        status: enrollment.status,
        enrollment_date: enrollment.enrollment_date,
        leave_date: enrollment.leave_date || null,
        leave_reason: enrollment.leave_reason || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, enrollment]);

  // Auto-set leave_date when status changes to inactive
  useEffect(() => {
    if (currentStatus === "inactive" && !form.getValues("leave_date")) {
      form.setValue("leave_date", new Date().toISOString().split("T")[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatus]);

  async function onSubmit(values: UpdateEnrollmentSchema) {
    setIsLoading(true);
    try {
      await updateStudentEnrollment(
        enrollment.enrollment_id,
        {
          status: values.status,
          enrollment_date: values.enrollment_date,
          leave_date: values.leave_date || null,
          leave_reason: values.leave_reason || null,
        },
        path
      );
      toast.success("Cập nhật thông tin học sinh thành công!");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating enrollment:", error);
      toast.error("Cập nhật thông tin học sinh thất bại", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cập nhật thông tin học sinh</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            autoComplete="off"
          >
            <div className="space-y-2">
              <p className="text-sm font-medium">Học sinh</p>
              <p className="text-sm text-muted-foreground">
                {enrollment.student.full_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {enrollment.student.phone}
              </p>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trial">Học thử</SelectItem>
                      <SelectItem value="active">Đang học</SelectItem>
                      <SelectItem value="inactive">Ngừng học</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enrollment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày đăng ký</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Chọn ngày đăng ký"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showLeaveFields && (
              <>
                <FormField
                  control={form.control}
                  name="leave_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày rời lớp</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value || ""}
                          onChange={(value) => field.onChange(value || null)}
                          placeholder="Chọn ngày rời lớp"
                        />
                      </FormControl>
                      <FormDescription>
                        Ngày học sinh ngừng học lớp này. Nếu không chọn, sẽ tự
                        động đặt là ngày hiện tại.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leave_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lý do rời lớp</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          onChange={(
                            e: React.ChangeEvent<HTMLTextAreaElement>
                          ) => field.onChange(e.target.value || null)}
                          placeholder="Nhập lý do rời lớp (tùy chọn)"
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Ghi chú về lý do học sinh ngừng học lớp này.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Đang cập nhật..." : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
