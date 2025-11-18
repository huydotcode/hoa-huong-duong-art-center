"use client";

import {
  useEffect,
  useState,
  useTransition,
  useCallback,
  useMemo,
} from "react";
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
import { StudentCard } from "./student-card";
import { StudentTableRow } from "./student-table-row";
import { getStudents } from "@/lib/services/admin-students-service";
import type { Student } from "@/types";
import { Loader2 } from "lucide-react";

interface StudentsListProps {
  initialData: Student[];
  query: string;
  totalCount: number;
  pageSize: number;
}

export default function StudentsList({
  initialData,
  query,
  totalCount,
  pageSize,
}: StudentsListProps) {
  // State is automatically reset when component remounts (via key prop in parent)
  const [allData, setAllData] = useState<Student[]>(initialData);
  const [estimatedTotal, setEstimatedTotal] = useState(totalCount);
  const [isPending, startTransition] = useTransition();
  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
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

  const handleUpdated = useCallback((e: Event) => {
    const custom = e as CustomEvent<{ student?: Student }>;
    const updated = custom.detail?.student;
    if (!updated) return;
    setAllData((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
  }, []);

  useEffect(() => {
    window.addEventListener("student-deleted", handleDeleted as EventListener);
    window.addEventListener("student-updated", handleUpdated as EventListener);
    return () => {
      window.removeEventListener(
        "student-deleted",
        handleDeleted as EventListener
      );
      window.removeEventListener(
        "student-updated",
        handleUpdated as EventListener
      );
    };
  }, [handleDeleted, handleUpdated]);

  const handleLoadMore = useCallback(() => {
    if (isPending || !hasMore) return;

    startTransition(async () => {
      try {
        const nextBatch = await getStudents(query, {
          limit: pageSize,
          offset: displayedCount,
        });
        setAllData((prev) => [...prev, ...nextBatch]);
      } catch (error) {
        console.error("Error loading more students:", error);
      }
    });
  }, [isPending, hasMore, query, pageSize, displayedCount]);

  if (initialData.length === 0) {
    return (
      <>
        {/* Mobile: Card view */}
        <div className="grid gap-2 px-3 md:hidden">
          <p className="text-center text-sm text-muted-foreground">
            Chưa có học sinh nào
          </p>
        </div>

        {/* Desktop: Table view */}
        <CardContent className="hidden p-0 md:block">
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Chưa có học sinh nào
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </>
    );
  }

  return (
    <>
      {hasQuery && (
        <p className="px-3 pb-2 text-sm text-muted-foreground">
          Đang tìm danh sách học sinh theo:{" "}
          <span className="font-medium text-foreground">
            &quot;{query}&quot;
          </span>
        </p>
      )}

      {/* Mobile: Card view */}
      <div className="grid gap-2 px-3 md:hidden">
        {allData.map((s) => (
          <StudentCard key={s.id} student={s} />
        ))}
      </div>

      {/* Desktop: Table view */}
      <CardContent className="hidden p-0 md:block">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {allData.map((s) => (
              <StudentTableRow key={s.id} student={s} />
            ))}
          </TableBody>
        </Table>
      </CardContent>

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
