"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getClasses } from "@/lib/services/admin-classes-service";
import { formatCurrencyVN, formatDateRange } from "@/lib/utils";
import { type ClassListItem } from "@/types";
import { Calendar, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { WeeklyScheduleCalendar } from "../[classId]/_components/weekly-schedule-calendar";

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
  const selectedClass = (allData ?? data).find((c) => c.id === selectedClassId);
  const router = useRouter();

  if (!data || data.length === 0) {
    return (
      <div className="px-3 pb-4 text-sm text-muted-foreground">
        Không có lớp học phù hợp.
      </div>
    );
  }

  const hasQuery = query.trim().length > 0;
  const displayData = allData ?? data;
  const hasMore = !hasQuery && totalCount > data.length;

  const handleShowAll = () => {
    if (allData) {
      setAllData(null);
    } else {
      startTransition(async () => {
        const fullData = await getClasses(query);
        setAllData(fullData);
      });
    }
  };

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
          <Link key={c.id} href={`/admin/classes/${c.id}`}>
            <Card className="border p-3 hover:shadow-md transition-shadow hover:bg-primary/10">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{c.name}</div>
                <Badge variant={c.is_active ? "default" : "secondary"}>
                  {c.is_active ? "Hoạt động" : "Ngừng"}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Lịch học</div>
                  <div className="font-medium">
                    {(() => {
                      try {
                        const daysOfWeek =
                          typeof c.days_of_week === "string"
                            ? JSON.parse(c.days_of_week)
                            : c.days_of_week;
                        const count = Array.isArray(daysOfWeek)
                          ? daysOfWeek.length
                          : 0;
                        return `${count} ca`;
                      } catch {
                        return "0 ca";
                      }
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Thời gian học</div>
                  <div className="font-medium">
                    {formatDateRange(c.start_date, c.end_date)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Học phí</div>
                  <div className="font-medium">
                    {formatCurrencyVN(c.monthly_fee)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Lương/buổi</div>
                  <div className="font-medium">
                    {formatCurrencyVN(c.salary_per_session)}
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-muted-foreground">GV:</span>{" "}
                    {c.teachers_count}
                    <span className="mx-2">•</span>
                    <span className="text-muted-foreground">HS:</span>{" "}
                    {c.current_student_count ?? c.students_count}/
                    {c.max_student_count ?? "-"}
                  </div>
                  {typeof c.current_student_count === "number" &&
                    typeof c.max_student_count === "number" &&
                    c.current_student_count >= c.max_student_count && (
                      <Badge variant="destructive">Đã đầy</Badge>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/admin/classes/${c.id}/attendance`);
                    }}
                  >
                    <ClipboardCheck className="h-3 w-3 mr-1" />
                    Điểm danh
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedClassId(c.id);
                    }}
                    className="h-7 text-xs"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Xem lịch
                  </Button>
                </div>
              </div>
            </Card>
          </Link>
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
              <WeeklyScheduleCalendar
                daysOfWeek={selectedClass.days_of_week}
                durationMinutes={selectedClass.duration_minutes}
                classData={selectedClass}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
