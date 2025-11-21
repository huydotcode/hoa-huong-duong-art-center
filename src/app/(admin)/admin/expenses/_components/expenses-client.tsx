"use client";

import { useRef } from "react";
import { Card } from "@/components/ui/card";
import type { Expense } from "@/types/database";
import ExpensesFilter from "./expenses-filter";
import ExpensesTable from "./expenses-table";
import ExpensesCards from "./expenses-cards";
import { ExpenseForm } from "./expense-form";
import { Button } from "@/components/ui/button";

interface ExpensesClientProps {
  initialExpenses: Expense[];
  initialMonth: number;
  initialYear: number;
  initialQuery: string;
  initialTotal: number;
  initialViewMode: "month" | "year";
}

export default function ExpensesClient({
  initialExpenses,
  initialMonth,
  initialYear,
  initialQuery,
  initialTotal,
  initialViewMode,
}: ExpensesClientProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const handleAddClick = () => {
    addButtonRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <ExpensesFilter
        total={initialTotal}
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
        <ExpensesTable
          expenses={initialExpenses}
          showMonthColumn={initialViewMode === "year"}
        />
        <ExpensesCards
          expenses={initialExpenses}
          showMonthBadge={initialViewMode === "year"}
        />
      </Card>
    </div>
  );
}
