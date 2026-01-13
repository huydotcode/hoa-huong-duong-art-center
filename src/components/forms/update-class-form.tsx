"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useCallback } from "react";
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
import {
  updateClass,
  checkClassNameExists,
} from "@/lib/services/admin-classes-service";
import { formatCurrencyVNDots } from "@/lib/utils";
import {
  updateClassSchema,
  type UpdateClassSchema,
} from "@/lib/validations/class";
import { type Class } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { SUBJECTS } from "@/lib/constants/subjects";

interface Props {
  classData: Class;
  children: React.ReactNode;
}

export function UpdateClassForm({ classData, children }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
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

  const className = form.watch("name");

  // Check class name exists with debounce (exclude current class)
  const checkName = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        form.clearErrors("name");
        return;
      }

      // If name hasn't changed, don't check
      if (trimmedName === classData.name) {
        form.clearErrors("name");
        return;
      }

      setIsCheckingName(true);
      try {
        const exists = await checkClassNameExists(trimmedName, classData.id);
        if (exists) {
          form.setError("name", {
            type: "manual",
            message: "Tên lớp đã tồn tại. Vui lòng chọn tên khác.",
          });
        } else {
          form.clearErrors("name");
        }
      } catch (error) {
        console.error("Error checking class name:", error);
        // Don't show error to user for validation check failures
      } finally {
        setIsCheckingName(false);
      }
    },
    [form, classData.id, classData.name]
  );

  // Debounce name checking
  useEffect(() => {
    if (!open) return; // Only check when dialog is open

    const timer = setTimeout(() => {
      if (className) {
        checkName(className);
      } else {
        form.clearErrors("name");
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [className, open, checkName, form]);

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
        subject: classData.subject ?? null,
        duration_minutes: classData.duration_minutes,
        max_student_count: classData.max_student_count,
        monthly_fee: classData.monthly_fee,
        salary_per_session: classData.salary_per_session,
        start_date: classData.start_date,
        end_date: classData.end_date,
        is_active: classData.is_active,
      });
      setIsCheckingName(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, classData]);

  async function onSubmit(values: UpdateClassSchema) {
    // Double check name before submitting if it has changed
    if (values.name && values.name.trim() !== classData.name) {
      try {
        const nameExists = await checkClassNameExists(
          values.name.trim(),
          classData.id
        );
        if (nameExists) {
          form.setError("name", {
            type: "manual",
            message: "Tên lớp đã tồn tại. Vui lòng chọn tên khác.",
          });
          return;
        }
      } catch (error) {
        console.error("Error checking class name:", error);
        // Continue with submission if check fails
      }
    }

    setIsLoading(true);
    try {
      await updateClass(classData.id, values, path);
      toast.success("Cập nhật lớp học thành công!");
      try {
        window.dispatchEvent(
          new CustomEvent("class-updated", { detail: { id: classData.id } })
        );
      } catch {}
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
                      <div className="relative">
                        <Input
                          placeholder="Nhập tên lớp"
                          autoComplete="off"
                          list="class-name-suggestions"
                          {...field}
                          disabled={isCheckingName}
                        />
                        {isCheckingName && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        )}
                      </div>
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
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Môn học</FormLabel>
                    <Select
                      value={field.value || "__none__"}
                      onValueChange={(value) =>
                        field.onChange(value === "__none__" ? null : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn môn học (tùy chọn)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Không chọn</SelectItem>
                        {SUBJECTS.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
