"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateClass } from "@/lib/services/admin-classes-service";
import { formatCurrencyVNDots } from "@/lib/utils";
import {
  updateClassSchema,
  type UpdateClassSchema,
} from "@/lib/validations/class";
import { type Class } from "@/types";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  classData: Class;
  children: React.ReactNode;
}

export function UpdateClassForm({ classData, children }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const path = usePathname();

  // Calculate duration_months from start_date and end_date (local state only)
  const calculateDurationMonths = (
    startDate: string,
    endDate: string
  ): number => {
    if (!startDate || !endDate) return 3;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    return months > 0 ? months : 3;
  };

  const [durationMonths, setDurationMonths] = useState(
    calculateDurationMonths(classData.start_date, classData.end_date)
  );

  const form = useForm<UpdateClassSchema>({
    resolver: zodResolver(updateClassSchema),
    defaultValues: {
      name: classData.name,
      duration_minutes: classData.duration_minutes,
      max_student_count: classData.max_student_count,
      monthly_fee: classData.monthly_fee,
      salary_per_session: classData.salary_per_session,
      start_date: classData.start_date,
      end_date: classData.end_date,
      is_active: classData.is_active,
    },
  });

  // Reset form when dialog opens or classData changes
  useEffect(() => {
    if (open) {
      const calculatedDuration = calculateDurationMonths(
        classData.start_date,
        classData.end_date
      );
      setDurationMonths(calculatedDuration);
      form.reset({
        name: classData.name,
        duration_minutes: classData.duration_minutes,
        max_student_count: classData.max_student_count,
        monthly_fee: classData.monthly_fee,
        salary_per_session: classData.salary_per_session,
        start_date: classData.start_date,
        end_date: classData.end_date,
        is_active: classData.is_active,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, classData]);

  async function onSubmit(values: UpdateClassSchema) {
    setIsLoading(true);
    try {
      await updateClass(classData.id, values, path);
      toast.success("Cập nhật lớp học thành công!");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating class:", error);
      toast.error("Cập nhật lớp học thất bại", {
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cập nhật thông tin lớp học</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            autoComplete="off"
          >
            <div className="grid md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên lớp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập tên lớp"
                        autoComplete="off"
                        list="class-name-suggestions"
                        {...field}
                      />
                    </FormControl>
                    <datalist id="class-name-suggestions">
                      <option value="Piano" />
                      <option value="Trống" />
                      <option value="Vẽ" />
                      <option value="Múa" />
                      <option value="Guitar" />
                      <option value="Nhảy" />
                      <option value="Ballet" />
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời lượng buổi học</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Nhập số phút"
                          value={field.value || ""}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\D/g, "");
                            if (rawValue === "") {
                              field.onChange(0);
                              return;
                            }
                            const numValue = Number(rawValue);
                            if (!isNaN(numValue) && numValue >= 0) {
                              field.onChange(numValue);
                            }
                          }}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          className="flex-1"
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        phút
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_student_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sĩ số tối đa</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Nhập sĩ số tối đa"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, "");
                          if (rawValue === "") {
                            field.onChange(undefined);
                            return;
                          }
                          const numValue = Number(rawValue);
                          if (!isNaN(numValue) && numValue > 0) {
                            field.onChange(numValue);
                          }
                        }}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="monthly_fee"
              render={({ field }) => {
                // Display value divided by 1000 for input
                const displayValue = field.value ? field.value / 1000 : "";
                return (
                  <FormItem>
                    <FormLabel>Học phí/tháng</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Nhập học phí (nghìn)"
                        value={displayValue || ""}
                        onChange={(e) => {
                          // Remove all non-digit characters
                          const rawValue = e.target.value.replace(/\D/g, "");
                          if (rawValue === "") {
                            field.onChange(0);
                            return;
                          }
                          const numValue = Number(rawValue);
                          if (!isNaN(numValue)) {
                            // Multiply by 1000 to store actual value
                            field.onChange(numValue * 1000);
                          }
                        }}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    {displayValue && field.value && field.value > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {formatCurrencyVNDots(field.value)}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="salary_per_session"
              render={({ field }) => {
                // Display value divided by 1000 for input
                const displayValue = field.value ? field.value / 1000 : "";
                return (
                  <FormItem>
                    <FormLabel>Lương/buổi</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Nhập lương/buổi (nghìn)"
                        value={displayValue || ""}
                        onChange={(e) => {
                          // Remove all non-digit characters
                          const rawValue = e.target.value.replace(/\D/g, "");
                          if (rawValue === "") {
                            field.onChange(0);
                            return;
                          }
                          const numValue = Number(rawValue);
                          if (!isNaN(numValue)) {
                            // Multiply by 1000 to store actual value
                            field.onChange(numValue * 1000);
                          }
                        }}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    </FormControl>
                    {displayValue && field.value && field.value > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {formatCurrencyVNDots(field.value)}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày bắt đầu</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          // Calculate end_date from start_date + durationMonths (gợi ý)
                          if (value && durationMonths > 0) {
                            const startDate = new Date(value);
                            // Giữ nguyên ngày trong tháng, chỉ thêm số tháng
                            const endDate = new Date(
                              startDate.getFullYear(),
                              startDate.getMonth() + durationMonths,
                              startDate.getDate()
                            );
                            const year = endDate.getFullYear();
                            const month = String(
                              endDate.getMonth() + 1
                            ).padStart(2, "0");
                            const day = String(endDate.getDate()).padStart(
                              2,
                              "0"
                            );
                            form.setValue(
                              "end_date",
                              `${year}-${month}-${day}`
                            );
                          }
                          form.trigger("end_date");
                        }}
                        placeholder="Chọn ngày bắt đầu"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Thời gian học (tháng)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Nhập số tháng"
                    value={durationMonths || ""}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");
                      if (rawValue === "") {
                        setDurationMonths(0);
                        return;
                      }
                      const numValue = Number(rawValue);
                      if (!isNaN(numValue) && numValue > 0) {
                        setDurationMonths(numValue);
                        // Calculate end_date from start_date + durationMonths (gợi ý)
                        const startDate = form.getValues("start_date");
                        if (startDate) {
                          const start = new Date(startDate);
                          // Giữ nguyên ngày trong tháng, chỉ thêm số tháng
                          const endDate = new Date(
                            start.getFullYear(),
                            start.getMonth() + numValue,
                            start.getDate()
                          );
                          const year = endDate.getFullYear();
                          const month = String(endDate.getMonth() + 1).padStart(
                            2,
                            "0"
                          );
                          const day = String(endDate.getDate()).padStart(
                            2,
                            "0"
                          );
                          form.setValue("end_date", `${year}-${month}-${day}`);
                        }
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            </div>

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày kết thúc</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Recalculate duration_months when end_date is manually changed
                        const startDate = form.getValues("start_date");
                        if (value && startDate) {
                          const start = new Date(startDate);
                          const end = new Date(value);
                          const months =
                            (end.getFullYear() - start.getFullYear()) * 12 +
                            (end.getMonth() - start.getMonth());
                          if (months > 0) {
                            setDurationMonths(months);
                          }
                        }
                        form.trigger("end_date");
                      }}
                      placeholder="Chọn ngày kết thúc"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <FormLabel>Đang ghi danh</FormLabel>
                <Input
                  value={String(classData.current_student_count)}
                  disabled
                />
              </div>
              <div>
                <FormLabel>Tối đa</FormLabel>
                <Input value={String(classData.max_student_count)} disabled />
              </div>
            </div>

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
                {isLoading ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
