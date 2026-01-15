"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { TuitionItem } from "@/lib/services/admin-payment-service";
import {
  togglePaymentStatus,
  activateTrialStudent,
  getTuitionData,
  getTuitionDataForYear,
} from "@/lib/services/admin-payment-service";
import { formatDateRange, calculateTuitionSummary } from "@/lib/utils";
import TuitionFilter from "./tuition-filter";
import TuitionTable from "./tuition-table";
import TuitionCards from "./tuition-cards";
import { PaymentForm } from "./payment-form";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface TuitionClientProps {
  initialMonth: number;
  initialYear: number;
  initialClassId?: string;
  initialQuery: string;
  initialStatus: "all" | "paid" | "unpaid" | "not_created";
  initialSubject?: string;
  initialLearningStatus?: "all" | "enrolled" | "active" | "trial" | "inactive";
  classes: Array<{ id: string; name: string }>;
  viewMode: "month" | "year";
}

export default function TuitionClient({
  initialMonth,
  initialYear,
  initialClassId,
  initialQuery,
  initialStatus,
  initialSubject,
  initialLearningStatus,
  classes,
  viewMode,
}: TuitionClientProps) {
  const [selectedPayment, setSelectedPayment] = useState<TuitionItem | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cancelPaymentDialog, setCancelPaymentDialog] = useState<{
    open: boolean;
    item: TuitionItem | null;
  }>({ open: false, item: null });
  const [isCancelingPayment, setIsCancelingPayment] = useState(false);
  const pathname = usePathname();
  const isYearView = viewMode === "year";
  const queryClient = useQueryClient();

  const queryKey = [
    "admin-tuition",
    {
      month: initialMonth,
      year: initialYear,
      classId: initialClassId,
      query: initialQuery,
      status: initialStatus,
      subject: initialSubject,
      learningStatus: initialLearningStatus,
      viewMode,
    },
  ];

  const {
    data: tuitionData = [],
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (viewMode === "year") {
        return getTuitionDataForYear(
          initialYear,
          initialClassId,
          initialQuery,
          initialStatus,
          initialSubject,
          initialLearningStatus
        );
      } else {
        return getTuitionData(
          initialMonth,
          initialYear,
          initialClassId,
          initialQuery,
          initialStatus,
          initialSubject,
          initialLearningStatus
        );
      }
    },
  });

  const summary = useMemo(
    () => calculateTuitionSummary(tuitionData),
    [tuitionData]
  );

  // Nhóm dữ liệu theo lớp
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
      const sortedItems = [...items].sort((a, b) => {
        if (isYearView && a.month !== b.month) {
          return a.month - b.month;
        }
        return a.studentName.localeCompare(b.studentName);
      });
      const [, className] = key.split("::");
      return {
        classId: items[0].classId,
        className,
        items: sortedItems,
      };
    });
  }, [tuitionData, isYearView]);

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

  const handlePaymentUpdate = () => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
  };

  const handleTogglePayment = async (item: TuitionItem) => {
    if (!item.isPaid) {
      try {
        const targetMonth = isYearView ? item.month : initialMonth;
        await togglePaymentStatus(item, targetMonth, initialYear, pathname);

        toast.success("Đã đánh dấu đóng học phí");
        queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
      } catch (error) {
        console.error("Error toggling payment:", error);
        toast.error("Lỗi khi cập nhật trạng thái", {
          description:
            error instanceof Error ? error.message : "Vui lòng thử lại",
        });
      }
    } else {
      setCancelPaymentDialog({ open: true, item });
    }
  };

  const handleConfirmCancelPayment = async () => {
    if (!cancelPaymentDialog.item) return;

    setIsCancelingPayment(true);
    try {
      const targetMonth = isYearView
        ? cancelPaymentDialog.item.month
        : initialMonth;
      await togglePaymentStatus(
        cancelPaymentDialog.item,
        targetMonth,
        initialYear,
        pathname
      );

      toast.success("Đã hủy đánh dấu đóng học phí");
      queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
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

  const handleActivateTrial = async (item: TuitionItem) => {
    try {
      await activateTrialStudent(item.enrollmentId, pathname);

      toast.success("Đã chuyển học sinh sang chính thức");
      queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
    } catch (error) {
      console.error("Error activating trial student:", error);
      toast.error("Lỗi khi chuyển học sinh sang chính thức", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại",
      });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Floating loading spinner */}
      {isRefetching && (
        <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Đang cập nhật...
          </span>
        </div>
      )}

      <TuitionFilter
        summary={summary}
        month={initialMonth}
        year={initialYear}
        classId={initialClassId}
        query={initialQuery}
        status={initialStatus}
        subject={initialSubject}
        learningStatus={initialLearningStatus || "enrolled"}
        classes={classes}
        onRefreshStart={handleRefresh}
        onRefreshEnd={() => {}}
        viewMode={viewMode}
      />

      <PaymentForm
        payment={selectedPayment}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        month={selectedPayment?.month ?? initialMonth}
        year={initialYear}
        onSuccess={handleCloseDialog}
        onPaymentUpdate={handlePaymentUpdate}
      />

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

      {groupedByClass.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu học phí
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
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
                  showMonthColumn={isYearView}
                />
              </Card>
            ))}
          </div>

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
                  showMonthBadge={isYearView}
                />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
