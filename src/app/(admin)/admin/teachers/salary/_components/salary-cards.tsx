"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyVN } from "@/lib/utils";
import type { TeacherSalarySummary } from "@/types/database";
import { Eye } from "lucide-react";

interface SalaryCardsProps {
  salaries: TeacherSalarySummary[];
  onViewDetails: (salary: TeacherSalarySummary) => void;
}

export default function SalaryCards({
  salaries,
  onViewDetails,
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
      {salaries.map((salary) => (
        <Card key={salary.teacherId}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">{salary.teacherName}</h3>
                <p className="text-sm text-muted-foreground">{salary.phone}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tổng số buổi:</span>
                <span className="font-medium">{salary.totalSessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tổng lương:</span>
                <span className="font-bold">
                  {formatCurrencyVN(salary.totalSalary)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onViewDetails(salary)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Xem chi tiết
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
