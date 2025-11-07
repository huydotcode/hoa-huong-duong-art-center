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
}

export default function ExpensesClient({
  initialExpenses,
  initialMonth,
  initialYear,
  initialQuery,
  initialTotal,
}: ExpensesClientProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const handleAddClick = () => {
    addButtonRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <ExpensesFilter total={initialTotal} onAddClick={handleAddClick} />

      <ExpenseForm expense={undefined}>
        <Button ref={addButtonRef} className="hidden">
          Thêm chi phí
        </Button>
      </ExpenseForm>

      <Card>
        <ExpensesTable expenses={initialExpenses} />
        <ExpensesCards expenses={initialExpenses} />
      </Card>
    </div>
  );
}
