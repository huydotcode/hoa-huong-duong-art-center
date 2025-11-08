"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
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
import { usePathname, useRouter } from "next/navigation";
import {
  createExpense,
  updateExpense,
} from "@/lib/services/admin-expenses-service";
import { isTeacherSalaryExpense } from "@/lib/utils/expense";
import type { Expense } from "@/types/database";
import {
  createExpenseSchema,
  updateExpenseSchema,
  type CreateExpenseSchema,
  type UpdateExpenseSchema,
} from "@/lib/validations/expense";
import { cn, formatCurrencyVNDots } from "@/lib/utils";

interface Props {
  expense?: Expense;
  children: React.ReactNode;
}

export function ExpenseForm({ expense, children }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const path = usePathname();

  const isEdit = !!expense;
  const isSalaryExpense = expense ? isTeacherSalaryExpense(expense) : false;

  const form = useForm<CreateExpenseSchema | UpdateExpenseSchema>({
    resolver: zodResolver(isEdit ? updateExpenseSchema : createExpenseSchema),
    defaultValues: {
      amount: expense?.amount || undefined,
      reason: expense?.reason || "",
      expense_date: expense?.expense_date
        ? expense.expense_date.split("T")[0]
        : new Date().toISOString().split("T")[0],
    },
  });

  // Helper to normalize date to YYYY-MM-DD format
  const normalizeDate = (dateString: string | undefined): string => {
    if (!dateString) {
      return new Date().toISOString().split("T")[0];
    }
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // Try to parse and format
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Fallback to current date
    }
    return new Date().toISOString().split("T")[0];
  };

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      form.reset({
        amount: expense.amount,
        reason: expense.reason,
        expense_date: normalizeDate(expense.expense_date),
      });
    } else {
      form.reset({
        amount: undefined,
        reason: "",
        expense_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [expense, form]);

  async function onSubmit(values: CreateExpenseSchema | UpdateExpenseSchema) {
    setIsLoading(true);
    try {
      if (isEdit && expense) {
        // Nếu là lương giáo viên, chỉ cho phép update amount, không cho update reason và expense_date
        const updateData: UpdateExpenseSchema = isSalaryExpense
          ? {
              amount: values.amount,
              // Giữ nguyên reason và expense_date từ expense gốc
              reason: expense.reason,
              expense_date: expense.expense_date,
            }
          : (values as UpdateExpenseSchema);

        await updateExpense(expense.id, updateData, path);
        toast.success("Cập nhật chi phí thành công!");
      } else {
        await createExpense(values as CreateExpenseSchema, path);
        toast.success("Thêm chi phí thành công!");
      }
      form.reset();
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error(
        isEdit ? "Cập nhật chi phí thất bại" : "Thêm chi phí thất bại",
        {
          description:
            error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        }
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Chỉnh sửa chi phí" : "Thêm chi phí mới"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            autoComplete="off"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => {
                // Display value divided by 1000 for input
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
                          // Remove all non-digit characters
                          const rawValue = e.target.value.replace(/\D/g, "");
                          if (rawValue === "") {
                            field.onChange(0);
                            return;
                          }
                          const numValue = Number(rawValue);
                          if (!isNaN(numValue)) {
                            // Max value: 999,000,000,000 VNĐ (999 trăm triệu)
                            // Max input in thousands: 999,000,000 (to avoid overflow)
                            const maxInput = 999000000;
                            const limitedValue = Math.min(numValue, maxInput);
                            // Multiply by 1000 to store actual value
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lý do chi phí</FormLabel>
                  <FormControl>
                    <textarea
                      className={cn(
                        "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                      placeholder="Nhập lý do chi phí"
                      disabled={isSalaryExpense}
                      {...field}
                    />
                  </FormControl>
                  {isSalaryExpense && (
                    <p className="text-xs text-muted-foreground">
                      Không thể chỉnh sửa lý do của chi phí lương giáo viên
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expense_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày chi</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ""}
                      disabled={isSalaryExpense}
                    />
                  </FormControl>
                  {isSalaryExpense && (
                    <p className="text-xs text-muted-foreground">
                      Không thể chỉnh sửa ngày chi của chi phí lương giáo viên
                    </p>
                  )}
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
                {isLoading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
