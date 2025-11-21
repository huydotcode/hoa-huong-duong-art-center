"use client";

import {
  useEffect,
  useState,
  useTransition,
  startTransition as startStateTransition,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TeacherSalarySummary } from "@/types/database";
import type { TeacherSalaryExpenseRecord } from "@/lib/services/admin-expenses-service";
import { saveTeacherSalaryExpense } from "../_actions";

interface SalaryExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary: TeacherSalarySummary | null;
  month: number;
  year: number;
  existingExpense?: TeacherSalaryExpenseRecord;
  suggestedAmount?: number;
  suggestedSessions?: number;
}

export default function SalaryExpenseDialog({
  open,
  onOpenChange,
  salary,
  month,
  year,
  existingExpense,
  suggestedAmount,
  suggestedSessions,
}: SalaryExpenseDialogProps) {
  const [amount, setAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>("");
  const [isPending, startSaving] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open || !salary) return;
    const fallbackSuggested = suggestedAmount ?? salary.totalSalary ?? 0;
    const suggestedValue = existingExpense
      ? existingExpense.amount
      : fallbackSuggested;
    const defaultDate =
      existingExpense?.expenseDate ||
      new Date(year, month, 0).toISOString().split("T")[0];
    startStateTransition(() => {
      setAmount(suggestedValue);
      setPayDate(defaultDate);
    });
  }, [salary, existingExpense, month, year, open, suggestedAmount]);

  if (!salary) return null;

  const handleSubmit = () => {
    if (!amount || amount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    startSaving(async () => {
      try {
        await saveTeacherSalaryExpense({
          teacherId: salary.teacherId,
          teacherName: salary.teacherName,
          amount,
          month,
          year,
          expenseDate: payDate,
        });
        toast.success("Đã lưu chi phí lương giáo viên");
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Không thể lưu chi phí lương");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ghi nhận lương giáo viên</DialogTitle>
          <DialogDescription>
            {salary.teacherName} - Tháng {month}/{year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Số tiền</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Gợi ý:{" "}
              {(suggestedAmount ?? salary.totalSalary).toLocaleString("vi-VN")}₫
              {suggestedSessions ? ` (${suggestedSessions} buổi đề xuất)` : ""}
            </p>
          </div>
          <div>
            <Label htmlFor="payDate">Ngày chi trả</Label>
            <Input
              id="payDate"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
