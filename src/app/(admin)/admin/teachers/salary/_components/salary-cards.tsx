"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrencyVN } from "@/lib/utils";
import type { TeacherSalarySummary } from "@/types/database";
import type { TeacherSalaryExpenseMap } from "@/lib/services/admin-expenses-service";
import { Eye, Wallet } from "lucide-react";

type EditableTeacherSalary = TeacherSalarySummary & {
  displaySessions: number;
  proposedSalary: number;
};

interface SalaryCardsProps {
  salaries: EditableTeacherSalary[];
  expenses: TeacherSalaryExpenseMap;
  onViewDetails: (salary: TeacherSalarySummary) => void;
  onManageExpense: (salary: TeacherSalarySummary) => void;
  onSessionsChange: (teacherId: string, sessions: number) => void;
}

export default function SalaryCards({
  salaries,
  expenses,
  onViewDetails,
  onManageExpense,
  onSessionsChange,
}: SalaryCardsProps) {
  if (salaries.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Không có dữ liệu lương cho tháng này
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:hidden px-4 py-4">
      {salaries.map((salary) => {
        const hasOverride = salary.displaySessions !== salary.totalSessions;
        return (
          <Card key={salary.teacherId}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">{salary.teacherName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {salary.phone}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm gap-3">
                  <span className="text-muted-foreground">
                    Số buổi đề xuất:
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={salary.displaySessions}
                    onChange={(e) =>
                      onSessionsChange(
                        salary.teacherId,
                        Number(e.target.value) >= 0 ? Number(e.target.value) : 0
                      )
                    }
                    className="h-8 w-28 text-center text-base"
                  />
                </div>
                {hasOverride && (
                  <p className="text-xs text-muted-foreground">
                    Thực tế: {salary.totalSessions} buổi
                  </p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lương đề xuất:</span>
                  <span className="font-bold">
                    {formatCurrencyVN(salary.proposedSalary)}
                  </span>
                </div>
                {hasOverride && (
                  <p className="text-xs text-muted-foreground">
                    Lương thực tế: {formatCurrencyVN(salary.totalSalary)}
                  </p>
                )}
                <div className="space-y-2">
                  {expenses[salary.teacherId] ? (
                    <div className="text-sm text-muted-foreground">
                      Đã ghi nhận:{" "}
                      <span className="font-semibold">
                        {formatCurrencyVN(expenses[salary.teacherId].amount)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onViewDetails(salary)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Chi tiết
                    </Button>
                    <Button
                      variant={
                        expenses[salary.teacherId] ? "secondary" : "default"
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() => onManageExpense(salary)}
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      {expenses[salary.teacherId] ? "Cập nhật" : "Ghi nhận"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
