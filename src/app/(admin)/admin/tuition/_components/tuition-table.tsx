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
import { Pencil, CheckCircle2 } from "lucide-react";
import type { TuitionItem } from "@/lib/services/admin-payment-service";
import {
  formatVND,
  formatEnrollmentStatus,
  formatDateRange,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TuitionTableProps {
  tuitionData: TuitionItem[];
  onCreatePayment: (item: TuitionItem) => void;
  onEditPayment: (item: TuitionItem) => void;
  onTogglePayment?: (item: TuitionItem) => Promise<void>;
  onActivateTrial?: (item: TuitionItem) => Promise<void>;
  className?: string; // Tên lớp (optional, để hiển thị trong header)
  showClassHeader?: boolean; // Có hiển thị header với tên lớp không
}

export default function TuitionTable({
  tuitionData,
  onCreatePayment,
  onEditPayment,
  onTogglePayment,
  onActivateTrial,
  className,
  showClassHeader = false,
}: TuitionTableProps) {
  const getStatusBadge = (item: TuitionItem) => {
    if (item.paymentStatusId === null) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-700">
          Chưa tạo
        </Badge>
      );
    }
    if (item.isPaid === true) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700">
          Đã đóng
        </Badge>
      );
    }
    if (item.isPaid === false) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
          Chưa đóng
        </Badge>
      );
    }
    return null;
  };

  // Tính thống kê cho lớp
  const stats = {
    total: tuitionData.length,
    paid: tuitionData.filter((item) => item.isPaid === true).length,
    unpaid: tuitionData.filter(
      (item) => item.isPaid === false && item.paymentStatusId !== null
    ).length,
    notCreated: tuitionData.filter((item) => item.paymentStatusId === null)
      .length,
    totalFee: tuitionData.reduce((sum, item) => sum + item.monthlyFee, 0),
    totalPaid: tuitionData.reduce((sum, item) => {
      if (item.isPaid === true) {
        return sum + (item.amount || item.monthlyFee);
      }
      return sum;
    }, 0),
  };

  return (
    <div className="space-y-0">
      {showClassHeader && className && (
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-lg">{className}</h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} học sinh • {stats.paid} đã đóng • {stats.unpaid}{" "}
              chưa đóng • {stats.notCreated} chưa tạo
            </p>
            {tuitionData.length > 0 &&
              tuitionData[0]?.classStartDate &&
              tuitionData[0]?.classEndDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Thời gian:{" "}
                  {formatDateRange(
                    tuitionData[0].classStartDate,
                    tuitionData[0].classEndDate
                  )}
                </p>
              )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Tổng học phí:</p>
            <p className="font-semibold">{formatVND(stats.totalFee)}</p>
            <p className="text-sm text-muted-foreground mt-1">Đã thu:</p>
            <p className="font-semibold text-black">
              {formatVND(stats.totalPaid)}
            </p>
          </div>
        </div>
      )}
      <CardContent className={showClassHeader ? "p-0" : "hidden p-0 md:block"}>
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Tên học sinh</TableHead>
              <TableHead>Trạng thái học</TableHead>
              {/* Bỏ cột "Lớp" vì đã có header */}
              <TableHead className="text-right">Học phí</TableHead>
              <TableHead className="text-right">Số tiền đã đóng</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {tuitionData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Chưa có học sinh nào trong lớp này
                </TableCell>
              </TableRow>
            ) : (
              tuitionData.map((item) => {
                const getEnrollmentStatusBadge = () => {
                  const status = item.enrollmentStatus;
                  if (status === "active") {
                    return (
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-700"
                      >
                        {formatEnrollmentStatus(status)}
                      </Badge>
                    );
                  }
                  if (status === "trial") {
                    return (
                      <Badge
                        variant="outline"
                        className="bg-purple-100 text-purple-700"
                      >
                        {formatEnrollmentStatus(status)}
                      </Badge>
                    );
                  }
                  if (status === "inactive") {
                    return (
                      <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-700"
                      >
                        {formatEnrollmentStatus(status)}
                      </Badge>
                    );
                  }
                  return (
                    <Badge variant="outline">
                      {formatEnrollmentStatus(status)}
                    </Badge>
                  );
                };

                return (
                  <TableRow
                    key={`${item.studentId}-${item.classId}-${item.enrollmentId}`}
                  >
                    <TableCell className="font-medium">
                      {item.studentName}
                    </TableCell>
                    <TableCell>{getEnrollmentStatusBadge()}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatVND(item.monthlyFee)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.amount !== null ? formatVND(item.amount) : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(item)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle button - chỉ hiển thị khi đã có payment_status */}
                        {item.paymentStatusId !== null && onTogglePayment && (
                          <Button
                            variant={item.isPaid ? "outline" : "default"}
                            size="sm"
                            className="gap-2"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onTogglePayment(item);
                            }}
                          >
                            {item.isPaid ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Đã đóng
                              </>
                            ) : (
                              <>Đóng học phí</>
                            )}
                          </Button>
                        )}

                        {/* Nút chuyển sang chính thức - chỉ hiển thị khi trial và đã đóng học phí */}
                        {item.enrollmentStatus === "trial" &&
                          item.isPaid === true &&
                          item.paymentStatusId !== null &&
                          onActivateTrial && (
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-2 bg-blue-600 hover:bg-blue-700"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await onActivateTrial(item);
                              }}
                            >
                              Chuyển sang chính thức
                            </Button>
                          )}

                        {/* Existing buttons */}
                        {item.paymentStatusId === null ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCreatePayment(item)}
                          >
                            Tạo học phí
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditPayment(item)}
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </div>
  );
}
