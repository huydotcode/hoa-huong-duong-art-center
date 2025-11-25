"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { usePathname, useRouter } from "next/navigation";
import {
  createClass,
  checkClassNameExists,
} from "@/lib/services/admin-classes-service";
import {
  createClassSchema,
  type CreateClassSchema,
} from "@/lib/validations/class";
import { formatCurrencyVNDots } from "@/lib/utils";
import { SUBJECTS } from "@/lib/constants/subjects";
import { DAY_ORDER } from "@/lib/constants/schedule";
import { Trash2, Plus } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

export function CreateClassForm({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [durationMonths, setDurationMonths] = useState(3); // Local state for calculation only
  const [isCheckingName, setIsCheckingName] = useState(false);
  const router = useRouter();
  const path = usePathname();

  const form = useForm<CreateClassSchema>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      name: "",
      subject: null,
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

  const className = form.watch("name");
  const {
    fields: scheduleFields,
    append: appendSchedule,
    remove: removeSchedule,
  } = useFieldArray({
    control: form.control,
    name: "days_of_week",
  });

  const DAY_LABELS = [
    { label: "Thứ 2", value: 1 },
    { label: "Thứ 3", value: 2 },
    { label: "Thứ 4", value: 3 },
    { label: "Thứ 5", value: 4 },
    { label: "Thứ 6", value: 5 },
    { label: "Thứ 7", value: 6 },
    { label: "Chủ nhật", value: 0 },
  ];

  // Check class name exists with debounce
  const checkName = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        form.clearErrors("name");
        return;
      }

      setIsCheckingName(true);
      try {
        const exists = await checkClassNameExists(trimmedName);
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
    [form]
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

  // Reset form and clear errors when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      form.clearErrors();
      setIsCheckingName(false);
    }
  }, [open, form]);

  async function onSubmit(values: CreateClassSchema) {
    // Double check name before submitting
    if (values.name.trim()) {
      try {
        const nameExists = await checkClassNameExists(values.name.trim());
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
      const dayOrderMap = new Map<number, number>(
        DAY_ORDER.map((day, index) => [day, index])
      );
      const normalizedDays =
        values.days_of_week
          ?.map((item) => ({
            day: Number(item.day),
            start_time: item.start_time,
            end_time: item.end_time || undefined,
          }))
          .sort((a, b) => {
            const orderDiff =
              (dayOrderMap.get(a.day) ?? 999) - (dayOrderMap.get(b.day) ?? 999);
            if (orderDiff !== 0) {
              return orderDiff;
            }
            return a.start_time.localeCompare(b.start_time);
          }) ?? [];

      // Ensure days_of_week is always an array and is_active is always boolean
      const classData = {
        ...values,
        days_of_week: normalizedDays,
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

            <FormField
              control={form.control}
              name="days_of_week"
              render={() => (
                <FormItem>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <FormLabel className="mb-1 sm:mb-0">
                      Lịch học trong tuần
                    </FormLabel>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        appendSchedule({
                          day: 1,
                          start_time: "17:00",
                          end_time: "18:30",
                        })
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Thêm ca học
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Có thể để trống nếu chưa chốt lịch.
                  </p>
                  <div className="mt-3 space-y-3">
                    {scheduleFields.length === 0 && (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        Chưa có ca học nào. Nhấn &quot;Thêm ca học&quot; để bắt
                        đầu.
                      </div>
                    )}
                    {scheduleFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center"
                      >
                        <FormField
                          control={form.control}
                          name={`days_of_week.${index}.day`}
                          render={({ field }) => (
                            <FormItem className="w-full md:w-1/3">
                              <FormLabel className="md:hidden">Thứ</FormLabel>
                              <Select
                                value={String(field.value ?? 1)}
                                onValueChange={(value) =>
                                  field.onChange(Number(value))
                                }
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn thứ" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {DAY_LABELS.map((item) => (
                                    <SelectItem
                                      key={item.value}
                                      value={String(item.value)}
                                    >
                                      {item.label}
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
                          name={`days_of_week.${index}.start_time`}
                          render={({ field }) => (
                            <FormItem className="w-full md:w-1/3">
                              <FormLabel className="md:hidden">
                                Giờ bắt đầu
                              </FormLabel>
                              <FormControl>
                                <Input type="time" step={300} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`days_of_week.${index}.end_time`}
                          render={({ field }) => (
                            <FormItem className="w-full md:w-1/3">
                              <FormLabel className="md:hidden">
                                Giờ kết thúc
                              </FormLabel>
                              <FormControl>
                                <Input type="time" step={300} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive md:self-start"
                          onClick={() => removeSchedule(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
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
