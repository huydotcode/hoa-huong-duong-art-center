"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePathname, useRouter } from "next/navigation";
import {
  createPaymentStatus,
  updatePaymentStatus,
  getStudentClassesInMonth,
  activateStudentEnrollment,
} from "@/lib/services/admin-payment-service";
import type { TuitionItem } from "@/lib/services/admin-payment-service";
import { formatCurrencyVNDots, formatEnrollmentStatus } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
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

const paymentFormSchema = z.object({
  classId: z.string().min(1, "Vui lòng chọn lớp"),
  amount: z.number().min(0, "Số tiền phải lớn hơn hoặc bằng 0"),
  isPaid: z.boolean(),
  paidAt: z.string().optional(),
});

type PaymentFormSchema = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  payment: TuitionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  year: number;
  onSuccess?: () => void;
  onPaymentUpdate?: (updatedItem: TuitionItem) => void;
}

export function PaymentForm({
  payment,
  open,
  onOpenChange,
  month,
  year,
  onSuccess,
  onPaymentUpdate,
}: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [studentClasses, setStudentClasses] = useState<
    Array<{
      classId: string;
      className: string;
      monthlyFee: number;
      enrollmentDate: string;
      leaveDate: string | null;
      isLastClass: boolean;
    }>
  >([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] =
    useState<PaymentFormSchema | null>(null);
  const router = useRouter();
  const path = usePathname();

  // Initialize form with safe defaults
  const form = useForm<PaymentFormSchema>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      classId: "",
      amount: 0,
      isPaid: false,
      paidAt: new Date().toISOString().split("T")[0],
    },
  });

  // Update form when payment changes
  useEffect(() => {
    if (payment) {
      const amount =
        payment.amount !== null && payment.amount !== undefined
          ? payment.amount
          : payment.monthlyFee || 0;

      form.reset({
        classId: payment.classId || "",
        amount,
        isPaid: payment.isPaid ?? false,
        paidAt: payment.paidAt
          ? payment.paidAt.split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    }
  }, [payment, form]);

  const isEdit = !!payment?.paymentStatusId;
  const hasMultipleClasses = studentClasses.length > 1;

  // Load student classes when creating new payment
  useEffect(() => {
    if (open && !isEdit && payment) {
      setLoadingClasses(true);
      getStudentClassesInMonth(payment.studentId, month, year)
        .then((classes) => {
          setStudentClasses(classes);

          // Ưu tiên dùng classId từ payment (lớp mà user click vào)
          const currentPaymentClass = classes.find(
            (c) => c.classId === payment.classId
          );

          if (currentPaymentClass) {
            // Nếu lớp từ payment có trong danh sách, dùng lớp đó
            form.setValue("classId", currentPaymentClass.classId);
            form.setValue("amount", currentPaymentClass.monthlyFee);
          } else {
            // Nếu không có, dùng last class làm default
            const lastClass = classes.find((c) => c.isLastClass);
            if (lastClass) {
              form.setValue("classId", lastClass.classId);
              form.setValue("amount", lastClass.monthlyFee);
            } else if (classes.length > 0) {
              form.setValue("classId", classes[0].classId);
              form.setValue("amount", classes[0].monthlyFee);
            }
          }
        })
        .catch((error) => {
          console.error("Error loading student classes:", error);
          toast.error("Lỗi khi tải danh sách lớp");
        })
        .finally(() => {
          setLoadingClasses(false);
        });
    } else if (open && isEdit && payment) {
      // For edit mode, form values are already set by the payment useEffect above
      setStudentClasses([]);
    }
  }, [open, isEdit, payment, month, year, form]);

  // Update amount when class changes (only for create mode, and only when user manually changes class)
  const watchedClassId = form.watch("classId");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Skip first update (initial load) to avoid overriding the default class selection
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    if (!isEdit && watchedClassId && studentClasses.length > 0) {
      const selectedClass = studentClasses.find(
        (c) => c.classId === watchedClassId
      );
      if (selectedClass) {
        form.setValue("amount", selectedClass.monthlyFee);
      }
    }
  }, [watchedClassId, studentClasses, isEdit, form, isInitialLoad]);

  // Reset isInitialLoad when dialog opens/closes
  useEffect(() => {
    if (open) {
      setIsInitialLoad(true);
    }
  }, [open]);

  // Update paidAt when isPaid changes
  const watchedIsPaid = form.watch("isPaid");
  useEffect(() => {
    if (watchedIsPaid && !form.getValues("paidAt")) {
      form.setValue("paidAt", new Date().toISOString().split("T")[0]);
    }
  }, [watchedIsPaid, form]);

  async function onSubmit(values: PaymentFormSchema) {
    if (!payment) return;

    // Nếu học sinh trial hoặc inactive đóng học phí, hiện dialog confirm
    if (
      values.isPaid &&
      (payment.enrollmentStatus === "trial" ||
        payment.enrollmentStatus === "inactive")
    ) {
      setPendingPaymentData(values);
      setShowActivateDialog(true);
      return;
    }

    // Nếu không phải trial/inactive hoặc chưa đóng, xử lý bình thường
    await processPayment(values);
  }

  async function processPayment(
    values: PaymentFormSchema,
    skipUIUpdate = false
  ): Promise<string> {
    if (!payment) throw new Error("Payment is required");

    setIsLoading(true);
    try {
      let paymentStatusId: string;

      if (isEdit && payment.paymentStatusId) {
        // Update existing payment status
        await updatePaymentStatus(
          payment.paymentStatusId,
          {
            amount: values.amount,
            is_paid: values.isPaid,
            paid_at: values.isPaid && values.paidAt ? values.paidAt : undefined,
          },
          path
        );
        paymentStatusId = payment.paymentStatusId;
        if (!skipUIUpdate) {
          toast.success("Cập nhật học phí thành công!");
        }
      } else {
        // Create new payment status
        paymentStatusId = await createPaymentStatus(
          {
            student_id: payment.studentId,
            class_id: values.classId,
            month,
            year,
            amount: values.amount,
            is_paid: values.isPaid,
            paid_at: values.isPaid && values.paidAt ? values.paidAt : undefined,
          },
          path
        );
        if (!skipUIUpdate) {
          toast.success("Tạo học phí thành công!");
        }
      }

      // Optimistic update: cập nhật UI ngay lập tức (chỉ khi không skip)
      if (!skipUIUpdate && onPaymentUpdate) {
        // Tìm className từ studentClasses nếu có, hoặc dùng từ payment
        const selectedClass = studentClasses.find(
          (c) => c.classId === values.classId
        );
        const className = selectedClass
          ? selectedClass.className
          : payment.className;

        const updatedItem: TuitionItem = {
          ...payment,
          paymentStatusId,
          classId: values.classId,
          className,
          amount: values.amount,
          isPaid: values.isPaid,
          paidAt: values.isPaid && values.paidAt ? values.paidAt : null,
          month: payment.month,
        };
        onPaymentUpdate(updatedItem);
      }

      if (!skipUIUpdate) {
        form.reset();
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }

      // Refresh data ở background (không block UI)
      router.refresh();

      return paymentStatusId;
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error(
        isEdit ? "Cập nhật học phí thất bại" : "Tạo học phí thất bại",
        {
          description:
            error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        }
      );
      throw error; // Re-throw để caller có thể handle
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmActivate() {
    if (!payment || !pendingPaymentData) return;

    setIsLoading(true);
    try {
      // Xử lý payment trước (skip UI update vì sẽ update sau với enrollmentStatus mới)
      const paymentStatusId = await processPayment(pendingPaymentData, true);

      // Sau đó activate enrollment
      await activateStudentEnrollment(payment.enrollmentId, path);

      // Cập nhật UI với enrollmentStatus mới
      if (onPaymentUpdate) {
        const selectedClass = studentClasses.find(
          (c) => c.classId === pendingPaymentData.classId
        );
        const className = selectedClass
          ? selectedClass.className
          : payment.className;

        const updatedItem: TuitionItem = {
          ...payment,
          paymentStatusId,
          classId: pendingPaymentData.classId,
          className,
          amount: pendingPaymentData.amount,
          isPaid: pendingPaymentData.isPaid,
          paidAt:
            pendingPaymentData.isPaid && pendingPaymentData.paidAt
              ? pendingPaymentData.paidAt
              : null,
          enrollmentStatus: "active", // Cập nhật status
          month: payment.month,
        };
        onPaymentUpdate(updatedItem);
      }

      toast.success("Đã chuyển học sinh sang trạng thái đang học");
      setShowActivateDialog(false);
      setPendingPaymentData(null);
      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error activating student:", error);
      toast.error("Lỗi khi chuyển trạng thái học sinh", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelActivate() {
    if (!pendingPaymentData) {
      setShowActivateDialog(false);
      return;
    }

    // Vẫn xử lý payment nhưng không activate enrollment
    try {
      await processPayment(pendingPaymentData, false);
      setShowActivateDialog(false);
      setPendingPaymentData(null);
    } catch (error) {
      console.error("Error processing payment:", error);
      // Error đã được xử lý trong processPayment
    }
  }

  if (!payment) return null;

  const enrollmentStatusLabel =
    payment.enrollmentStatus === "trial"
      ? "học thử"
      : payment.enrollmentStatus === "inactive"
        ? "ngừng học"
        : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Chỉnh sửa học phí" : "Tạo học phí mới"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              autoComplete="off"
            >
              {payment.enrollmentStatus === "trial" && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="text-yellow-800">
                    <strong>Lưu ý:</strong> Học sinh đang có trạng thái{" "}
                    {formatEnrollmentStatus(payment.enrollmentStatus)}. Vui lòng
                    kiểm tra kỹ trước khi tạo học phí.
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lớp học</FormLabel>
                    {isEdit ? (
                      <FormControl>
                        <Input value={payment.className} disabled />
                      </FormControl>
                    ) : hasMultipleClasses ? (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingClasses}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn lớp" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {studentClasses.map((c) => (
                            <SelectItem key={c.classId} value={c.classId}>
                              {c.className}{" "}
                              {c.isLastClass && "(Lớp cuối tháng)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input value={payment.className} disabled />
                      </FormControl>
                    )}
                    {!isEdit && hasMultipleClasses && (
                      <FormDescription>
                        Học sinh có nhiều lớp trong tháng. Chọn lớp để tạo học
                        phí.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Tháng/Năm</FormLabel>
                <Input value={`Tháng ${month}/${year}`} disabled />
              </div>

              <div className="space-y-2">
                <FormLabel>Học sinh</FormLabel>
                <Input value={payment.studentName} disabled />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => {
                  const displayValue =
                    field.value && field.value > 0 ? field.value / 1000 : "";
                  return (
                    <FormItem>
                      <FormLabel>Số tiền (VNĐ)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Nhập số tiền (nghìn)"
                          value={displayValue || ""}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\D/g, "");
                            if (rawValue === "") {
                              field.onChange(0);
                              return;
                            }
                            const numValue = Number(rawValue);
                            if (!isNaN(numValue)) {
                              const maxInput = 999000000;
                              const limitedValue = Math.min(numValue, maxInput);
                              const actualValue = limitedValue * 1000;
                              field.onChange(actualValue);
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
                name="isPaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Đã đóng học phí</FormLabel>
                      <FormDescription>
                        Đánh dấu nếu học sinh đã đóng học phí
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {watchedIsPaid && (
                <FormField
                  control={form.control}
                  name="paidAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày đóng</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isLoading || loadingClasses}>
                  {isLoading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Xác nhận chuyển trạng thái học sinh
            </AlertDialogTitle>
            <AlertDialogDescription>
              Học sinh <strong>{payment.studentName}</strong> đang ở trạng thái{" "}
              <strong>{enrollmentStatusLabel}</strong> và đã đóng học phí.
              <br />
              <br />
              Bạn có muốn chuyển trạng thái học sinh sang{" "}
              <strong>đang học (chính thức)</strong> không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelActivate}
              disabled={isLoading}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmActivate}
              disabled={isLoading}
            >
              {isLoading ? "Đang xử lý..." : "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
