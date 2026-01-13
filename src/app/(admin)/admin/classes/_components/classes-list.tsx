"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getClasses,
  getClassesCount,
} from "@/lib/services/admin-classes-service";
import { Loader2 } from "lucide-react";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { ClassCard } from "./class-card";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Lazy load heavy calendar component
const WeeklyScheduleCalendar = lazy(() =>
  import("../[classId]/_components/weekly-schedule-calendar").then((mod) => ({
    default: mod.WeeklyScheduleCalendar,
  }))
);

interface ClassesListProps {
  query: string;
  subject: string;
  defaultLimit?: number;
}

export default function ClassesList({
  query,
  subject,
  defaultLimit = 12,
}: ClassesListProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isShowingAll, setIsShowingAll] = useState(false);
  const queryClient = useQueryClient();

  // 1. Fetch Total Count
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["admin-classes-count", { query, subject }],
    queryFn: () => getClassesCount(query, { subject: subject || undefined }),
  });

  // Sync estimated total for smooth UI
  const [estimatedTotal, setEstimatedTotal] = useState(totalCount);
  useEffect(() => {
    setEstimatedTotal(totalCount);
  }, [totalCount]);

  // 2. Fetch Classes
  const { data: items, isFetching: isPending } = useQuery({
    queryKey: [
      "admin-classes",
      {
        query,
        subject,
        limit: isShowingAll ? totalCount : defaultLimit,
      },
    ],
    queryFn: async () => {
      const currentLimit = isShowingAll
        ? totalCount || defaultLimit
        : defaultLimit;
      return getClasses(query, {
        subject: subject || undefined,
        limit: currentLimit,
        offset: 0,
      });
    },
    placeholderData: (prev) => prev,
  });

  // Handle Real-time Updates
  useEffect(() => {
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-classes-count"] });
    };

    window.addEventListener("class-created", handleInvalidate);
    window.addEventListener("class-updated", handleInvalidate);
    window.addEventListener("class-deleted", handleInvalidate);

    return () => {
      window.removeEventListener("class-created", handleInvalidate);
      window.removeEventListener("class-updated", handleInvalidate);
      window.removeEventListener("class-deleted", handleInvalidate);
    };
  }, [queryClient]);

  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
  const displayedCount = items?.length ?? 0;
  const hasMore = estimatedTotal > displayedCount;

  const selectedClass = useMemo(
    () => items?.find((c) => c.id === selectedClassId) ?? null,
    [items, selectedClassId]
  );

  const handleViewSchedule = useCallback(
    (classId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedClassId(classId);
    },
    []
  );

  // Loading State
  if (isPending && (!items || items.length === 0)) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="px-3 pb-4 text-sm text-muted-foreground">
        Không có lớp học phù hợp.
      </div>
    );
  }

  return (
    <div className="pb-3">
      {hasQuery && (
        <div className="px-3 pb-2 text-sm text-muted-foreground">
          Đang lọc theo: &ldquo;{query}&rdquo;
        </div>
      )}
      {/* Cards - responsive grid */}
      <div className="grid gap-4 px-3 2xl:grid-cols-2">
        {items.map((c) => (
          <ClassCard
            key={c.id}
            classItem={c}
            onViewSchedule={handleViewSchedule}
          />
        ))}
      </div>

      {hasMore && (
        <div className="px-3 pt-3 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setIsShowingAll(true)}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải...
              </>
            ) : (
              `Hiển thị tất cả (${Math.max(totalCount - items.length, 0)} lớp còn lại)`
            )}
          </Button>
        </div>
      )}

      {selectedClass && (
        <Dialog
          open={selectedClassId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedClassId(null);
          }}
        >
          <DialogContent maxWidth="max-w-[1220px]">
            <DialogHeader>
              <DialogTitle>Lịch học - {selectedClass.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 w-full overflow-auto py-[20px] max-h-[80vh]">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <WeeklyScheduleCalendar
                  daysOfWeek={selectedClass.days_of_week}
                  durationMinutes={selectedClass.duration_minutes}
                  classData={selectedClass}
                />
              </Suspense>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
