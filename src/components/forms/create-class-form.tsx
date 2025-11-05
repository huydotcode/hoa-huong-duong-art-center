"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { usePathname, useRouter } from "next/navigation";
import { createClass } from "@/lib/services/admin-classes-service";
import {
  createClassSchema,
  type CreateClassSchema,
} from "@/lib/validations/class";
import { formatCurrencyVNDots } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
}

export function CreateClassForm({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [durationMonths, setDurationMonths] = useState(3); // Local state for calculation only
  const router = useRouter();
  const path = usePathname();

  const form = useForm<CreateClassSchema>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      name: "",
      days_of_week: [],
      duration_minutes: 90,
      max_student_count: 20,
      monthly_fee: 0,
      salary_per_session: 0,
      start_date: "",
      end_date: "",
      is_active: true,
    },
  });

  async function onSubmit(values: CreateClassSchema) {
    setIsLoading(true);
    try {
      // Ensure days_of_week is always an array and is_active is always boolean
      const classData = {
        ...values,
        days_of_week: values.days_of_week || [],
        is_active: values.is_active ?? true,
      };
      await createClass(classData, { path });
      toast.success("Tạo lớp học thành công!");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Tạo lớp học thất bại", {
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
          <DialogTitle>Thêm lớp học</DialogTitle>
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

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
                {isLoading ? "Đang tạo..." : "Tạo lớp học"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
