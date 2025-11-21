"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition, useEffect } from "react";
import { formatVND } from "@/lib/utils";
import { syncTuitionPaymentStatus } from "@/lib/services/admin-payment-service";
import { toast } from "sonner";
import { Loader2, Filter, X } from "lucide-react";
import type { TuitionSummary } from "@/lib/services/admin-payment-service";
import { SUBJECTS } from "@/lib/constants/subjects";

interface TuitionFilterProps {
  summary: TuitionSummary;
  month: number;
  year: number;
  classId?: string;
  query: string;
  status: "all" | "paid" | "unpaid" | "not_created";
  subject?: string;
  learningStatus?: "all" | "enrolled" | "active" | "trial" | "inactive";
  classes: Array<{ id: string; name: string }>;
  onRefreshStart?: () => void;
  onRefreshEnd?: () => void;
  viewMode: "month" | "year";
}

export default function TuitionFilter({
  summary,
  month,
  year,
  classId,
  query,
  status,
  subject,
  learningStatus,
  classes,
  onRefreshStart,
  onRefreshEnd,
  viewMode,
}: TuitionFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const [monthState, setMonthState] = useState<string>(String(month));
  const [yearState, setYearState] = useState<string>(String(year));
  const [classIdState, setClassIdState] = useState<string>(classId || "all");
  const [queryState, setQueryState] = useState<string>(query);
  const [statusState, setStatusState] = useState<string>(status);
  const [subjectState, setSubjectState] = useState<string>(subject || "all");
  const [learningStatusState, setLearningStatusState] = useState<string>(
    learningStatus || "enrolled"
  );
  const [viewModeState, setViewModeState] = useState<"month" | "year">(
    viewMode
  );

  // Sync state với props khi props thay đổi (từ URL params)
  useEffect(() => {
    setMonthState(String(month));
    setYearState(String(year));
    setClassIdState(classId || "all");
    setQueryState(query);
    setStatusState(status);
    setSubjectState(subject || "all");
    setLearningStatusState(learningStatus || "enrolled");
    setViewModeState(viewMode);
  }, [month, year, classId, query, status, subject, learningStatus, viewMode]);

  const updateParams = useCallback(
    (updates: {
      month?: string;
      year?: string;
      classId?: string;
      query?: string;
      status?: string;
      subject?: string;
      learningStatus?: string;
      viewMode?: "month" | "year";
    }) => {
      const nextMonth = updates.month ?? monthState;
      const nextYear = updates.year ?? yearState;
      const nextClassId = updates.classId ?? classIdState;
      const nextQuery = updates.query ?? queryState;
      const nextStatus = updates.status ?? statusState;
      const nextSubject = updates.subject ?? subjectState;
      const nextLearningStatus =
        updates.learningStatus ?? learningStatusState;
      const nextViewMode = updates.viewMode ?? viewModeState;

      const params = new URLSearchParams(searchParams?.toString());

      if (nextViewMode === "year") {
        params.set("view", "year");
        params.delete("month");
      } else {
        params.delete("view");
        if (nextMonth) params.set("month", nextMonth);
        else params.delete("month");
      }

      if (nextYear) params.set("year", nextYear);
      else params.delete("year");
      if (nextClassId && nextClassId !== "all")
        params.set("classId", nextClassId);
      else params.delete("classId");
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      else params.delete("q");
      if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
      else params.delete("status");
      if (nextSubject && nextSubject !== "all")
        params.set("subject", nextSubject);
      else params.delete("subject");
      if (nextLearningStatus && nextLearningStatus !== "enrolled")
        params.set("learningStatus", nextLearningStatus);
      else params.delete("learningStatus");

      startTransition(() => {
        router.replace(
          `${pathname}${params.toString() ? `?${params.toString()}` : ""}`
        );
      });
    },
    [
      classIdState,
      learningStatusState,
      monthState,
      pathname,
      queryState,
      router,
      searchParams,
      statusState,
      subjectState,
      viewModeState,
      yearState,
    ]
  );

  const handleMonthChange = (value: string) => {
    setMonthState(value);
    updateParams({ month: value });
  };

  const handleYearChange = (value: string) => {
    setYearState(value);
    updateParams({ year: value });
  };

  // Handle filter changes - apply immediately
  const handleClassChange = (value: string) => {
    setClassIdState(value);
    updateParams({ classId: value });
  };

  const handleStatusChange = (value: string) => {
    setStatusState(value);
    updateParams({ status: value });
  };

  const handleSubjectChange = (value: string) => {
    setSubjectState(value);
    updateParams({ subject: value });
  };

  const handleLearningStatusChange = (value: string) => {
    setLearningStatusState(value);
    updateParams({ learningStatus: value });
  };

  const handleClearFilters = () => {
    setClassIdState("all");
    setStatusState("all");
    setSubjectState("all");
    setLearningStatusState("enrolled");
    updateParams({
      classId: "all",
      status: "all",
      subject: "all",
      learningStatus: "enrolled",
    });
  };

  const handleSearch = () => {
    updateParams({});
  };

  const handleClear = () => {
    const now = new Date();
    const defaultMonth = String(now.getMonth() + 1);
    const defaultYear = String(now.getFullYear());
    setMonthState(defaultMonth);
    setYearState(defaultYear);
    setClassIdState("all");
    setQueryState("");
    setStatusState("all");
    setSubjectState("all");
    setLearningStatusState("enrolled");
    setViewModeState("month");
    updateParams({
      month: defaultMonth,
      year: defaultYear,
      classId: "all",
      query: "",
      status: "all",
      subject: "all",
      learningStatus: "enrolled",
      viewMode: "month",
    });
    setIsFilterPopoverOpen(false);
  };

  const handleViewModeChange = (value: string) => {
    const mode = value === "year" ? "year" : "month";
    setViewModeState(mode);
    updateParams({ viewMode: mode });
  };

  const handleSyncTuition = async () => {
    if (viewModeState === "year") {
      toast.info("Chỉ có thể đồng bộ ở chế độ xem theo tháng");
      return;
    }
    setIsSyncing(true);
    try {
      const result = await syncTuitionPaymentStatus(
        parseInt(monthState, 10),
        parseInt(yearState, 10),
        false
      );

      if (result.created > 0) {
        toast.success(
          `Đã tạo ${result.created} học phí cho tháng ${monthState}/${yearState}`,
          {
            description:
              result.skipped > 0
                ? `${result.skipped} học phí đã tồn tại`
                : undefined,
          }
        );
      } else {
        toast.info("Không có học phí nào cần tạo", {
          description: "Tất cả học sinh đã có học phí cho tháng này",
        });
      }

      // Start refresh loading
      if (onRefreshStart) onRefreshStart();

      // Refresh page data
      router.refresh();

      // End refresh loading after a delay
      if (onRefreshEnd) {
        setTimeout(() => {
          onRefreshEnd();
        }, 800);
      }
    } catch (error) {
      console.error("Error syncing tuition:", error);
      toast.error("Lỗi khi tạo học phí tự động", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
      // End refresh loading even on error
      if (onRefreshEnd) onRefreshEnd();
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate year options (current year - 2 to current year + 2)
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Tính số filter đang active (chỉ tính lớp, môn học, trạng thái, trạng thái học - không tính tháng/năm và tìm kiếm)
  const activeFilterCount =
    (classIdState !== "all" ? 1 : 0) +
    (subjectState !== "all" ? 1 : 0) +
    (statusState !== "all" ? 1 : 0) +
    (learningStatusState !== "enrolled" ? 1 : 0);

  const hasFilter =
    monthState !== String(now.getMonth() + 1) ||
    yearState !== String(now.getFullYear()) ||
    classIdState !== "all" ||
    queryState.trim().length > 0 ||
    statusState !== "all" ||
    subjectState !== "all" ||
    learningStatusState !== "enrolled" ||
    viewModeState !== "month";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center flex-wrap">
          <Select
            value={monthState}
            onValueChange={handleMonthChange}
            disabled={viewModeState === "year"}
          >
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  Tháng {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={yearState} onValueChange={handleYearChange}>
            <SelectTrigger className="w-full md:w-[120px]">
              <SelectValue placeholder="Chọn năm" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={viewModeState} onValueChange={handleViewModeChange}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Phạm vi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Theo tháng</SelectItem>
              <SelectItem value="year">Cả năm</SelectItem>
            </SelectContent>
          </Select>

          <Popover
            open={isFilterPopoverOpen}
            onOpenChange={setIsFilterPopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full md:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                Bộ lọc
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 min-w-5 flex items-center justify-center px-1.5"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Bộ lọc</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Xóa
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Lớp */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lớp</label>
                    <Select
                      value={classIdState}
                      onValueChange={handleClassChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn lớp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả lớp</SelectItem>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Môn học */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Môn học</label>
                    <Select
                      value={subjectState}
                      onValueChange={handleSubjectChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn môn học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả môn</SelectItem>
                        {SUBJECTS.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trạng thái */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trạng thái</label>
                    <Select
                      value={statusState}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="paid">Đã đóng</SelectItem>
                        <SelectItem value="unpaid">Chưa đóng</SelectItem>
                        <SelectItem value="not_created">Chưa tạo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trạng thái học */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trạng thái học</label>
                    <Select
                      value={learningStatusState}
                      onValueChange={handleLearningStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enrolled">Đang học</SelectItem>
                        <SelectItem value="active">Đang học (chính thức)</SelectItem>
                        <SelectItem value="trial">Học thử</SelectItem>
                        <SelectItem value="inactive">Ngừng học</SelectItem>
                        <SelectItem value="all">Tất cả</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex w-full gap-2 md:w-80">
            <Input
              value={queryState}
              onChange={(e) => setQueryState(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Tìm kiếm học sinh..."
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="secondary"
              className="whitespace-nowrap"
              disabled={isPending}
              onClick={handleSearch}
            >
              {isPending ? "Đang tìm..." : "Tìm kiếm"}
            </Button>
          </div>

          {hasFilter && (
            <Button
              type="button"
              variant="outline"
              className="w-full whitespace-nowrap md:w-auto"
              onClick={handleClear}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="default"
              className="w-full md:w-auto"
              disabled={isPending || isSyncing || viewModeState === "year"}
            >
              Tạo học phí tự động
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận tạo học phí tự động</AlertDialogTitle>
              <AlertDialogDescription>
                Hệ thống sẽ tự động tạo học phí cho tất cả học sinh đang học
                trong tháng {monthState}/{yearState} chưa có học phí.
                <br />
                <br />
                <strong>Lưu ý:</strong> Chỉ tạo học phí cho học sinh đang học,
                còn học sinh đang học thử sẽ không tạo tự động.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSyncing}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSyncTuition}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  "Xác nhận"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-secondary">
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tổng đã thu
              </p>
              <p className="text-2xl font-bold text-black">
                {formatVND(summary.totalPaid)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary">
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tổng chưa thu
              </p>
              <p className="text-2xl font-bold text-black">
                {formatVND(summary.totalUnpaid)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary">
          <CardContent className="p-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Chưa tạo học phí
              </p>
              <p className="text-2xl font-bold text-black">
                {summary.totalNotCreated}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
