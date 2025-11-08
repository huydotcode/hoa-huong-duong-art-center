"use client";

import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import type {
  TuitionItem,
  TuitionSummary,
} from "@/lib/services/admin-payment-service";
import {
  togglePaymentStatus,
  activateTrialStudent,
} from "@/lib/services/admin-payment-service";
import { formatDateRange } from "@/lib/utils";
import TuitionFilter from "./tuition-filter";
import TuitionTable from "./tuition-table";
import TuitionCards from "./tuition-cards";
import { PaymentForm } from "./payment-form";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [cancelPaymentDialog, setCancelPaymentDialog] = useState<{
    open: boolean;
    item: TuitionItem | null;
  }>({ open: false, item: null });
  const [isCancelingPayment, setIsCancelingPayment] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

  // Toggle payment status (đóng/hủy đóng) nhanh
  const handleTogglePayment = async (item: TuitionItem) => {
    // Nếu đang đóng (chưa đóng → đã đóng), toggle ngay
    if (!item.isPaid) {
      try {
        const updatedItem = await togglePaymentStatus(
          item,
          initialMonth,
          initialYear,
          pathname
        );

        // Optimistic update
        handlePaymentUpdate(updatedItem);

        toast.success("Đã đánh dấu đóng học phí");
      } catch (error) {
        console.error("Error toggling payment:", error);
        toast.error("Lỗi khi cập nhật trạng thái", {
          description:
            error instanceof Error ? error.message : "Vui lòng thử lại",
        });
      }
    } else {
      // Nếu đang hủy đóng (đã đóng → chưa đóng), hiển thị confirmation
      setCancelPaymentDialog({ open: true, item });
    }
  };

  // Handler xác nhận hủy đóng
  const handleConfirmCancelPayment = async () => {
    if (!cancelPaymentDialog.item) return;

    setIsCancelingPayment(true);
    try {
      const updatedItem = await togglePaymentStatus(
        cancelPaymentDialog.item,
        initialMonth,
        initialYear,
        pathname
      );

      // Optimistic update
      handlePaymentUpdate(updatedItem);

      toast.success("Đã hủy đánh dấu đóng học phí");
      setCancelPaymentDialog({ open: false, item: null });
    } catch (error) {
      console.error("Error canceling payment:", error);
      toast.error("Lỗi khi hủy đánh dấu đóng học phí", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại",
      });
    } finally {
      setIsCancelingPayment(false);
    }
  };

  // Handler chuyển học sinh từ trial sang active
  const handleActivateTrial = async (item: TuitionItem) => {
    try {
      await activateTrialStudent(item.enrollmentId, pathname);

      // Update local state: chuyển enrollmentStatus từ "trial" sang "active"
      setTuitionData((prev) => {
        return prev.map((i) => {
          if (
            i.studentId === item.studentId &&
            i.classId === item.classId &&
            i.enrollmentId === item.enrollmentId
          ) {
            return {
              ...i,
              enrollmentStatus: "active" as const,
            };
          }
          return i;
        });
      });

      toast.success("Đã chuyển học sinh sang chính thức");

      // Refresh data ở background
      setIsRefreshing(true);
      router.refresh();
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error("Error activating trial student:", error);
      toast.error("Lỗi khi chuyển học sinh sang chính thức", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại",
      });
    }
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

      {/* Confirmation dialog khi hủy đóng học phí */}
      <AlertDialog
        open={cancelPaymentDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCancelPaymentDialog({ open: false, item: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy đóng học phí</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn hủy đánh dấu đóng học phí cho học sinh{" "}
              <span className="font-semibold">
                {cancelPaymentDialog.item?.studentName}
              </span>{" "}
              không? Hành động này sẽ cập nhật trạng thái từ &quot;Đã đóng&quot;
              sang &quot;Chưa đóng&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelingPayment}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancelPayment}
              disabled={isCancelingPayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận hủy đóng"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  onTogglePayment={handleTogglePayment}
                  onActivateTrial={handleActivateTrial}
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
                  onTogglePayment={handleTogglePayment}
                  onActivateTrial={handleActivateTrial}
                />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
