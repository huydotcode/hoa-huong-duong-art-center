import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type ClassStudentItem } from "@/lib/services/admin-classes-service";
import {
  formatDateRange,
  formatDurationHours,
  formatCurrencyVNDots,
} from "@/lib/utils";
import { type Class, type Teacher } from "@/types";
import { UpdateClassForm } from "@/components/forms/update-class-form";
import { Pencil } from "lucide-react";
import { WeeklyScheduleCalendar } from "./weekly-schedule-calendar";

export default function OverviewSection({
  cls,
  teachers,
  students,
}: {
  cls: Class;
  teachers: Teacher[];
  students: ClassStudentItem[];
}) {
  return (
    <>
      <div className="md:px-0">
        <Card className="border p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
            <div className="text-lg md:text-xl font-semibold wrap-break-word">
              {cls.name}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={cls.is_active ? "default" : "secondary"}>
                {cls.is_active ? "Hoạt động" : "Ngừng"}
              </Badge>
              <UpdateClassForm classData={cls}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Chỉnh sửa</span>
                </Button>
              </UpdateClassForm>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Thời gian học</div>
              <div className="font-medium mt-1 wrap-break-word">
                {formatDateRange(cls.start_date, cls.end_date)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Học phí</div>
              <div className="font-medium mt-1 wrap-break-word">
                {formatCurrencyVNDots(cls.monthly_fee)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Thời lượng</div>
              <div className="font-medium mt-1 wrap-break-word">
                {formatDurationHours(cls.duration_minutes)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Lương/buổi</div>
              <div className="font-medium mt-1 wrap-break-word">
                {formatCurrencyVNDots(cls.salary_per_session)}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-sm">
            <span className="text-muted-foreground">GV:</span> {teachers.length}
            <span className="mx-2">•</span>
            <span className="text-muted-foreground">HS:</span> {students.length}
          </div>
        </Card>
      </div>

      <Card className="mt-4 pt-4 border-t max-w-full mx-auto overflow-x-auto p-4">
        <div className="text-sm text-muted-foreground mb-2">Lịch học</div>
        <WeeklyScheduleCalendar
          daysOfWeek={cls.days_of_week}
          durationMinutes={cls.duration_minutes}
          classData={cls}
        />
      </Card>
    </>
  );
}
