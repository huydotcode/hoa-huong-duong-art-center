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
  useEffect,
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
  initialData,
  query,
  subject,
  totalCount,
  pageSize,
}: {
  initialData: ClassListItem[];
  query: string;
  subject: string;
  totalCount: number;
  pageSize: number;
}) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [items, setItems] = useState<ClassListItem[]>(initialData);
  const [offset, setOffset] = useState(initialData.length);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      setItems(initialData);
      setOffset(initialData.length);
    });
  }, [initialData, startTransition]);

  useEffect(() => {
    setSelectedClassId(null);
  }, [query, subject]);

  useEffect(() => {
    setSelectedClassId((prev) => {
      if (!prev) return prev;
      const exists = items.some((cls) => cls.id === prev);
      return exists ? prev : null;
    });
  }, [items]);

  const hasQuery = useMemo(() => query.trim().length > 0, [query]);
  const hasMore = useMemo(
    () => totalCount > items.length,
    [items.length, totalCount]
  );
  const selectedClass = useMemo(
    () => items.find((c) => c.id === selectedClassId) ?? null,
    [items, selectedClassId]
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isPending) return;
    startTransition(async () => {
      const nextItems = await getClasses(query, {
        subject: subject || undefined,
        limit: pageSize,
        offset,
      });
      setItems((prev) => {
        const existingIds = new Set(prev.map((cls) => cls.id));
        const merged = [...prev];
        for (const item of nextItems) {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        }
        return merged;
      });
      setOffset((prev) => prev + nextItems.length);
    });
  }, [hasMore, isPending, offset, pageSize, query, subject]);

  const handleViewSchedule = useCallback(
    (classId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedClassId(classId);
    },
    []
  );

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
      <div className="grid gap-3 px-3 md:grid-cols-2 xl:grid-cols-3">
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
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending
              ? "Đang tải..."
              : `Hiển thị thêm (${Math.max(totalCount - items.length, 0)})`}
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
