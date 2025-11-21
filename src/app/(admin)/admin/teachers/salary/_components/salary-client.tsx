"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { TeacherSalarySummary } from "@/types/database";
import type { TeacherSalaryExpenseMap } from "@/lib/services/admin-expenses-service";
import SalaryFilter from "./salary-filter";
import SalaryTable from "./salary-table";
import SalaryCards from "./salary-cards";
import SalaryDetailDialog from "./salary-detail-dialog";
import SalaryExpenseDialog from "./salary-expense-dialog";
import { exportSalaryToExcel } from "@/lib/utils/export-salary";

interface SalaryClientProps {
  initialSalaries: TeacherSalarySummary[];
  initialMonth: number;
  initialYear: number;
  initialTotal: number;
  initialExpenses: TeacherSalaryExpenseMap;
}

export default function SalaryClient({
  initialSalaries,
  initialMonth,
  initialYear,
  initialTotal,
  initialExpenses,
}: SalaryClientProps) {
  const [selectedSalary, setSelectedSalary] =
    useState<TeacherSalarySummary | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseSalary, setExpenseSalary] =
    useState<TeacherSalarySummary | null>(null);
  const [sessionOverrides, setSessionOverrides] = useState<
    Record<string, number>
  >({});
  const [expenseSuggestion, setExpenseSuggestion] = useState<{
    amount: number;
    sessions: number;
  } | null>(null);

  const handleViewDetails = (salary: TeacherSalarySummary) => {
    setSelectedSalary(salary);
    setIsDialogOpen(true);
  };

  const handleExport = () => {
    exportSalaryToExcel(initialSalaries, initialMonth, initialYear);
  };

  const getDisplaySessions = useCallback(
    (salary: TeacherSalarySummary) =>
      sessionOverrides[salary.teacherId] ?? salary.totalSessions,
    [sessionOverrides]
  );

  const getPerSessionRate = useCallback((salary: TeacherSalarySummary) => {
    if (salary.totalSessions > 0) {
      return salary.totalSalary / salary.totalSessions;
    }
    if (salary.details.length > 0) {
      const totalRate = salary.details.reduce(
        (sum, detail) => sum + detail.salaryPerSession,
        0
      );
      return totalRate / salary.details.length;
    }
    return 0;
  }, []);

  const getProposedSalary = useCallback(
    (salary: TeacherSalarySummary) => {
      const sessions = getDisplaySessions(salary);
      const rate = getPerSessionRate(salary);
      return Math.round(sessions * rate);
    },
    [getDisplaySessions, getPerSessionRate]
  );

  const handleSessionsChange = (teacherId: string, sessions: number) => {
    setSessionOverrides((prev) => ({
      ...prev,
      [teacherId]: sessions,
    }));
  };

  const handleManageExpense = (salary: TeacherSalarySummary) => {
    setExpenseSalary(salary);
    const sessions = getDisplaySessions(salary);
    const amount = getProposedSalary(salary);
    setExpenseSuggestion({ amount, sessions });
    setExpenseDialogOpen(true);
  };

  const enhancedSalaries = useMemo(
    () =>
      initialSalaries.map((salary) => ({
        ...salary,
        displaySessions: getDisplaySessions(salary),
        proposedSalary: getProposedSalary(salary),
      })),
    [initialSalaries, getDisplaySessions, getProposedSalary]
  );

  return (
    <div className="space-y-6 px-4">
      <SalaryFilter
        total={initialTotal}
        month={initialMonth}
        year={initialYear}
        onExportClick={handleExport}
      />

      <Card>
        <SalaryTable
          salaries={enhancedSalaries}
          expenses={initialExpenses}
          onViewDetails={handleViewDetails}
          onManageExpense={handleManageExpense}
          onSessionsChange={handleSessionsChange}
        />
        <SalaryCards
          salaries={enhancedSalaries}
          expenses={initialExpenses}
          onViewDetails={handleViewDetails}
          onManageExpense={handleManageExpense}
          onSessionsChange={handleSessionsChange}
        />
      </Card>

      <SalaryDetailDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        salary={selectedSalary}
        month={initialMonth}
        year={initialYear}
      />

      <SalaryExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        salary={expenseSalary}
        month={initialMonth}
        year={initialYear}
        existingExpense={
          expenseSalary ? initialExpenses[expenseSalary.teacherId] : undefined
        }
        suggestedAmount={expenseSuggestion?.amount}
        suggestedSessions={expenseSuggestion?.sessions}
      />
    </div>
  );
}
