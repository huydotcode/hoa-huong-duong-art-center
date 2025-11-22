"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  checkDuplicateStudent,
  createStudent,
} from "@/lib/services/admin-students-service";
import { normalizePhone } from "@/lib/utils";
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
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] =
    useState<CreateStudentSchema | null>(null);
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

  const fullName = form.watch("full_name");
  const phone = form.watch("phone");

  // Check duplicate when both name and phone are filled
  useEffect(() => {
    const checkDuplicate = async () => {
      const trimmedName = fullName?.trim();
      const trimmedPhone = phone?.trim();

      if (!trimmedName || trimmedName.length === 0) {
        setDuplicateWarning(null);
        return;
      }

      // Only check if phone is provided (not empty)
      if (!trimmedPhone || trimmedPhone.length === 0) {
        setDuplicateWarning(null);
        return;
      }

      // Validate phone format before checking
      if (!/^0\d{9}$/.test(trimmedPhone)) {
        setDuplicateWarning(null);
        return;
      }

      setIsCheckingDuplicate(true);
      try {
        const existing = await checkDuplicateStudent(trimmedName, trimmedPhone);
        if (existing) {
          setDuplicateWarning(
            `Cảnh báo: Đã tồn tại học sinh với tên "${trimmedName}" và số điện thoại "${trimmedPhone}". Nếu tiếp tục, bạn sẽ tạo học sinh trùng lặp.`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.error("Error checking duplicate:", error);
        setDuplicateWarning(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    // Debounce check
    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [fullName, phone]);

  // Reset warning when dialog closes
  useEffect(() => {
    if (!open) {
      setDuplicateWarning(null);
      form.reset();
    }
  }, [open, form]);

  async function handleCreateStudent(
    values: CreateStudentSchema,
    skipDuplicateCheck = false
  ) {
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
        path,
        { skipDuplicateCheck }
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
          learning_status: "no_class",
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
      setPendingSubmitData(null);
      setShowDuplicateAlert(false);
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

  async function onSubmit(values: CreateStudentSchema) {
    // Normalize phone for checking (same logic as in createStudent)
    const normalizedPhone = values.phone
      ? values.phone.trim() === ""
        ? null
        : normalizePhone(values.phone)
      : null;

    // Check duplicate before submitting
    try {
      const existing = await checkDuplicateStudent(
        values.full_name.trim(),
        normalizedPhone
      );

      if (existing) {
        // Show alert dialog
        setPendingSubmitData(values);
        setShowDuplicateAlert(true);
        return;
      }
    } catch (error) {
      console.error("Error checking duplicate:", error);
      // Continue with normal flow if check fails
    }

    // No duplicate, proceed with creation
    await handleCreateStudent(values, false);
  }

  async function handleConfirmDuplicate() {
    if (pendingSubmitData) {
      await handleCreateStudent(pendingSubmitData, true);
    }
  }

  return (
    <>
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
                      Có thể để trống. Nếu nhập, phải có 10 số và bắt đầu bằng
                      0.
                    </p>
                  </FormItem>
                )}
              />

              {/* Bỏ field SĐT phụ huynh khi tạo mới theo yêu cầu */}

              {/* Duplicate warning */}
              {duplicateWarning && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{duplicateWarning}</p>
                  </div>
                </div>
              )}

              {isCheckingDuplicate && (
                <p className="text-xs text-muted-foreground">
                  Đang kiểm tra trùng lặp...
                </p>
              )}

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

      <AlertDialog
        open={showDuplicateAlert}
        onOpenChange={setShowDuplicateAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cảnh báo: Học sinh đã tồn tại
            </AlertDialogTitle>
            <AlertDialogDescription>
              Đã tồn tại học sinh với tên{" "}
              <strong>&quot;{pendingSubmitData?.full_name.trim()}&quot;</strong>{" "}
              và số điện thoại{" "}
              <strong>
                &quot;{pendingSubmitData?.phone?.trim() || "không có"}&quot;
              </strong>
              . Bạn có chắc chắn muốn thêm học sinh này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDuplicate}
              disabled={isLoading}
            >
              {isLoading ? "Đang xử lý..." : "Xác nhận thêm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
