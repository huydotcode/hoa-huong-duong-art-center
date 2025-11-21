"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, CheckCircle2, Circle } from "lucide-react";
import type { TuitionItem } from "@/lib/services/admin-payment-service";
import { formatVND, formatEnrollmentStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TuitionCardsProps {
  tuitionData: TuitionItem[];
  onCreatePayment: (item: TuitionItem) => void;
  onEditPayment: (item: TuitionItem) => void;
  onTogglePayment?: (item: TuitionItem) => Promise<void>;
  onActivateTrial?: (item: TuitionItem) => Promise<void>;
  showMonthBadge?: boolean;
}

export default function TuitionCards({
  tuitionData,
  onCreatePayment,
  onEditPayment,
  onTogglePayment,
  onActivateTrial,
  showMonthBadge = false,
}: TuitionCardsProps) {
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

  if (tuitionData.length === 0) {
    return (
      <div className="px-3">
        <p className="text-center text-sm text-muted-foreground py-8">
          Chưa có dữ liệu học phí
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 px-3 md:hidden">
      {tuitionData.map((item) => (
        <Card
          className="py-0 md:py-0"
          key={`${item.studentId}-${item.classId}-${item.enrollmentId}-${item.month}`}
        >
          <CardContent className="px-2 py-1">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold">{item.studentName}</h3>
                  {showMonthBadge && (
                    <Badge variant="secondary" className="text-xs">
                      Tháng {item.month}
                    </Badge>
                  )}
                  {(() => {
                    const status = item.enrollmentStatus;
                    if (status === "active") {
                      return (
                        <Badge
                          variant="outline"
                          className="bg-blue-100 text-blue-700 text-xs"
                        >
                          {formatEnrollmentStatus(status)}
                        </Badge>
                      );
                    }
                    if (status === "trial") {
                      return (
                        <Badge
                          variant="outline"
                          className="bg-purple-100 text-purple-700 text-xs"
                        >
                          {formatEnrollmentStatus(status)}
                        </Badge>
                      );
                    }
                    if (status === "inactive") {
                      return (
                        <Badge
                          variant="outline"
                          className="bg-gray-100 text-gray-700 text-xs"
                        >
                          {formatEnrollmentStatus(status)}
                        </Badge>
                      );
                    }
                    return (
                      <Badge variant="outline" className="text-xs">
                        {formatEnrollmentStatus(status)}
                      </Badge>
                    );
                  })()}
                </div>
                {/* Bỏ hiển thị tên lớp vì đã có header lớp rồi */}
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Học phí:
                    </span>
                    <span className="text-sm font-semibold">
                      {formatVND(item.monthlyFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Đã đóng:
                    </span>
                    <span className="text-sm font-semibold">
                      {item.isPaid === true && item.amount !== null
                        ? formatVND(item.amount)
                        : "-"}
                    </span>
                  </div>
                </div>
                <div className="mt-2">{getStatusBadge(item)}</div>
              </div>
              <div className="ml-2 flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  {/* Toggle button - chỉ hiển thị khi đã có payment_status */}
                  {item.paymentStatusId !== null && onTogglePayment && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onTogglePayment(item);
                      }}
                      title={
                        item.isPaid
                          ? "Đã đóng - Click để hủy"
                          : "Chưa đóng - Click để đóng"
                      }
                    >
                      {item.isPaid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  )}

                  {/* Existing buttons */}
                  {item.paymentStatusId === null ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCreatePayment(item)}
                    >
                      Tạo
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditPayment(item)}
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Nút chuyển sang chính thức - chỉ hiển thị khi trial và đã đóng học phí */}
                {item.enrollmentStatus === "trial" &&
                  item.isPaid === true &&
                  item.paymentStatusId !== null &&
                  onActivateTrial && (
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-xs"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onActivateTrial(item);
                      }}
                    >
                      Chuyển sang chính thức
                    </Button>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
