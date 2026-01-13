"use client";

import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import ExpensesFilter from "./expenses-filter";
import ExpensesTable from "./expenses-table";
import ExpensesCards from "./expenses-cards";
import { ExpenseForm } from "./expense-form";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getExpenses,
  getTotalExpensesByMonth,
  getTotalExpensesByYear,
} from "@/lib/services/admin-expenses-service";
import { Loader2 } from "lucide-react";

interface ExpensesClientProps {
  initialMonth: number;
  initialYear: number;
  initialQuery: string;
  initialViewMode: "month" | "year";
}

export default function ExpensesClient({
  initialMonth,
  initialYear,
  initialQuery,
  initialViewMode,
}: ExpensesClientProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();

  // Data fetching
  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: [
      "admin-expenses",
      {
        month: initialMonth,
        year: initialYear,
        query: initialQuery,
        viewMode: initialViewMode,
      },
    ],
    queryFn: async () => {
      const monthArg = initialViewMode === "year" ? undefined : initialMonth;
      return getExpenses(monthArg, initialYear, initialQuery);
    },
  });

  const { data: total = 0 } = useQuery({
    queryKey: [
      "admin-expenses-total",
      { month: initialMonth, year: initialYear, viewMode: initialViewMode },
    ],
    queryFn: async () => {
      if (initialViewMode === "year") {
        return getTotalExpensesByYear(initialYear);
      } else {
        return getTotalExpensesByMonth(initialMonth, initialYear);
      }
    },
  });

  // Event listeners for real-time updates
  useEffect(() => {
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-expenses-total"] });
    };

    window.addEventListener("expense-created", handleInvalidate);
    window.addEventListener("expense-updated", handleInvalidate);
    window.addEventListener("expense-deleted", handleInvalidate);

    return () => {
      window.removeEventListener("expense-created", handleInvalidate);
      window.removeEventListener("expense-updated", handleInvalidate);
      window.removeEventListener("expense-deleted", handleInvalidate);
    };
  }, [queryClient]);

  const handleAddClick = () => {
    addButtonRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <ExpensesFilter
        total={total}
        onAddClick={handleAddClick}
        viewMode={initialViewMode}
        month={initialMonth}
        year={initialYear}
        query={initialQuery}
      />

      <ExpenseForm expense={undefined}>
        <Button ref={addButtonRef} className="hidden">
          Thêm chi phí
        </Button>
      </ExpenseForm>

      <Card>
        {isExpensesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <ExpensesTable
              expenses={expenses}
              showMonthColumn={initialViewMode === "year"}
            />
            <ExpensesCards
              expenses={expenses}
              showMonthBadge={initialViewMode === "year"}
            />
          </>
        )}
      </Card>
    </div>
  );
}
