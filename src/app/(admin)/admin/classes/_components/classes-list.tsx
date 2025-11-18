"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getClasses } from "@/lib/services/admin-classes-service";
import { type ClassListItem } from "@/types";
import { Loader2 } from "lucide-react";
import {
  useState,
  useTransition,
  useMemo,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { ClassCard } from "./class-card";

// Lazy load heavy calendar component
const WeeklyScheduleCalendar = lazy(() =>
  import("../[classId]/_components/weekly-schedule-calendar").then((mod) => ({
    default: mod.WeeklyScheduleCalendar,
  }))
);

export default function ClassesList({
  data,
  query,
  totalCount,
}: {
  data: ClassListItem[];
  query: string;
  totalCount: number;
}) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [allData, setAllData] = useState<ClassListItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
  const displayData = allData ?? data;
  const hasMore = useMemo(
    () => !hasQuery && totalCount > data.length,
    [hasQuery, totalCount, data.length]
  );
  const selectedClass = useMemo(
    () => displayData.find((c) => c.id === selectedClassId) ?? null,
    [displayData, selectedClassId]
  );

  const handleShowAll = useCallback(() => {
    if (allData) {
      setAllData(null);
    } else {
      startTransition(async () => {
        const fullData = await getClasses(query);
        setAllData(fullData);
      });
    }
  }, [allData, query]);

  const handleViewSchedule = useCallback(
    (classId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedClassId(classId);
    },
    []
  );

  if (!data || data.length === 0) {
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
      <div className="grid gap-3 px-3 md:grid-cols-2 xl:grid-cols-3">
        {displayData.map((c) => (
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
            onClick={handleShowAll}
            disabled={isPending}
          >
            {isPending
              ? "Đang tải..."
              : allData
                ? "Thu gọn"
                : `Hiển thị tất cả (${totalCount})`}
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
