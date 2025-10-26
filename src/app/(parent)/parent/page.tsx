"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface StudentInfo {
  id: string;
  full_name: string;
  phone: string;
  parent_phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SearchPage() {
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    try {
      // Tìm kiếm học sinh theo tên
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .ilike("full_name", `%${studentName}%`)
        .maybeSingle();

      if (error) {
        console.error("Search error:", error);
        toast.error("Đã xảy ra lỗi khi tìm kiếm");
        return;
      }

      if (!data) {
        toast.error(
          "Không tìm thấy học sinh. Vui lòng kiểm tra lại thông tin."
        );
        setStudentInfo(null);
        return;
      }

      setStudentInfo(data);
      toast.success("Tìm thấy thông tin học sinh!");
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Đã xảy ra lỗi khi tìm kiếm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-xl font-bold">Tra cứu thông tin học sinh</h1>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Thông tin tìm kiếm</CardTitle>
          <CardDescription>Vui lòng nhập tên học sinh</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">Tên học sinh</Label>
              <Input
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Đang tìm kiếm..." : "Tìm kiếm"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {studentInfo && (
        <Card className="mt-6 w-full">
          <CardHeader>
            <CardTitle>Thông tin học sinh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Họ và tên</Label>
                <p className="text-sm font-medium">{studentInfo.full_name}</p>
              </div>
              <div>
                <Label className="text-xs">Số điện thoại</Label>
                <p className="text-sm font-medium">{studentInfo.phone}</p>
              </div>
              <div>
                <Label className="text-xs">Số điện thoại phụ huynh</Label>
                <p className="text-sm font-medium">
                  {studentInfo.parent_phone}
                </p>
              </div>
              <div>
                <Label className="text-xs">Trạng thái</Label>
                <p className="text-sm font-medium">
                  {studentInfo.is_active ? "Đang học" : "Ngừng học"}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                💡 Lưu ý: Thông tin chi tiết về lớp học, điểm danh và học phí sẽ
                được cập nhật sau.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
