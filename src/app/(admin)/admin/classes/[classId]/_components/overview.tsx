import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { type ClassStudentItem } from "@/lib/services/admin-classes-service";
import {
  formatCurrencyVN,
  formatDateRange,
  formatScheduleDays,
} from "@/lib/utils";
import { type Class, type Teacher } from "@/types";

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
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="border p-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{cls.name}</div>
          <Badge variant={cls.is_active ? "default" : "secondary"}>
            {cls.is_active ? "Hoạt động" : "Ngừng"}
          </Badge>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground">Lịch học</div>
            <div className="font-medium">
              {formatScheduleDays(cls.days_of_week)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Thời hạn</div>
            <div className="font-medium">
              {formatDateRange(cls.start_date, cls.end_date)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Học phí</div>
            <div className="font-medium">
              {formatCurrencyVN(cls.monthly_fee)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Lương/buổi</div>
            <div className="font-medium">
              {formatCurrencyVN(cls.salary_per_session)}
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t text-sm">
          <span className="text-muted-foreground">GV:</span> {teachers.length}
          <span className="mx-2">•</span>
          <span className="text-muted-foreground">HS:</span> {students.length}
        </div>
      </Card>

      <Card className="border p-3 hover:shadow-md hover:shadow-primary/20 transition-shadow">
        <div className="text-lg font-semibold">Ghi chú & nhanh</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Khu vực thao tác nhanh : thêm giáo viên, thêm học sinh, đánh dấu hết
          hạn, v.v.
        </div>
      </Card>
    </div>
  );
}
