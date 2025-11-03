"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "next/navigation";
import { updateClassDaySchedule } from "@/lib/services/admin-classes-service";
import { type Class } from "@/types";
import { X, Plus } from "lucide-react";
import { toArray } from "@/lib/utils";
import { calculateEndTime as calculateEndTimeUtil } from "@/lib/utils/time";
import { TimePicker } from "@/components/ui/time-picker";

interface Props {
  classData: Class;
  day: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const dayScheduleSchema = z.object({
  start_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Giờ không hợp lệ (HH:MM)"),
  end_time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Giờ không hợp lệ (HH:MM)"),
});

const editDayScheduleSchema = z
  .object({
    times: z.array(dayScheduleSchema).min(0),
  })
  .refine(
    (data) => {
      // Check for duplicate start_time
      const seen = new Set<string>();
      for (const item of data.times) {
        if (seen.has(item.start_time)) {
          return false;
        }
        seen.add(item.start_time);
      }
      return true;
    },
    {
      message: "Không được có thời gian trùng lặp.",
      path: ["times"],
    }
  )
  .refine(
    (data) => {
      // Check that end_time > start_time for each item
      for (const item of data.times) {
        const [startH, startM] = item.start_time.split(":").map(Number);
        const [endH, endM] = item.end_time.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (endMinutes <= startMinutes) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Giờ kết thúc phải sau giờ bắt đầu.",
      path: ["times"],
    }
  );

type EditDayScheduleSchema = z.infer<typeof editDayScheduleSchema>;

// Quick time slots - các khung giờ chính
const quickTimes = [
  { start: "08:00", end: "09:00", label: "8h-9h" },
  { start: "09:00", end: "10:00", label: "9h-10h" },
  { start: "09:00", end: "10:30", label: "9h-10h30" },
  { start: "15:30", end: "17:00", label: "15h30-17h" },
  { start: "16:00", end: "17:00", label: "16h-17h" },
  { start: "17:00", end: "18:00", label: "17h-18h" },
  { start: "17:00", end: "18:30", label: "17h-18h30" },
  { start: "17:30", end: "18:30", label: "17h30-18h30" },
  { start: "18:00", end: "19:00", label: "18h-19h" },
  { start: "18:30", end: "19:30", label: "18h30-19h30" },
  { start: "18:30", end: "20:00", label: "18h30-20h" },
];

// Map for dialog title (simpler format)
const DAY_NAME_MAP: Record<number, string> = {
  0: "Chủ nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

export function EditDayScheduleForm({
  classData,
  day,
  open,
  onOpenChange,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuickTime, setSelectedQuickTime] = useState<
    string | undefined
  >(undefined);
  const router = useRouter();
  const path = usePathname();

  // Helper function to calculate end time using class duration
  const calculateEndTime = (startTime: string): string => {
    return calculateEndTimeUtil(startTime, classData.duration_minutes);
  };

  // Get existing times for this day
  const parsedDaysOfWeek = toArray<{
    day: number;
    start_time: string;
    end_time?: string;
  }>(classData.days_of_week);
  const existingTimes = parsedDaysOfWeek
    .filter((item) => item.day === day)
    .map((item) => {
      // Nếu đã có end_time trong DB thì dùng, nếu không thì tính từ duration_minutes (gợi ý)
      const endTime = item.end_time || calculateEndTime(item.start_time);
      return {
        start_time: item.start_time,
        end_time: endTime,
      };
    });

  const form = useForm<EditDayScheduleSchema>({
    resolver: zodResolver(editDayScheduleSchema),
    defaultValues: {
      times: existingTimes.length > 0 ? existingTimes : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "times",
  });

  // Watch form values to auto-sort
  const watchedTimes = form.watch("times");

  useEffect(() => {
    if (watchedTimes && watchedTimes.length > 1) {
      const sorted = [...watchedTimes].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
      const currentSorted = JSON.stringify(sorted);
      const formSorted = JSON.stringify(watchedTimes);
      if (currentSorted !== formSorted) {
        form.setValue("times", sorted, { shouldValidate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTimes]);

  // Handle start time change - KHÔNG tự động tính end_time (duration_minutes chỉ là gợi ý)
  const handleStartTimeChange = (index: number, newStartTime: string) => {
    form.setValue(`times.${index}.start_time`, newStartTime);
    form.trigger("times");
  };

  // Reset form when dialog opens or day changes
  useEffect(() => {
    if (open) {
      const parsedDaysOfWeek = toArray<{
        day: number;
        start_time: string;
        end_time?: string;
      }>(classData.days_of_week);
      const existingTimes = parsedDaysOfWeek
        .filter((item) => item.day === day)
        .map((item) => {
          // Nếu đã có end_time trong DB thì dùng, nếu không thì tính từ duration_minutes (gợi ý)
          const endTime = item.end_time || calculateEndTime(item.start_time);
          return {
            start_time: item.start_time,
            end_time: endTime,
          };
        });
      form.reset({
        times: existingTimes.length > 0 ? existingTimes : [],
      });
      // Reset quick select
      setSelectedQuickTime(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, day]);

  async function onSubmit(values: EditDayScheduleSchema) {
    setIsLoading(true);
    try {
      // Convert to days_of_week format - lưu cả start_time và end_time
      const daySchedules = values.times.map((t) => ({
        day,
        start_time: t.start_time,
        end_time: t.end_time, // Lưu end_time vào database
      }));
      // Pass day parameter to handle empty array case (when deleting all schedules)
      await updateClassDaySchedule(classData.id, daySchedules, path, day);
      toast.success(`Cập nhật lịch học ${DAY_NAME_MAP[day]} thành công!`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating day schedule:", error);
      toast.error("Cập nhật lịch học thất bại", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        maxWidth="sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Chỉnh sửa lịch học - {DAY_NAME_MAP[day]}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            autoComplete="off"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Khung giờ học</FormLabel>
                <span className="text-sm text-muted-foreground">
                  Tổng: {fields.length} ca
                </span>
              </div>

              {/* Quick select */}
              <div className="mb-3">
                <FormLabel className="mb-2 block">
                  Chọn khung giờ nhanh
                </FormLabel>
                <Select
                  value={selectedQuickTime}
                  onValueChange={(value) => {
                    setSelectedQuickTime(value);
                    const slot = quickTimes.find(
                      (s) => `${s.start}-${s.end}` === value
                    );
                    if (slot) {
                      const currentTimes = form.getValues("times");
                      // Check if time already exists
                      if (
                        !currentTimes.some((t) => t.start_time === slot.start)
                      ) {
                        append({
                          start_time: slot.start,
                          end_time: slot.end,
                        });
                        setTimeout(() => form.trigger("times"), 0);
                      }
                      // Reset selection
                      setSelectedQuickTime(undefined);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn khung giờ" />
                  </SelectTrigger>
                  <SelectContent>
                    {quickTimes.map((slot, idx) => (
                      <SelectItem
                        key={`${slot.start}-${slot.end}-${idx}`}
                        value={`${slot.start}-${slot.end}`}
                      >
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2 space-y-2">
                {fields.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Chưa có khung giờ nào. Nhấn &quot;Thêm khung giờ&quot; hoặc
                    chọn khung giờ nhanh ở trên để thêm.
                  </p>
                )}
                {fields.length > 0 && (
                  <div className="hidden sm:grid grid-cols-2 gap-2 mb-1 px-1">
                    <FormLabel className="text-xs text-muted-foreground">
                      Bắt đầu
                    </FormLabel>
                    <FormLabel className="text-xs text-muted-foreground">
                      Kết thúc
                    </FormLabel>
                  </div>
                )}
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative flex flex-col sm:flex-row sm:items-center gap-2"
                  >
                    {/* Delete button - positioned top right on mobile, inline on desktop */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1 w-full pr-8 sm:pr-0 sm:flex-1">
                      <div className="flex flex-col sm:flex-1 w-full">
                        <FormLabel className="text-xs text-muted-foreground mb-1 sm:hidden">
                          Bắt đầu
                        </FormLabel>
                        <FormField
                          control={form.control}
                          name={`times.${index}.start_time`}
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormControl>
                                <TimePicker
                                  value={field.value || "08:00"}
                                  onChange={(value) => {
                                    handleStartTimeChange(index, value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <span className="hidden sm:inline text-muted-foreground font-medium shrink-0 mx-1">
                        -
                      </span>
                      <div className="flex flex-col sm:flex-1 w-full">
                        <FormLabel className="text-xs text-muted-foreground mb-1 sm:hidden">
                          Kết thúc
                        </FormLabel>
                        <FormField
                          control={form.control}
                          name={`times.${index}.end_time`}
                          render={({ field }) => (
                            <FormItem className="w-full">
                              <FormControl>
                                <TimePicker
                                  value={field.value || "09:00"}
                                  onChange={(value) => {
                                    field.onChange(value);
                                    form.trigger("times");
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        remove(index);
                        setTimeout(() => form.trigger("times"), 0);
                      }}
                      className="absolute top-0 right-0 sm:relative sm:top-auto sm:right-auto shrink-0 z-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    append({
                      start_time: "08:00",
                      end_time: calculateEndTime("08:00"),
                    });
                    setTimeout(() => form.trigger("times"), 0);
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm khung giờ
                </Button>
              </div>
              {form.formState.errors.times &&
                typeof form.formState.errors.times.message === "string" && (
                  <p className="text-sm font-medium text-destructive mt-1">
                    {form.formState.errors.times.message}
                  </p>
                )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
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
                {isLoading ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
