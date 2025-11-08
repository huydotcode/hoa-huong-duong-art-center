"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface SalaryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salary: TeacherSalarySummary | null;
  month: number;
  year: number;
}

export default function SalaryDetailDialog({
  open,
  onOpenChange,
  salary,
  month,
  year,
}: SalaryDetailDialogProps) {
  if (!salary) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết lương - {salary.teacherName}</DialogTitle>
          <DialogDescription>
            Tháng {month}/{year}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Tổng số buổi: {salary.totalSessions}
            </p>
            <p className="text-lg font-semibold">
              Tổng lương: {formatCurrencyVN(salary.totalSalary)}
            </p>
          </div>
          {salary.details.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Không có chi tiết lương
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead>Tên lớp</TableHead>
                  <TableHead className="text-center">Số buổi</TableHead>
                  <TableHead className="text-right">Lương/buổi</TableHead>
                  <TableHead className="text-right">Tổng lương lớp</TableHead>
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {salary.details.map((detail) => (
                  <TableRow key={detail.classId}>
                    <TableCell className="font-medium">
                      {detail.className}
                    </TableCell>
                    <TableCell className="text-center">
                      {detail.sessions}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyVN(detail.salaryPerSession)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrencyVN(detail.totalSalary)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
