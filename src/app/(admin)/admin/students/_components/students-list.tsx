"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { STUDENT_LEARNING_STATUS_FILTERS } from "@/lib/constants/student-learning-status";
import {
  getStudents,
  getStudentsCount,
  getStudentLearningStats,
} from "@/lib/services/admin-students-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Plus, Scissors } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BulkCopyCutDialog } from "./bulk-copy-cut-dialog";
import { BulkEnrollDialog } from "./bulk-enroll-dialog";
import { StudentTableRow } from "./student-table-row";

interface StudentsListProps {
  query: string;
  subject?: string;
  learningStatus?: string;
  recentOnly?: boolean;
  tuitionStatus?: "paid_or_partial" | "unpaid_or_not_created";
  sortBy?: "name" | "created_at" | "enrollment_date" | "phone";
  sortOrder?: "asc" | "desc";
  defaultLimit?: number;
}

export default function StudentsList({
  query,
  subject = "",
  learningStatus = "",
  recentOnly = false,
  tuitionStatus,
  sortBy = "name",
  sortOrder = "asc",
  defaultLimit = 30,
}: StudentsListProps) {
  // State for "Show All" functionality
  const [isShowingAll, setIsShowingAll] = useState(false);

  const normalizedLearningStatus = learningStatus.trim().toLowerCase();

  // 1. Fetch Total Count
  const { data: totalCount = 0 } = useQuery({
    queryKey: [
      "admin-students-count",
      {
        query,
        subject,
        learningStatus: normalizedLearningStatus,
        recentOnly,
        tuitionStatus,
      },
    ],
    queryFn: () =>
      getStudentsCount(query, {
        subject,
        learningStatus: normalizedLearningStatus,
        recentOnly,
        tuitionStatus,
      }),
  });

  // 2. Fetch Learning Stats
  const { data: learningStats } = useQuery({
    queryKey: [
      "admin-students-stats",
      {
        query,
        subject,
        learningStatus: normalizedLearningStatus,
        recentOnly,
        tuitionStatus,
      },
    ],
    queryFn: () =>
      getStudentLearningStats(query, {
        subject,
        learningStatus: normalizedLearningStatus,
        recentOnly,
        tuitionStatus,
      }),
  });

  // 3. Fetch Students List
  const { data: allData, isFetching: isPending } = useQuery({
    queryKey: [
      "admin-students",
      {
        query,
        subject,
        learningStatus: normalizedLearningStatus,
        recentOnly,
        tuitionStatus,
        sortBy,
        sortOrder,
        limit: isShowingAll ? totalCount : defaultLimit,
      },
    ],
    queryFn: async () => {
      // If we are showing all, we fetch everything
      // Otherwise we use the default limit (e.g. 30)
      // Note: If totalCount is not yet loaded, use defaultLimit.
      // React Query handles deps, but totalCount defaults to 0 initially.
      const currentLimit = isShowingAll
        ? totalCount || defaultLimit
        : defaultLimit;

      return getStudents(query, {
        limit: currentLimit,
        offset: 0,
        subject,
        learningStatus: normalizedLearningStatus,
        recentOnly,
        tuitionStatus,
        sortBy,
        sortOrder,
      });
    },
    placeholderData: (prev) => prev,
  });

  const [estimatedTotal, setEstimatedTotal] = useState(totalCount);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"copy" | "cut">("copy");
  const [bulkEnrollDialogOpen, setBulkEnrollDialogOpen] = useState(false);

  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
  const hasSubjectFilter = useMemo(
    () => subject.trim().length > 0 && subject.toLowerCase() !== "all",
    [subject]
  );

  const hasLearningStatusFilter = useMemo(
    () => normalizedLearningStatus.length > 0,
    [normalizedLearningStatus]
  );
  const hasRecentFilter = recentOnly;
  const hasTuitionStatusFilter = useMemo(
    () => Boolean(tuitionStatus),
    [tuitionStatus]
  );
  const learningStatusLabel = useMemo(() => {
    if (!hasLearningStatusFilter) return "";
    return (
      STUDENT_LEARNING_STATUS_FILTERS.find(
        (item) => item.value === normalizedLearningStatus
      )?.label ?? learningStatus
    );
  }, [hasLearningStatusFilter, learningStatus, normalizedLearningStatus]);
  const tuitionStatusLabel = useMemo(() => {
    if (!hasTuitionStatusFilter) return "";
    return tuitionStatus === "paid_or_partial"
      ? "Đã đóng (gồm một phần)"
      : "Chưa đóng";
  }, [hasTuitionStatusFilter, tuitionStatus]);

  const displayedCount = allData?.length ?? 0;
  // If we haven't loaded everything yet, and total > displayed, show button
  // Note: We keep showing the button even if isShowingAll is true but we are still pending (loading)
  // this prevents the button from disappearing immediately when clicked.
  const hasMore = estimatedTotal > displayedCount;

  useEffect(() => {
    setEstimatedTotal(totalCount);
  }, [totalCount]);

  // Handle optimistic updates by invalidating queries
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleInvalidate = () => {
      // Invalidate all related queries to force a refetch
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["admin-students-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-students-stats"] });
    };

    window.addEventListener("student-created", handleInvalidate);
    window.addEventListener("student-updated", handleInvalidate);
    window.addEventListener("student-deleted", handleInvalidate);

    return () => {
      window.removeEventListener("student-created", handleInvalidate);
      window.removeEventListener("student-updated", handleInvalidate);
      window.removeEventListener("student-deleted", handleInvalidate);
    };
  }, [queryClient]);

  const filterSummary =
    hasQuery ||
    hasLearningStatusFilter ||
    hasRecentFilter ||
    hasTuitionStatusFilter ? (
      <p className="px-3 pb-2 text-sm text-muted-foreground space-x-2">
        {hasQuery && (
          <span>
            Đang tìm theo{" "}
            <span className="font-medium text-foreground">
              &quot;{query}&quot;
            </span>
          </span>
        )}
        {hasLearningStatusFilter && (
          <span>
            Trạng thái học:{" "}
            <span className="font-medium text-foreground">
              {learningStatusLabel}
            </span>
          </span>
        )}
        {hasTuitionStatusFilter && (
          <span>
            Học phí:{" "}
            <span className="font-medium text-foreground">
              {tuitionStatusLabel}
            </span>
          </span>
        )}
        {hasRecentFilter && (
          <span>
            Bộ lọc:{" "}
            <span className="font-medium text-foreground">
              Học sinh mới (30 ngày)
            </span>
          </span>
        )}
      </p>
    ) : null;

  const stats = learningStats ?? {
    active: 0,
    trial: 0,
    inactive: 0,
    noClass: 0,
    recent: 0,
  };

  const totalActiveStudents = Math.max(
    0,
    (stats.active ?? 0) + (stats.trial ?? 0) + (stats.noClass ?? 0)
  );

  const toggleSelect = useCallback((studentId: string, checked: boolean) => {
    setSelectedStudentIds((prev) =>
      checked
        ? Array.from(new Set([...prev, studentId]))
        : prev.filter((id) => id !== studentId)
    );
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked && allData) {
        setSelectedStudentIds(allData.map((s) => s.id));
      } else {
        setSelectedStudentIds([]);
      }
    },
    [allData]
  );

  const allSelected = useMemo(
    () =>
      allData &&
      allData.length > 0 &&
      selectedStudentIds.length === allData.length,
    [allData, selectedStudentIds.length]
  );

  const selectedStudents = useMemo(
    () => (allData ?? []).filter((s) => selectedStudentIds.includes(s.id)),
    [allData, selectedStudentIds]
  );

  const statsSection = (
    <div className="px-3 pb-3">
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-6">
        {[
          {
            key: "total",
            label: "Tổng học sinh",
            value: totalActiveStudents,
            description: "Không bao gồm học sinh ngừng học",
          },
          {
            key: "active",
            label: "Đang học",
            value: stats.active,
            description: "Học sinh đang học chính thức",
          },
          {
            key: "trial",
            label: "Học thử",
            value: stats.trial,
            description: "Học sinh trong giai đoạn học thử",
          },
          {
            key: "inactive",
            label: "Ngừng học",
            value: stats.inactive,
            description: "Học sinh đã dừng học",
          },
          {
            key: "noClass",
            label: "Chưa có lớp",
            value: stats.noClass,
            description: "Học sinh chưa được xếp lớp",
          },
          {
            key: "recent",
            label: "Đăng ký mới (30 ngày)",
            value: stats.recent,
            description: "Tạo trong 30 ngày gần nhất",
          },
        ].map((item) => (
          <Card key={item.key} className="p-3">
            <p className="text-sm font-medium text-muted-foreground">
              {item.label}
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {item.value.toLocaleString("vi-VN")}
            </p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );

  if (isPending && (!allData || allData.length === 0)) {
    return (
      <div className="px-3 py-10 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">
          Đang tải danh sách học sinh...
        </p>
      </div>
    );
  }

  if (!allData || allData.length === 0) {
    return (
      <>
        {filterSummary}
        {statsSection}
        <div className="px-3">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead className="w-[50px] min-w-[50px] p-0">
                    <div className="flex items-center justify-center">
                      <Checkbox disabled className="size-5" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[60px] text-center">STT</TableHead>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead className="w-[220px]">Lớp / trạng thái</TableHead>
                  <TableHead>Ngày nhập học</TableHead>
                  <TableHead>Đóng học phí</TableHead>
                  <TableHead>Điểm danh hôm nay</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-center">Trạng thái học</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Chưa có học sinh nào
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {filterSummary}
      {statsSection}

      {/* Bulk actions bar */}
      {selectedStudentIds.length > 0 && (
        <div className="px-3 pb-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Đã chọn: {selectedStudentIds.length} học sinh
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setBulkAction("copy");
                setBulkDialogOpen(true);
              }}
            >
              <Copy className="size-4 mr-1" /> Copy
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setBulkAction("cut");
                setBulkDialogOpen(true);
              }}
            >
              <Scissors className="size-4 mr-1" /> Cut
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setBulkEnrollDialogOpen(true);
              }}
            >
              <Plus className="size-4 mr-1" /> Thêm vào lớp
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedStudentIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Responsive Table view with horizontal scroll */}
      <div className="px-3">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead className="w-[50px] min-w-[50px]">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      className="size-5 border-yellow-500"
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Chọn tất cả học sinh"
                    />
                  </div>
                </TableHead>
                <TableHead className="w-[60px] text-center">STT</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead className="w-[220px]">Lớp / trạng thái</TableHead>
                <TableHead>Ngày nhập học</TableHead>
                <TableHead>Đóng học phí</TableHead>
                <TableHead>Điểm danh hôm nay</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-center">Trạng thái học</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {allData.map((s, index) => (
                <StudentTableRow
                  key={s.id}
                  student={s}
                  index={index + 1}
                  activeLearningStatus={
                    hasLearningStatusFilter
                      ? normalizedLearningStatus
                      : undefined
                  }
                  activeSubject={hasSubjectFilter ? subject : undefined}
                  selected={selectedStudentIds.includes(s.id)}
                  onSelectChange={(checked) => toggleSelect(s.id, checked)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Show All Button */}
      {hasMore && (
        <div className="px-3 pb-3 pt-2 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setIsShowingAll(true)}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải tất cả...
              </>
            ) : (
              "Hiện tất cả"
            )}
          </Button>
        </div>
      )}

      {/* Bulk Copy/Cut Dialog */}
      <BulkCopyCutDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedStudents={selectedStudents}
        action={bulkAction}
      />

      {/* Bulk Enroll Dialog */}
      <BulkEnrollDialog
        open={bulkEnrollDialogOpen}
        onOpenChange={setBulkEnrollDialogOpen}
        selectedStudents={selectedStudents}
      />
    </>
  );
}
