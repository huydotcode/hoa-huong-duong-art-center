import { getStats, getRevenueData } from "@/lib/services/admin-stats-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChartsSection from "@/components/shared/charts/charts-section";
import { CreateAdminForm } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default async function DashboardPage() {
  const stats = await getStats();
  const revenueData = await getRevenueData();

  // Lấy 3 tháng liền kề gần nhất (tháng hiện tại và 2 tháng trước)
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Tạo danh sách 3 tháng gần nhất (từ cũ đến mới)
  const targetMonths: string[] = [];
  for (let i = 2; i >= 0; i--) {
    let month = currentMonth - i;
    let year = currentYear;

    // Xử lý trường hợp tháng < 1 (lùi về năm trước)
    while (month < 1) {
      month += 12;
      year -= 1;
    }

    targetMonths.push(`${month}/${year}`);
  }

  // Tạo Map để tra cứu nhanh
  const dataMap = new Map(revenueData.map((item) => [item.month, item]));

  // Lấy dữ liệu cho 3 tháng, nếu không có thì tạo object rỗng
  const sortedAndFiltered = targetMonths.map((monthKey) => {
    const existing = dataMap.get(monthKey);
    if (existing) {
      return existing;
    }
    // Nếu không có dữ liệu, trả về object với giá trị 0
    return {
      month: monthKey,
      newStudents: 0,
      leftStudents: 0,
      revenue: 0,
      expenses: 0,
      profit: 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tổng quan</h1>
        </div>
        <CreateAdminForm>
          <Button className="self-start md:self-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Tạo tài khoản admin
          </Button>
        </CreateAdminForm>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tổng số giáo viên</p>
                <p className="text-2xl font-bold">{stats.teachers}</p>
                <p className="text-xs text-muted-foreground">
                  Giáo viên đang hoạt động
                </p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-8 w-8 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tổng số học sinh</p>
                <p className="text-2xl font-bold">{stats.students}</p>
                <p className="text-xs text-muted-foreground">
                  Học sinh đang theo học
                </p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-8 w-8 text-muted-foreground"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tổng số lớp học</p>
                <p className="text-2xl font-bold">{stats.classes}</p>
                <p className="text-xs text-muted-foreground">
                  Lớp học đang hoạt động
                </p>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-8 w-8 text-muted-foreground"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 1-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 3 3h7z" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly visuals */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê theo tháng</CardTitle>
        </CardHeader>

        {/* Charts (responsive for all breakpoints) */}
        <CardContent className="p-2 md:p-4">
          <ChartsSection
            studentsData={sortedAndFiltered.map((r) => ({
              month: r.month,
              newStudents: r.newStudents,
              leftStudents: r.leftStudents,
            }))}
            financeData={sortedAndFiltered.map((r) => ({
              month: r.month,
              revenue: r.revenue,
              expenses: r.expenses,
              profit: r.profit,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
