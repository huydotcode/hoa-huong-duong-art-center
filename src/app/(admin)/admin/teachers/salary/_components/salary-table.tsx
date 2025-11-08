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
import { formatCurrencyVN } from "@/lib/utils";
import type { TeacherSalarySummary } from "@/types/database";
import { Eye } from "lucide-react";

interface SalaryTableProps {
  salaries: TeacherSalarySummary[];
  onViewDetails: (salary: TeacherSalarySummary) => void;
}

export default function SalaryTable({
  salaries,
  onViewDetails,
}: SalaryTableProps) {
  return (
    <CardContent className="hidden p-0 md:block">
      <Table>
        <TableHeader>
          <TableHeaderRow>
            <TableHead>Họ và tên</TableHead>
            <TableHead>Số điện thoại</TableHead>
            <TableHead className="text-center">Tổng số buổi</TableHead>
            <TableHead className="text-right">Tổng lương</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          {salaries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                Không có dữ liệu lương cho tháng này
              </TableCell>
            </TableRow>
          ) : (
            salaries.map((salary) => (
              <TableRow key={salary.teacherId}>
                <TableCell className="font-medium">
                  {salary.teacherName}
                </TableCell>
                <TableCell>{salary.phone}</TableCell>
                <TableCell className="text-center">
                  {salary.totalSessions}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrencyVN(salary.totalSalary)}
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
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  );
}
