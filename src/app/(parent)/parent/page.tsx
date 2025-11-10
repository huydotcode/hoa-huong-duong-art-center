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
import { normalizeText, formatEnrollmentStatus, toArray } from "@/lib/utils";

interface StudentInfo {
  id: string;
  full_name: string;
  phone: string | null;
  parent_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  enrollments?: Array<{
    class_id: string;
    status: "trial" | "active" | "inactive";
    score_1?: number | null;
    score_2?: number | null;
    score_3?: number | null;
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
  }>;
  payments?: Array<{
    class_id: string;
    month: number;
    year: number;
    is_paid: boolean;
    amount: number | null;
  }>;
  attendanceStats?: Record<string, { present: number; total: number }>;
}

export default function SearchPage() {
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  // Typed helpers for relation arrays
  type EnrollmentItem = {
    class_id: string;
    status: "trial" | "active" | "inactive";
    score_1?: number | null;
    score_2?: number | null;
    score_3?: number | null;
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
  // Payment removed per request

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = studentName.trim();
    if (trimmedQuery.length === 0) {
      toast.error("Vui lòng nhập tên học sinh");
      setStudentInfo(null);
      return;
    }
    setLoading(true);

    const supabase = createClient();

    try {
      // Query toàn bộ, sau đó filter client-side với normalizeText
      const { data, error } = await supabase.from("students").select(
        `
          id,
          full_name,
          phone,
          parent_phone,
          is_active,
          created_at,
          updated_at,
          enrollments:student_class_enrollments(
            class_id,
            status,
            classes(
              name,
              start_date,
              end_date,
              days_of_week
            )
          ),
          payments:payment_status(
            class_id,
            month,
            year,
            is_paid,
            amount
          )
        `
      );

      if (error) {
        console.error("Search error:", error);
        toast.error("Đã xảy ra lỗi khi tìm kiếm");
        setStudentInfo(null);
        return;
      }

      if (!data || data.length === 0) {
        toast.error(
          "Không tìm thấy học sinh. Vui lòng kiểm tra lại thông tin."
        );
        setStudentInfo(null);
        return;
      }

      const normalizedQuery = normalizeText(trimmedQuery);
      // Lọc client-side theo tên không dấu
      const filtered = data.filter((s) =>
        normalizeText(s.full_name || "").includes(normalizedQuery)
      );
      const preferred = filtered[0] || null;

      if (!preferred) {
        toast.error(
          "Không tìm thấy học sinh. Vui lòng kiểm tra lại thông tin."
        );
        setStudentInfo(null);
        return;
      }

      const studentId = preferred.id;

      const [enrollmentsRes] = await Promise.all([
        supabase
          .from("student_class_enrollments")
          .select(
            `
            class_id,
            status,
            score_1,
            score_2,
            score_3,
            classes(
              name,
              start_date,
              end_date,
              days_of_week
            )
          `
          )
          .eq("student_id", studentId),
      ]);

      console.log({ enrollmentsRes });

      if (enrollmentsRes.error) {
        console.error("Fetch enrollments error:", enrollmentsRes.error);
        toast.warning("Không thể tải thông tin lớp học của học sinh.");
      }

      // Attendance stats for current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const startISO = monthStart.toISOString().slice(0, 10);
      const endISO = nextMonthStart.toISOString().slice(0, 10);

      const { data: attendanceRows, error: attendanceError } = await supabase
        .from("attendance")
        .select("class_id, is_present, attendance_date")
        .eq("student_id", studentId)
        .gte("attendance_date", startISO)
        .lt("attendance_date", endISO);

      if (attendanceError) {
        console.error("Fetch attendance error:", attendanceError);
      }

      const attendanceStats: Record<
        string,
        { present: number; total: number }
      > = {};
      (attendanceRows || []).forEach(
        (row: { class_id: string; is_present: boolean }) => {
          const classId = String(row.class_id || "");
          if (!attendanceStats[classId]) {
            attendanceStats[classId] = { present: 0, total: 0 };
          }
          attendanceStats[classId].total += 1;
          if (row.is_present === true) {
            attendanceStats[classId].present += 1;
          }
        }
      );

      const enriched: StudentInfo = {
        id: preferred.id as string,
        full_name: String(preferred.full_name || ""),
        phone: preferred.phone ?? null,
        parent_phone: preferred.parent_phone ?? null,
        is_active: Boolean(preferred.is_active),
        created_at: String(preferred.created_at),
        updated_at: String(preferred.updated_at),
        enrollments: (enrollmentsRes.data ?? []) as EnrollmentItem[],
        payments: [], // not used
        attendanceStats,
      };

      setStudentInfo(enriched);
      toast.success("Tìm thấy thông tin học sinh!");
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Đã xảy ra lỗi khi tìm kiếm");
      setStudentInfo(null);
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
            {toArray<EnrollmentItem>(studentInfo.enrollments || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Lớp / điểm</h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left min-w-[200px]">Lớp</th>
                        <th className="px-3 py-2 text-left min-w-[120px]">Trạng thái</th>
                        <th className="px-3 py-2 text-center w-[90px]">Điểm 1</th>
                        <th className="px-3 py-2 text-center w-[90px]">Điểm 2</th>
                        <th className="px-3 py-2 text-center w-[90px]">Điểm 3</th>
                        <th className="px-3 py-2 text-center w-[100px]">Điểm TB</th>
                        <th className="px-3 py-2 text-center min-w-[160px]">Đi học (tháng này)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toArray<EnrollmentItem>(studentInfo.enrollments || []).map((en) => {
                        const cls = Array.isArray(en.classes) ? en.classes[0] : en.classes;
                        const scores = [en.score_1, en.score_2, en.score_3].filter(
                          (s): s is number => typeof s === "number"
                        );
                        const avg =
                          scores.length > 0
                            ? Number((scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1))
                            : null;
                        const att = studentInfo.attendanceStats?.[en.class_id];
                        const attText =
                          att && att.total > 0 ? `${att.present}/${att.total} buổi` : "-";
                        const attClass =
                          att && att.total > 0 && att.present / att.total >= 0.8
                            ? "text-emerald-600"
                            : "text-amber-600";
                        return (
                          <tr key={en.class_id} className="border-t">
                            <td className="px-3 py-2">{cls?.name || "Lớp chưa đặt tên"}</td>
                            <td className="px-3 py-2">{formatEnrollmentStatus(en.status)}</td>
                            <td className="px-3 py-2 text-center">{en.score_1 ?? "-"}</td>
                            <td className="px-3 py-2 text-center">{en.score_2 ?? "-"}</td>
                            <td className="px-3 py-2 text-center">{en.score_3 ?? "-"}</td>
                            <td className="px-3 py-2 text-center">{avg ?? "-"}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={att ? attClass : ""}>{attText}</span>
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
