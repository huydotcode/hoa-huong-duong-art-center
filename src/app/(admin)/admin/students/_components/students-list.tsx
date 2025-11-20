"use client";

import {
  useEffect,
  useState,
  useTransition,
  useCallback,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { StudentTableRow } from "./student-table-row";
import {
  getStudents,
  type StudentLearningStatsSummary,
} from "@/lib/services/admin-students-service";
import type { StudentWithClassSummary } from "@/types";
import { Loader2 } from "lucide-react";
import { STUDENT_LEARNING_STATUS_FILTERS } from "@/lib/constants/student-learning-status";
import { Card } from "@/components/ui/card";

interface StudentsListProps {
  initialData: StudentWithClassSummary[];
  query: string;
  subject?: string;
  learningStatus?: string;
  recentOnly?: boolean;
  totalCount: number;
  pageSize: number;
  learningStats?: StudentLearningStatsSummary;
}

export default function StudentsList({
  initialData,
  query,
  subject = "",
  learningStatus = "",
  recentOnly = false,
  totalCount,
  pageSize,
  learningStats,
}: StudentsListProps) {
  // State is automatically reset when component remounts (via key prop in parent)
  const [allData, setAllData] =
    useState<StudentWithClassSummary[]>(initialData);
  const [estimatedTotal, setEstimatedTotal] = useState(totalCount);
  const [isPending, startTransition] = useTransition();
  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
  const hasSubjectFilter = useMemo(
    () => subject.trim().length > 0 && subject.toLowerCase() !== "all",
    [subject]
  );
  const normalizedLearningStatus = learningStatus.trim().toLowerCase();
  const hasLearningStatusFilter = useMemo(
    () => normalizedLearningStatus.length > 0,
    [normalizedLearningStatus]
  );
  const hasRecentFilter = recentOnly;
  const learningStatusLabel = useMemo(() => {
    if (!hasLearningStatusFilter) return "";
    return (
      STUDENT_LEARNING_STATUS_FILTERS.find(
        (item) => item.value === normalizedLearningStatus
      )?.label ?? learningStatus
    );
  }, [hasLearningStatusFilter, learningStatus, normalizedLearningStatus]);
  const displayedCount = allData.length;
  const hasMore = estimatedTotal > displayedCount;

  useEffect(() => {
    setEstimatedTotal(totalCount);
  }, [totalCount]);

  // Remove deleted student optimistically when receiving global event
  const handleDeleted = useCallback((e: Event) => {
    const custom = e as CustomEvent<{ id?: string }>;
    const id = custom.detail?.id;
    if (!id) return;
    setAllData((prev) => prev.filter((s) => s.id !== id));
    setEstimatedTotal((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleCreated = useCallback(
    (e: Event) => {
      const shouldSkipOptimistic =
        hasSubjectFilter ||
        (hasLearningStatusFilter && normalizedLearningStatus !== "no_class") ||
        hasRecentFilter;
      if (shouldSkipOptimistic) {
        return;
      }
      const custom = e as CustomEvent<{ student?: StudentWithClassSummary }>;
      const created = custom.detail?.student;
      if (!created) return;
      let existed = false;
      setAllData((prev) => {
        existed = prev.some((s) => s.id === created.id);
        const filtered = existed
          ? prev.filter((s) => s.id !== created.id)
          : prev;
        return [created, ...filtered];
      });
      if (!existed) {
        setEstimatedTotal((prev) => prev + 1);
      }
    },
    [
      hasSubjectFilter,
      hasLearningStatusFilter,
      normalizedLearningStatus,
      hasRecentFilter,
    ]
  );

  const handleUpdated = useCallback((e: Event) => {
    const custom = e as CustomEvent<{ student?: StudentWithClassSummary }>;
    const updated = custom.detail?.student;
    if (!updated) return;
    setAllData((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
  }, []);

  useEffect(() => {
    window.addEventListener("student-created", handleCreated as EventListener);
    window.addEventListener("student-deleted", handleDeleted as EventListener);
    window.addEventListener("student-updated", handleUpdated as EventListener);
    return () => {
      window.removeEventListener(
        "student-created",
        handleCreated as EventListener
      );
      window.removeEventListener(
        "student-deleted",
        handleDeleted as EventListener
      );
      window.removeEventListener(
        "student-updated",
        handleUpdated as EventListener
      );
    };
  }, [handleCreated, handleDeleted, handleUpdated]);

  const handleLoadMore = useCallback(() => {
    if (isPending || !hasMore) return;

    startTransition(async () => {
      try {
        const nextBatch = (await getStudents(query, {
          limit: pageSize,
          offset: displayedCount,
          subject,
          learningStatus: normalizedLearningStatus,
          recentOnly,
        })) as StudentWithClassSummary[];
        setAllData((prev) => [...prev, ...nextBatch]);
      } catch (error) {
        console.error("Error loading more students:", error);
      }
    });
  }, [
    isPending,
    hasMore,
    query,
    subject,
    pageSize,
    displayedCount,
    normalizedLearningStatus,
    recentOnly,
  ]);

  const filterSummary =
    hasQuery || hasLearningStatusFilter || hasRecentFilter ? (
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

  const totalStudents = totalCount ?? allData.length;

  const statsSection = (
    <div className="px-3 pb-3">
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-6">
        {[
          {
            key: "total",
            label: "Tổng học sinh",
            value: totalStudents,
            description: "Tổng số học sinh theo bộ lọc hiện tại",
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

  if (initialData.length === 0) {
    return (
      <>
        {filterSummary}
        {statsSection}
        <div className="px-3">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableHeaderRow>
                  <TableHead>Họ và tên</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead className="min-w-[220px]">
                    Lớp / trạng thái
                  </TableHead>
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
                    colSpan={10}
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

      {/* Responsive Table view with horizontal scroll */}
      <div className="px-3">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead className="min-w-[220px]">
                  Lớp / trạng thái
                </TableHead>
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
              {allData.map((s) => (
                <StudentTableRow
                  key={s.id}
                  student={s}
                  activeLearningStatus={
                    hasLearningStatusFilter
                      ? normalizedLearningStatus
                      : undefined
                  }
                  activeSubject={hasSubjectFilter ? subject : undefined}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="px-3 pb-3 pt-2 flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải...
              </>
            ) : (
              `Hiển thị thêm ${pageSize} học sinh`
            )}
          </Button>
        </div>
      )}

      {!hasMore && displayedCount > pageSize && (
        <div className="px-3 pb-3 pt-2">
          <p className="text-center text-sm text-muted-foreground">
            Đã hiển thị tất cả {totalCount} học sinh
          </p>
        </div>
      )}
    </>
  );
}
