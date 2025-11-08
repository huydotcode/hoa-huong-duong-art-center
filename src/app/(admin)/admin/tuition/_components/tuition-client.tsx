"use client";

import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import type {
  TuitionItem,
  TuitionSummary,
} from "@/lib/services/admin-payment-service";
import { formatDateRange } from "@/lib/utils";
import TuitionFilter from "./tuition-filter";
import TuitionTable from "./tuition-table";
import TuitionCards from "./tuition-cards";
import { PaymentForm } from "./payment-form";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface TuitionClientProps {
  initialTuitionData: TuitionItem[];
  initialMonth: number;
  initialYear: number;
  initialClassId?: string;
  initialQuery: string;
  initialStatus: "all" | "paid" | "unpaid" | "not_created";
  initialSubject?: string;
  initialSummary: TuitionSummary;
  classes: Array<{ id: string; name: string }>;
}

export default function TuitionClient({
  initialTuitionData,
  initialMonth,
  initialYear,
  initialClassId,
  initialQuery,
  initialStatus,
  initialSubject,
  initialSummary,
  classes,
}: TuitionClientProps) {
  const [selectedPayment, setSelectedPayment] = useState<TuitionItem | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tuitionData, setTuitionData] =
    useState<TuitionItem[]>(initialTuitionData);
  const router = useRouter();

  // Sync local state với initialTuitionData khi props thay đổi (sau khi refresh)
  useEffect(() => {
    setTuitionData(initialTuitionData);
  }, [initialTuitionData]);

  // Nhóm dữ liệu theo lớp (sử dụng local state)
  const groupedByClass = useMemo(() => {
    const groups = new Map<string, TuitionItem[]>();

    tuitionData.forEach((item) => {
      const key = `${item.classId}::${item.className}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    // Sắp xếp các lớp theo tên
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const [, classNameA] = a[0].split("::");
      const [, classNameB] = b[0].split("::");
      return classNameA.localeCompare(classNameB);
    });

    return sortedGroups.map(([key, items]) => {
      const [, className] = key.split("::");
      return {
        classId: items[0].classId,
        className,
        items: items.sort((a, b) => a.studentName.localeCompare(b.studentName)),
      };
    });
  }, [tuitionData]);

  const handleCreatePayment = (item: TuitionItem) => {
    setSelectedPayment(item);
    setIsDialogOpen(true);
  };

  const handleEditPayment = (item: TuitionItem) => {
    setSelectedPayment(item);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPayment(null);
  };

  // Optimistic update: cập nhật local state ngay lập tức
  const handlePaymentUpdate = (updatedItem: TuitionItem) => {
    setTuitionData((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.studentId === updatedItem.studentId &&
          item.classId === updatedItem.classId &&
          item.enrollmentId === updatedItem.enrollmentId
      );

      if (index >= 0) {
        // Update existing item
        const newData = [...prev];
        newData[index] = updatedItem;
        return newData;
      } else {
        // Add new item
        return [...prev, updatedItem].sort((a, b) =>
          a.studentName.localeCompare(b.studentName)
        );
      }
    });

    // Refresh data ở background
    setIsRefreshing(true);
    router.refresh();

    // Tắt spinner sau một khoảng thời gian
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 relative">
      {/* Floating loading spinner */}
      {isRefreshing && (
        <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Đang tải lại...</span>
        </div>
      )}

      <TuitionFilter
        summary={initialSummary}
        month={initialMonth}
        year={initialYear}
        classId={initialClassId}
        query={initialQuery}
        status={initialStatus}
        subject={initialSubject}
        classes={classes}
        onRefreshStart={() => setIsRefreshing(true)}
        onRefreshEnd={() => {
          setTimeout(() => setIsRefreshing(false), 1000);
        }}
      />

      <PaymentForm
        payment={selectedPayment}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        month={initialMonth}
        year={initialYear}
        onSuccess={handleCloseDialog}
        onPaymentUpdate={handlePaymentUpdate}
      />

      {/* Hiển thị mỗi lớp là một Card riêng */}
      {groupedByClass.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu học phí
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Desktop view - mỗi lớp một Card với Table */}
          <div className="hidden md:block space-y-2">
            {groupedByClass.map((group) => (
              <Card className="md:py-0" key={group.classId}>
                <TuitionTable
                  tuitionData={group.items}
                  onCreatePayment={handleCreatePayment}
                  onEditPayment={handleEditPayment}
                  className={group.className}
                  showClassHeader={true}
                />
              </Card>
            ))}
          </div>

          {/* Mobile view - mỗi lớp một Card với Cards */}
          <div className="md:hidden space-y-2">
            {groupedByClass.map((group) => (
              <Card className="py-0 md:py-0" key={group.classId}>
                <div className="px-4 py-3 border-b">
                  <h3 className="font-semibold">{group.className}</h3>
                  <p className="text-sm text-muted-foreground">
                    {group.items.length} học sinh
                  </p>
                  {group.items.length > 0 &&
                    group.items[0]?.classStartDate &&
                    group.items[0]?.classEndDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Thời gian:{" "}
                        {formatDateRange(
                          group.items[0].classStartDate,
                          group.items[0].classEndDate
                        )}
                      </p>
                    )}
                </div>
                <TuitionCards
                  tuitionData={group.items}
                  onCreatePayment={handleCreatePayment}
                  onEditPayment={handleEditPayment}
                />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
