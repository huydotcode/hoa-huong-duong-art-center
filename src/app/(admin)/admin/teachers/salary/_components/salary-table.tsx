"use client";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyVN } from "@/lib/utils";
import type { TeacherSalarySummary } from "@/types/database";
import type { TeacherSalaryExpenseMap } from "@/lib/services/admin-expenses-service";
import { Eye, Wallet } from "lucide-react";

type EditableTeacherSalary = TeacherSalarySummary & {
  displaySessions: number;
  proposedSalary: number;
};

interface SalaryTableProps {
  salaries: EditableTeacherSalary[];
  expenses: TeacherSalaryExpenseMap;
  onViewDetails: (salary: TeacherSalarySummary) => void;
  onManageExpense: (salary: TeacherSalarySummary) => void;
  onSessionsChange: (teacherId: string, sessions: number) => void;
}

export default function SalaryTable({
  salaries,
  expenses,
  onViewDetails,
  onManageExpense,
  onSessionsChange,
}: SalaryTableProps) {
  return (
    <CardContent className="hidden p-0 md:block">
      <Table>
        <TableHeader>
          <TableHeaderRow>
            <TableHead>Họ và tên</TableHead>
            <TableHead>Số điện thoại</TableHead>
            <TableHead className="text-center">Số buổi đề xuất</TableHead>
            <TableHead className="text-right">Lương đề xuất</TableHead>
            <TableHead className="text-right">Chi phí lương</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          {salaries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                Không có dữ liệu lương cho tháng này
              </TableCell>
            </TableRow>
          ) : (
            salaries.map((salary) => {
              const hasOverride =
                salary.displaySessions !== salary.totalSessions;
              return (
                <TableRow key={salary.teacherId}>
                  <TableCell className="font-medium">
                    {salary.teacherName}
                  </TableCell>
                  <TableCell>{salary.phone}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={salary.displaySessions}
                        onChange={(e) =>
                          onSessionsChange(
                            salary.teacherId,
                            Number(e.target.value) >= 0
                              ? Number(e.target.value)
                              : 0
                          )
                        }
                        className="h-9 w-24 text-center"
                      />
                      {hasOverride && (
                        <span className="text-xs text-muted-foreground">
                          Thực tế: {salary.totalSessions}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrencyVN(salary.proposedSalary)}
                    {hasOverride && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Lương thực tế: {formatCurrencyVN(salary.totalSalary)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      {expenses[salary.teacherId] ? (
                        <>
                          <span className="text-sm text-muted-foreground">
                            Đã ghi nhận:{" "}
                            <span className="font-medium">
                              {formatCurrencyVN(
                                expenses[salary.teacherId].amount
                              )}
                            </span>
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onManageExpense(salary)}
                          >
                            <Wallet className="mr-2 h-4 w-4" />
                            Cập nhật
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onManageExpense(salary)}
                        >
                          <Wallet className="mr-2 h-4 w-4" />
                          Ghi nhận
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(salary)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Xem chi tiết
                    </Button>
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
