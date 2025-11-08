"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyVN } from "@/lib/utils";
import type { ClassRevenueItem } from "@/types/database";
import { Badge } from "@/components/ui/badge";

interface ClassRevenueTableProps {
  data: ClassRevenueItem[];
  month: number;
  year: number;
}

export default function ClassRevenueTable({
  data,
  month,
  year,
}: ClassRevenueTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Doanh thu từng lớp - Tháng {month}/{year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Không có dữ liệu
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalPaid = data.reduce((sum, item) => sum + item.paidCount, 0);
  const totalUnpaid = data.reduce((sum, item) => sum + item.unpaidCount, 0);
  const totalStudents = data.reduce((sum, item) => sum + item.totalStudents, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Doanh thu từng lớp - Tháng {month}/{year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lớp học</TableHead>
                <TableHead className="text-right">Số học sinh</TableHead>
                <TableHead className="text-right">Đã đóng</TableHead>
                <TableHead className="text-right">Chưa đóng</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead>Thời hạn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const isExpiringSoon =
                  item.endDate &&
                  new Date(item.endDate) <=
                    new Date(new Date().setMonth(new Date().getMonth() + 1));
                const isExpired =
                  item.endDate && new Date(item.endDate) < new Date();

                return (
                  <TableRow key={item.classId}>
                    <TableCell className="font-medium">
                      {item.className}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.totalStudents}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default" className="bg-green-600">
                        {item.paidCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{item.unpaidCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrencyVN(item.totalRevenue)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {item.startDate && (
                          <span className="text-muted-foreground">
                            Bắt đầu:{" "}
                            {new Date(item.startDate).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        )}
                        {item.endDate && (
                          <span
                            className={
                              isExpired
                                ? "text-red-600 font-medium"
                                : isExpiringSoon
                                  ? "text-orange-600 font-medium"
                                  : "text-muted-foreground"
                            }
                          >
                            Kết thúc:{" "}
                            {new Date(item.endDate).toLocaleDateString("vi-VN")}
                            {isExpired && " (Đã hết hạn)"}
                            {isExpiringSoon && !isExpired && " (Sắp hết hạn)"}
                          </span>
                        )}
                        {!item.endDate && (
                          <span className="text-green-600 font-medium">
                            Không có hạn
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>TỔNG CỘNG</TableCell>
                <TableCell className="text-right">{totalStudents}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="default" className="bg-green-600">
                    {totalPaid}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">{totalUnpaid}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrencyVN(totalRevenue)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
