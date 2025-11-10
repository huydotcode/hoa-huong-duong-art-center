import { getTeacherClasses } from "@/lib/services/teacher-classes-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateRange } from "@/lib/utils";
import { WeeklyScheduleCalendar } from "@/app/(admin)/admin/classes/[classId]/_components/weekly-schedule-calendar";

export default async function TeacherClassesPage() {
  const classes = await getTeacherClasses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Danh sách lớp học</h1>
        <p className="text-muted-foreground mt-1">
          Các lớp bạn đang phụ trách giảng dạy.
        </p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Bạn chưa được phân công lớp nào.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <Card key={cls.id} className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2">
                  <span>{cls.name || "Lớp chưa đặt tên"}</span>
                </CardTitle>
                <CardDescription>
                  {formatDateRange(cls.start_date, cls.end_date)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Thời khóa biểu
                  </div>
                  <WeeklyScheduleCalendar
                    daysOfWeek={cls.days_of_week}
                    durationMinutes={cls.duration_minutes}
                    readOnly
                  />
                </div>
                <div className="pt-1">
                  <span className="font-medium text-foreground">Sĩ số:</span>{" "}
                  <span className="text-muted-foreground">
                    {cls.current_student_count}/{cls.max_student_count}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
