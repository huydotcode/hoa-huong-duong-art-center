"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createPaymentStatus } from "@/lib/services/admin-payment-service";
import { getClassById } from "@/lib/services/admin-classes-service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EnrolledStudentForPayment {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  rowIndex: number;
  enrollmentDate: string;
  suggestedPaymentStatus: "paid" | "unpaid" | "inactive";
}

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrolledStudents: EnrolledStudentForPayment[];
  onSuccess?: () => void;
}

export function PaymentConfirmationDialog({
  open,
  onOpenChange,
  enrolledStudents,
  onSuccess,
}: PaymentConfirmationDialogProps) {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [paymentStatuses, setPaymentStatuses] = useState<
    Record<string, "paid" | "unpaid" | null> // studentId -> status (null = inactive, không tạo)
  >({});
  const [isCreating, setIsCreating] = useState(false);

  // Initialize payment statuses từ suggestions
  useEffect(() => {
    if (open && enrolledStudents.length > 0) {
      const initialStatuses: Record<string, "paid" | "unpaid" | null> = {};

      enrolledStudents.forEach((student) => {
        if (student.suggestedPaymentStatus === "inactive") {
          initialStatuses[student.studentId] = null; // Không tạo payment
        } else {
          initialStatuses[student.studentId] = student.suggestedPaymentStatus;
        }
      });

      setPaymentStatuses(initialStatuses);
    }
  }, [open, enrolledStudents]);

  // Reset khi đóng dialog
  useEffect(() => {
    if (!open) {
      setMonth(new Date().getMonth() + 1);
      setYear(new Date().getFullYear());
      setPaymentStatuses({});
    }
  }, [open]);

  const handleTogglePayment = (
    studentId: string,
    status: "paid" | "unpaid" | null
  ) => {
    setPaymentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleCreatePayments = async () => {
    // Filter chỉ những học sinh cần tạo payment (không phải inactive)
    const studentsToCreatePayment = enrolledStudents.filter(
      (s) => paymentStatuses[s.studentId] !== null
    );

    if (studentsToCreatePayment.length === 0) {
      toast.warning("Không có học sinh nào cần tạo học phí");
      return;
    }

    setIsCreating(true);
    try {
      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const student of studentsToCreatePayment) {
        const isPaid = paymentStatuses[student.studentId] === "paid";

        try {
          // Lấy monthly_fee từ class
          const classData = await getClassById(student.classId);
          if (!classData) {
            errors.push(`${student.studentName}: Không tìm thấy lớp`);
            continue;
          }

          const monthlyFee = Number(classData.monthly_fee || 0);

          await createPaymentStatus(
            {
              student_id: student.studentId,
              class_id: student.classId,
              month,
              year,
              amount: monthlyFee,
              is_paid: isPaid,
              paid_at: isPaid ? new Date().toISOString() : undefined,
            },
            "/admin/students"
          );

          created++;
        } catch (error) {
          if (error instanceof Error && error.message.includes("đã tồn tại")) {
            skipped++;
          } else {
            errors.push(
              `${student.studentName}: ${
                error instanceof Error ? error.message : "Lỗi không xác định"
              }`
            );
          }
        }
      }

      if (created > 0) {
        toast.success(
          `Đã tạo ${created} học phí${
            skipped > 0 ? `, bỏ qua ${skipped} học phí đã tồn tại` : ""
          }`
        );
      }

      if (errors.length > 0) {
        toast.warning(
          `Có ${errors.length} học phí không thể tạo: ${errors.join(", ")}`
        );
      }

      if (created > 0 || skipped > 0) {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error creating payments:", error);
      toast.error("Lỗi khi tạo học phí");
    } finally {
      setIsCreating(false);
    }
  };

  const studentsNeedingPayment = enrolledStudents.filter(
    (s) => paymentStatuses[s.studentId] !== null
  );
  const studentsNotNeedingPayment = enrolledStudents.filter(
    (s) => paymentStatuses[s.studentId] === null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Xác nhận học phí cho học sinh đã đăng ký học
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month/Year Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Tháng</Label>
              <Select
                value={String(month)}
                onValueChange={(value) => setMonth(Number(value))}
              >
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      Tháng {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Năm</Label>
              <Select
                value={String(year)}
                onValueChange={(value) => setYear(Number(value))}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Students List */}
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Danh sách học sinh ({enrolledStudents.length} học sinh)
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-2">
              {enrolledStudents.map((student) => {
                const currentStatus = paymentStatuses[student.studentId];
                const isInactive = currentStatus === null;
                const isPaid = currentStatus === "paid";
                const isUnpaid = currentStatus === "unpaid";

                return (
                  <div
                    key={student.studentId}
                    className="p-3 border rounded-md space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{student.studentName}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.className}
                        </div>
                        {/* Gợi ý từ Excel */}
                        {student.suggestedPaymentStatus !== "inactive" && (
                          <div className="text-xs text-primary mt-1">
                            💡 Gợi ý:{" "}
                            {student.suggestedPaymentStatus === "paid"
                              ? "Đã đóng"
                              : "Chưa đóng"}
                          </div>
                        )}
                        {student.suggestedPaymentStatus === "inactive" && (
                          <div className="text-xs text-muted-foreground mt-1">
                            💡 Gợi ý: Nghỉ luôn (không cần tạo học phí)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Status Selection */}
                    {student.suggestedPaymentStatus === "inactive" ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isInactive}
                          onCheckedChange={(checked) => {
                            // Nếu uncheck, chuyển sang "unpaid"
                            if (!checked) {
                              handleTogglePayment(student.studentId, "unpaid");
                            }
                          }}
                        />
                        <Label
                          htmlFor={`inactive-${student.studentId}`}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Không tạo học phí (học sinh nghỉ)
                        </Label>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`paid-${student.studentId}`}
                            checked={isPaid}
                            onCheckedChange={(checked) => {
                              // Khi check "Đã đóng", set status = "paid"
                              // Khi uncheck, set status = "unpaid"
                              handleTogglePayment(
                                student.studentId,
                                checked ? "paid" : "unpaid"
                              );
                            }}
                          />
                          <Label
                            htmlFor={`paid-${student.studentId}`}
                            className="text-sm cursor-pointer"
                          >
                            Đã đóng
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`unpaid-${student.studentId}`}
                            checked={isUnpaid}
                            onCheckedChange={(checked) => {
                              // Khi check "Chưa đóng", set status = "unpaid"
                              // Khi uncheck, set status = "paid"
                              handleTogglePayment(
                                student.studentId,
                                checked ? "unpaid" : "paid"
                              );
                            }}
                          />
                          <Label
                            htmlFor={`unpaid-${student.studentId}`}
                            className="text-sm cursor-pointer"
                          >
                            Chưa đóng
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            {studentsNeedingPayment.length > 0 ? (
              <>
                Sẽ tạo học phí cho{" "}
                <strong>{studentsNeedingPayment.length}</strong> học sinh
                {studentsNotNeedingPayment.length > 0 && (
                  <span className="ml-1">
                    (bỏ qua {studentsNotNeedingPayment.length} học sinh nghỉ)
                  </span>
                )}
              </>
            ) : (
              "Không có học sinh nào cần tạo học phí"
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Bỏ qua
          </Button>
          <Button
            onClick={handleCreatePayments}
            disabled={isCreating || studentsNeedingPayment.length === 0}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : studentsNeedingPayment.length > 0 ? (
              `Tạo học phí (${studentsNeedingPayment.length} học sinh)`
            ) : (
              "Không có học sinh nào cần tạo học phí"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
