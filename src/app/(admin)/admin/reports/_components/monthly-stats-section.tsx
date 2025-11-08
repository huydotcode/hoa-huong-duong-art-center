"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyVN } from "@/lib/utils";
import type { MonthlyStats } from "@/types/database";
import ChartsSection from "@/components/shared/charts/charts-section";

interface MonthlyStatsSectionProps {
  data: MonthlyStats[];
}

export default function MonthlyStatsSection({
  data,
}: MonthlyStatsSectionProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thống kê theo tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Không có dữ liệu
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const studentsData = data.map((stat) => ({
    month: stat.month,
    newStudents: stat.newStudents,
    leftStudents: stat.leftStudents,
  }));

  const financeData = data.map((stat) => ({
    month: stat.month,
    revenue: stat.revenue,
    expenses: stat.expenses,
    profit: stat.profit,
  }));

  // Calculate totals
  const totalNewStudents = data.reduce(
    (sum, stat) => sum + stat.newStudents,
    0
  );
  const totalLeftStudents = data.reduce(
    (sum, stat) => sum + stat.leftStudents,
    0
  );
  const totalRevenue = data.reduce((sum, stat) => sum + stat.revenue, 0);
  const totalExpenses = data.reduce((sum, stat) => sum + stat.expenses, 0);
  const totalProfit = data.reduce((sum, stat) => sum + stat.profit, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thống kê theo tháng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Charts */}
        <ChartsSection studentsData={studentsData} financeData={financeData} />

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tháng</TableHead>
                <TableHead className="text-right">HV mới</TableHead>
                <TableHead className="text-right">HV nghỉ</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead className="text-right">Chi phí</TableHead>
                <TableHead className="text-right">Lợi nhuận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((stat, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{stat.month}</TableCell>
                  <TableCell className="text-right">
                    {stat.newStudents}
                  </TableCell>
                  <TableCell className="text-right">
                    {stat.leftStudents}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyVN(stat.revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyVN(stat.expenses)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      stat.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrencyVN(stat.profit)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>TỔNG CỘNG</TableCell>
                <TableCell className="text-right">{totalNewStudents}</TableCell>
                <TableCell className="text-right">
                  {totalLeftStudents}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrencyVN(totalRevenue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrencyVN(totalExpenses)}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    totalProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrencyVN(totalProfit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
