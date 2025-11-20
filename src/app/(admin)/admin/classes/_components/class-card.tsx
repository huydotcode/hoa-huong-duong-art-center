"use client";

import { memo, useMemo } from "react";
import { UpdateClassForm } from "@/components/forms/update-class-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrencyVN, formatDateRange } from "@/lib/utils";
import { type ClassListItem } from "@/types";
import { Calendar, ClipboardCheck, Pencil } from "lucide-react";
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

  const capacityLabel = useMemo(() => {
    if (
      typeof c.current_student_count === "number" &&
      typeof c.max_student_count === "number" &&
      c.max_student_count > 0
    ) {
      return `${c.current_student_count}/${c.max_student_count} học sinh`;
    }
    return `${c.current_student_count ?? c.students_count} học sinh`;
  }, [c.current_student_count, c.max_student_count, c.students_count]);

  const handleAttendance = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams();
    params.set("classId", c.id);
    params.set("showAll", "true");
    router.push(`/admin/attendance?${params.toString()}`);
  };

  const handleCardClick = () => {
    router.push(`/admin/classes/${c.id}`);
  };

  const handlePreventNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const isFull =
    typeof c.current_student_count === "number" &&
    typeof c.max_student_count === "number" &&
    c.current_student_count >= c.max_student_count;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="border p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg flex flex-col gap-4 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Lớp học
          </p>
          <h3 className="text-lg font-semibold leading-tight line-clamp-2">
            {c.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatDateRange(c.start_date, c.end_date)}
          </p>
        </div>
        <Badge variant={c.is_active ? "default" : "secondary"}>
          {c.is_active ? "Hoạt động" : "Ngừng"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">Lịch học</p>
          <p className="text-base font-semibold">{scheduleCount} ca / tuần</p>
        </div>
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">Học phí</p>
          <p className="text-base font-semibold">
            {formatCurrencyVN(c.monthly_fee)}
          </p>
        </div>
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">Lương / buổi</p>
          <p className="text-base font-semibold">
            {formatCurrencyVN(c.salary_per_session)}
          </p>
        </div>
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">Giáo viên</p>
          <p className="text-base font-semibold">{c.teachers_count} người</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="space-y-1">
          <span className="block text-muted-foreground">Sĩ số</span>
          <span className="text-sm font-semibold text-foreground">
            {capacityLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Doanh thu dự kiến:</span>
          <span className="font-semibold text-foreground">
            {formatCurrencyVN((c.current_student_count ?? 0) * c.monthly_fee)}
          </span>
          {isFull && <Badge variant="destructive">Đã đầy</Badge>}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={handleAttendance}
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Điểm danh
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={(e) => onViewSchedule(c.id, e)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Xem lịch
        </Button>
        <UpdateClassForm classData={c}>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={handlePreventNavigation}
          >
            <Pencil className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        </UpdateClassForm>
      </div>
    </Card>
  );
}

export const ClassCard = memo(ClassCardComponent);
