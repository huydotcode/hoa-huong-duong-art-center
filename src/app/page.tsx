import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-4xl text-center">
        {/* Logo và Title */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <Image
            src="/assets/images/logo.png"
            alt="Hoa Hướng Dương"
            width={80}
            height={80}
            className="h-20 w-20 rounded-lg"
          />
          <h1 className="text-4xl font-bold text-primary">Hoa Hướng Dương</h1>
        </div>

        {/* Welcome Message */}
        <div className="mb-8 space-y-4">
          <h2 className="text-3xl font-semibold text-foreground">
            Chào mừng đến với Hệ thống Quản lý Piano
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Quản lý giáo viên, học sinh, lớp học và tài chính một cách hiệu quả
            với giao diện thân thiện và hiện đại
          </p>
        </div>

        {/* Features Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="mb-4 text-4xl">👨‍🏫</div>
              <h3 className="mb-2 font-semibold">Quản lý Giáo viên</h3>
              <p className="text-sm text-muted-foreground">
                Quản lý thông tin, lịch dạy và tính lương
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="mb-4 text-4xl">🎵</div>
              <h3 className="mb-2 font-semibold">Quản lý Lớp học</h3>
              <p className="text-sm text-muted-foreground">
                Tổ chức lớp học và theo dõi học phí
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="mb-4 text-4xl">📊</div>
              <h3 className="mb-2 font-semibold">Báo cáo Tài chính</h3>
              <p className="text-sm text-muted-foreground">
                Thống kê doanh thu, chi phí và lợi nhuận
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
