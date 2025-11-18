"use client";

import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrencyVN, formatDateRange } from "@/lib/utils";
import { type ClassListItem } from "@/types";
import { Calendar, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClassCardProps {
  classItem: ClassListItem;
  onViewSchedule: (classId: string, e: React.MouseEvent) => void;
}

function ClassCardComponent({ classItem: c, onViewSchedule }: ClassCardProps) {
  const router = useRouter();

  // Memoize schedule count calculation
  const scheduleCount = useMemo(() => {
    try {
      const daysOfWeek =
        typeof c.days_of_week === "string"
          ? JSON.parse(c.days_of_week)
          : c.days_of_week;
      return Array.isArray(daysOfWeek) ? daysOfWeek.length : 0;
    } catch {
      return 0;
    }
  }, [c.days_of_week]);

  const handleAttendance = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/admin/classes/${c.id}/attendance`);
  };

  const isFull =
    typeof c.current_student_count === "number" &&
    typeof c.max_student_count === "number" &&
    c.current_student_count >= c.max_student_count;

  return (
    <Link href={`/admin/classes/${c.id}`}>
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
            <div className="font-medium">{scheduleCount} ca</div>
          </div>
          <div>
            <div className="text-muted-foreground">Thời gian học</div>
            <div className="font-medium">
              {formatDateRange(c.start_date, c.end_date)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Học phí</div>
            <div className="font-medium">{formatCurrencyVN(c.monthly_fee)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Lương/buổi</div>
            <div className="font-medium">
              {formatCurrencyVN(c.salary_per_session)}
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <span className="text-muted-foreground">GV:</span>{" "}
                {c.teachers_count}
              </div>
              <span className="hidden sm:inline">•</span>
              <div>
                <span className="text-muted-foreground">HS:</span>{" "}
                {c.current_student_count ?? c.students_count}/
                {c.max_student_count ?? "-"}
              </div>
              <span className="hidden sm:inline">•</span>
              <div>
                <span className="text-muted-foreground">Doanh thu:</span>{" "}
                <span className="font-semibold">
                  {formatCurrencyVN(
                    (c.current_student_count ?? 0) * c.monthly_fee
                  )}{" "}
                  (dự kiến)
                </span>
              </div>
              {isFull && <Badge variant="destructive">Đã đầy</Badge>}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleAttendance}
              >
                <ClipboardCheck className="h-3 w-3 mr-1" />
                Điểm danh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => onViewSchedule(c.id, e)}
                className="h-7 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Xem lịch
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export const ClassCard = memo(ClassCardComponent);
