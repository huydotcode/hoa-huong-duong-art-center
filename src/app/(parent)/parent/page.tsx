"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { formatEnrollmentStatus, toArray } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getActiveClasses,
  getStudentById,
  searchStudent,
  type ParentStudentInfo,
  type ClassOption,
} from "@/lib/services/parent-service";

const STORAGE_KEY = "parent_last_student_id";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [studentName, setStudentName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState<ParentStudentInfo | null>(
    null
  );
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Typed helpers for relation arrays
  type EnrollmentItem = {
    class_id: string;
    status: "trial" | "active" | "inactive";
    score_1?: number | null;
    score_2?: number | null;
    score_3?: number | null;
    teacher_notes?: string | null;
    classes?:
      | {
          name: string;
          start_date: string;
          end_date: string;
          days_of_week: unknown;
        }
      | {
          name: string;
          start_date: string;
          end_date: string;
          days_of_week: unknown;
        }[];
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classes = await getActiveClasses();
        setClassOptions(classes);
      } catch (err) {
        console.error("Fetch classes error:", err);
        toast.error("Không thể tải danh sách lớp. Vui lòng thử lại sau.");
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []);

  // Function để load thông tin học sinh theo ID (load tất cả enrollments)
  const loadStudentById = async (studentId: string, saveToStorage = true) => {
    setLoading(true);
    try {
      const student = await getStudentById(studentId);
      if (!student) {
        toast.error("Không tìm thấy học sinh.");
        setStudentInfo(null);
        // Xóa localStorage nếu học sinh không tồn tại
        if (saveToStorage) {
          localStorage.removeItem(STORAGE_KEY);
        }
        return;
      }
      setStudentInfo(student);
      // Lưu vào localStorage
      if (saveToStorage) {
        localStorage.setItem(STORAGE_KEY, studentId);
      }
      toast.success("Tìm thấy thông tin học sinh!");
    } catch (error) {
      console.error("Load student error:", error);
      toast.error("Đã xảy ra lỗi khi tải thông tin học sinh");
      setStudentInfo(null);
      // Xóa localStorage nếu có lỗi
      if (saveToStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } finally {
      setLoading(false);
    }
  };

  // Tự động load khi có studentId trong URL hoặc localStorage
  useEffect(() => {
    const urlStudentId = searchParams.get("studentId");

    // Ưu tiên studentId từ URL
    if (urlStudentId) {
      loadStudentById(urlStudentId);
      return;
    }

    // Nếu không có trong URL, kiểm tra localStorage
    if (typeof window !== "undefined") {
      const savedStudentId = localStorage.getItem(STORAGE_KEY);
      if (savedStudentId && savedStudentId.trim()) {
        loadStudentById(savedStudentId);
      }
    }
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = studentName.trim();
    if (trimmedQuery.length === 0) {
      toast.error("Vui lòng nhập tên học sinh");
      setStudentInfo(null);
      return;
    }
    if (!selectedClassId) {
      toast.error("Vui lòng chọn lớp trước khi tìm kiếm");
      setStudentInfo(null);
      return;
    }
    setLoading(true);

    try {
      const student = await searchStudent(trimmedQuery, selectedClassId);
      if (!student) {
        toast.error(
          "Không tìm thấy học sinh. Vui lòng kiểm tra lại thông tin."
        );
        setStudentInfo(null);
        return;
      }
      setStudentInfo(student);
      // Lưu studentId vào localStorage
      localStorage.setItem(STORAGE_KEY, student.id);
      toast.success("Tìm thấy thông tin học sinh!");
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Đã xảy ra lỗi khi tìm kiếm");
      setStudentInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAndSearchNew = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStudentInfo(null);
    setStudentName("");
    setSelectedClassId("");
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
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
              <Label htmlFor="classSelect">Lớp học</Label>
              <Select
                value={selectedClassId}
                onValueChange={(value) => setSelectedClassId(value)}
                disabled={loadingClasses}
              >
                <SelectTrigger id="classSelect" className="w-full">
                  <SelectValue
                    placeholder={loadingClasses ? "Đang tải..." : "Chọn lớp"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.length === 0 && (
                    <SelectItem value="__empty__" disabled>
                      Không có lớp khả dụng
                    </SelectItem>
                  )}
                  {classOptions.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Button
              type="submit"
              className="w-full"
              disabled={loading || loadingClasses || classOptions.length === 0}
            >
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Đang tìm kiếm..." : "Tìm kiếm"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {studentInfo && (
        <Card className="mt-6 w-full">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <CardTitle>Thông tin học sinh</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAndSearchNew}
              >
                <X className="mr-2 h-4 w-4" />
                Tìm học sinh khác
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Họ và tên</Label>
                <p className="text-sm font-medium">{studentInfo.full_name}</p>
              </div>
              <div>
                <Label className="text-xs">Số điện thoại</Label>
                <p className="text-sm font-medium">
                  {studentInfo.phone || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs">Số điện thoại phụ huynh</Label>
                <p className="text-sm font-medium">
                  {studentInfo.parent_phone || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs">Trạng thái</Label>
                <p className="text-sm font-medium">
                  {studentInfo.is_active ? "Đang học" : "Ngừng học"}
                </p>
              </div>
            </div>
            {/* Lớp / điểm dạng bảng */}
            {toArray<EnrollmentItem>(studentInfo.enrollments || []).length >
              0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Lớp / điểm</h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left min-w-[200px]">
                          Lớp
                        </th>
                        <th className="px-3 py-2 text-left min-w-[120px]">
                          Trạng thái
                        </th>
                        <th className="px-3 py-2 text-center w-[90px]">
                          Điểm 1
                        </th>
                        <th className="px-3 py-2 text-center w-[90px]">
                          Điểm 2
                        </th>
                        <th className="px-3 py-2 text-center w-[90px]">
                          Điểm 3
                        </th>
                        <th className="px-3 py-2 text-center w-[100px]">
                          Điểm TB
                        </th>
                        <th className="px-3 py-2 text-center min-w-[160px]">
                          Đi học (tháng này)
                        </th>
                        <th className="px-3 py-2 text-left min-w-[200px]">
                          Nhận xét của giáo viên
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {toArray<EnrollmentItem>(
                        studentInfo.enrollments || []
                      ).map((en) => {
                        const cls = Array.isArray(en.classes)
                          ? en.classes[0]
                          : en.classes;
                        const scores = [
                          en.score_1,
                          en.score_2,
                          en.score_3,
                        ].filter((s): s is number => typeof s === "number");
                        const avg =
                          scores.length > 0
                            ? Number(
                                (
                                  scores.reduce((sum, s) => sum + s, 0) /
                                  scores.length
                                ).toFixed(1)
                              )
                            : null;
                        const att = studentInfo.attendanceStats?.[en.class_id];
                        const attText =
                          att && att.total > 0
                            ? `${att.present}/${att.total} buổi`
                            : "-";
                        const attClass =
                          att && att.total > 0 && att.present / att.total >= 0.8
                            ? "text-emerald-600"
                            : "text-amber-600";
                        return (
                          <tr key={en.class_id} className="border-t">
                            <td className="px-3 py-2">
                              {cls?.name || "Lớp chưa đặt tên"}
                            </td>
                            <td className="px-3 py-2">
                              {formatEnrollmentStatus(en.status)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {en.score_1 ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {en.score_2 ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {en.score_3 ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {avg ?? "-"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={att ? attClass : ""}>
                                {attText}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {en.teacher_notes || "-"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
