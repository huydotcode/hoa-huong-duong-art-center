import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { type ClassListItem } from "@/lib/services/admin-classes-service";
import {
  formatCurrencyVN,
  formatDateRange,
  formatScheduleDays,
} from "@/lib/utils";
import Link from "next/link";

export default function ClassesList({
  data,
  query,
}: {
  data: ClassListItem[];
  query: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="px-3 pb-4 text-sm text-muted-foreground">
        Không có lớp học phù hợp.
      </div>
    );
  }

  return (
    <div className="pb-3">
      {query.trim().length > 0 && (
        <div className="px-3 pb-2 text-sm text-muted-foreground">
          Đang lọc theo: &ldquo;{query}&rdquo;
        </div>
      )}
      {/* Cards - responsive grid */}
      <div className="grid gap-3 px-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((c) => (
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
                    {formatScheduleDays(c.days_of_week)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Thời hạn</div>
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
              <div className="mt-2 pt-2 border-t text-sm">
                <span className="text-muted-foreground">GV:</span>{" "}
                {c.teachers_count}
                <span className="mx-2">•</span>
                <span className="text-muted-foreground">HS:</span>{" "}
                {c.students_count}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
