"use client";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
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

interface ExpensesTableProps {
  expenses: Expense[];
}

export default function ExpensesTable({ expenses }: ExpensesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteExpense(id, pathname);
      toast.success("Xóa chi phí thành công!");
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

  return (
    <CardContent className="hidden p-0 md:block">
      <Table>
        <TableHeader>
          <TableHeaderRow>
            <TableHead>Ngày chi</TableHead>
            <TableHead className="text-right">Số tiền</TableHead>
            <TableHead>Lý do</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                Chưa có chi phí nào
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense) => {
              const isSalary = isTeacherSalaryExpense(expense);
              return (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {formatDate(expense.expense_date)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatVND(expense.amount)}
                  </TableCell>
                  <TableCell>{expense.reason}</TableCell>
                  <TableCell className="text-right">
                    {!isSalary ? (
                      <div className="flex justify-end gap-2">
                        <ExpenseForm expense={expense}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </ExpenseForm>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
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
                                Bạn có chắc chắn muốn xóa chi phí này không?
                                Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(expense.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Tự động quản lý
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </CardContent>
  );
}
