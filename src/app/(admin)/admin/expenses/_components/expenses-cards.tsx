"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import type { Expense } from "@/types/database";
import { formatVND } from "@/lib/utils";
import { ExpenseForm } from "./expense-form";
import { deleteExpense } from "@/lib/services/admin-expenses-service";
import { isTeacherSalaryExpense } from "@/lib/utils/expense";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface ExpensesCardsProps {
  expenses: Expense[];
  showMonthBadge?: boolean;
}

export default function ExpensesCards({
  expenses,
  showMonthBadge = false,
}: ExpensesCardsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteExpense(id, pathname);
      toast.success("Xóa chi phí thành công!");
      window.dispatchEvent(new CustomEvent("expense-deleted"));
      router.refresh();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Xóa chi phí thất bại", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      // Parse date string (format: YYYY-MM-DD from database)
      const [year, month, day] = dateString.split("-");
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      // Fallback to Date object parsing
      const date = new Date(dateString);
      const d = date.getDate().toString().padStart(2, "0");
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch {
      return dateString;
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="px-3 md:hidden">
        <p className="text-center text-sm text-muted-foreground py-8">
          Chưa có chi phí nào
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 px-3 md:hidden">
      {expenses.map((expense) => {
        const isSalary = isTeacherSalaryExpense(expense);
        return (
          <Card key={expense.id}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {formatDate(expense.expense_date)}
                  </h3>
                  {showMonthBadge && (
                    <p className="text-xs text-muted-foreground">
                      Tháng {expense.month}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary mt-1">
                    {formatVND(expense.amount)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ExpenseForm expense={expense}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </ExpenseForm>
                  {!isSalary && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={deletingId === expense.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Xác nhận xóa chi phí
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa chi phí này không? Hành
                            động này không thể hoàn tác.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(expense.id)}
                          >
                            Xóa
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">Lý do:</p>
                <p className="text-sm">{expense.reason}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
