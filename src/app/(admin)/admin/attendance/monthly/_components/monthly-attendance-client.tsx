"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatEnrollmentStatus } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type {
  MonthlyAttendanceClassMatrix,
  MonthlyAttendanceMatrixResult,
} from "@/lib/services/admin-attendance-service";
import { fetchMonthlyAttendanceMatrixAction } from "../_actions";

const monthOptions = Array.from({ length: 12 }).map((_, index) => {
  const month = index + 1;
  return { value: String(month), label: `Tháng ${month}` };
});

const weekdayLabels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const formatDateLabel = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

type MonthlyAttendanceClientProps = {
  initialMonth: number;
  initialYear: number;
  initialData: MonthlyAttendanceMatrixResult;
  initialClassId?: string | null;
};

export default function MonthlyAttendanceClient({
  initialMonth,
  initialYear,
  initialData,
  initialClassId = null,
}: MonthlyAttendanceClientProps) {
  const [data, setData] = useState(initialData);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [yearField, setYearField] = useState(String(initialYear));
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId ?? "all"
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setYearField(String(currentYear));
  }, [currentYear]);

  useEffect(() => {
    if (selectedClassId === "all") return;
    const exists = data.classes.some((cls) => cls.classId === selectedClassId);
    if (!exists) {
      setSelectedClassId("all");
    }
  }, [data.classes, selectedClassId]);

  const loadData = useCallback(
    (month: number, year: number) => {
      const safeMonth = Math.min(12, Math.max(1, month));
      const safeYear = Math.max(2000, Math.min(2100, year));
      if (safeMonth === currentMonth && safeYear === currentYear) {
        return;
      }
      startTransition(() => {
        fetchMonthlyAttendanceMatrixAction({
          month: safeMonth,
          year: safeYear,
        })
          .then((result) => {
            setData(result);
            setCurrentMonth(safeMonth);
            setCurrentYear(safeYear);
          })
          .catch(() => {
            toast.error("Không thể tải dữ liệu tháng, vui lòng thử lại.");
          });
      });
    },
    [currentMonth, currentYear, startTransition]
  );

  const handleMonthNavigate = (delta: number) => {
    const nextDate = new Date(
      Date.UTC(currentYear, currentMonth - 1 + delta, 1)
    );
    const nextMonth = nextDate.getUTCMonth() + 1;
    const nextYear = nextDate.getUTCFullYear();
    loadData(nextMonth, nextYear);
  };

  const handleMonthSelect = (value: string) => {
    const numericMonth = Number(value);
    if (Number.isFinite(numericMonth)) {
      loadData(numericMonth, currentYear);
    }
  };

  const handleApplyYear = () => {
    const numericYear = Number(yearField);
    if (!Number.isFinite(numericYear)) {
      toast.error("Năm không hợp lệ.");
      return;
    }
    loadData(currentMonth, numericYear);
  };

  const classOptions = useMemo(() => {
    return data.classes
      .map((cls) => ({
        value: cls.classId,
        label: cls.className || "Lớp chưa đặt tên",
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "vi", { sensitivity: "base" })
      );
  }, [data.classes]);

  const filteredClasses = useMemo(() => {
    if (selectedClassId === "all") return data.classes;
    return data.classes.filter((cls) => cls.classId === selectedClassId);
  }, [data.classes, selectedClassId]);

  const classStats = useMemo(() => {
    const stats = new Map<
      string,
      { present: number; absent: number; pending: number }
    >();
    data.classes.forEach((cls) => {
      let present = 0;
      let absent = 0;
      cls.students.forEach((student) => {
        cls.sessions.forEach((session) => {
          const cell =
            data.attendanceMap[`${cls.classId}||${student.id}||${session.id}`];
          if (cell?.isPresent === true) present += 1;
          else if (cell?.isPresent === false) absent += 1;
        });
      });
      const totalCells = cls.students.length * cls.sessions.length;
      stats.set(cls.classId, {
        present,
        absent,
        pending: Math.max(totalCells - (present + absent), 0),
      });
    });
    return stats;
  }, [data]);

  const totalCells = useMemo(() => {
    return data.classes.reduce(
      (sum, cls) => sum + cls.sessions.length * cls.students.length,
      0
    );
  }, [data.classes]);

  const pendingTotal = Math.max(
    totalCells - (data.meta.presentCount + data.meta.absentCount),
    0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleMonthNavigate(-1)}
              disabled={isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select
              value={String(currentMonth)}
              onValueChange={handleMonthSelect}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={2000}
                max={2100}
                value={yearField}
                onChange={(event) => setYearField(event.target.value)}
                className="w-[110px]"
                disabled={isPending}
              />
              <Button
                variant="secondary"
                onClick={handleApplyYear}
                disabled={isPending}
              >
                Áp dụng
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleMonthNavigate(1)}
              disabled={isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {isPending && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={selectedClassId}
              onValueChange={(value) => setSelectedClassId(value)}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Chọn lớp" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px]">
                <SelectItem value="all">Tất cả lớp</SelectItem>
                {classOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClassId !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClassId("all")}
              >
                Xoá lọc
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Tổng số lớp" value={data.meta.totalClasses} />
            <StatsCard title="Tổng buổi" value={data.meta.totalSessions} />
            <StatsCard title="Có mặt" value={data.meta.presentCount} />
            <StatsCard title="Vắng" value={data.meta.absentCount} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Tổng học sinh" value={data.meta.totalStudents} />
            <StatsCard title="Chưa chấm" value={pendingTotal} />
            <StatsCard
              title="Tỉ lệ có mặt"
              value={
                totalCells > 0
                  ? `${Math.round((data.meta.presentCount / totalCells) * 100)}%`
                  : "--"
              }
            />
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Truy cập nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Button variant="link" className="px-0" asChild>
                    <Link href="/admin/attendance">Điểm danh hằng ngày</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {filteredClasses.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Không có lớp nào trong tháng {currentMonth}/{currentYear}.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredClasses.map((cls) => (
            <ClassMonthlyMatrix
              key={`${cls.classId}-${currentMonth}-${currentYear}`}
              data={cls}
              attendanceMap={data.attendanceMap}
              stats={classStats.get(cls.classId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type StatsCardProps = {
  title: string;
  value: number | string;
};

function StatsCard({ title, value }: StatsCardProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-1">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {title}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

type ClassMonthlyMatrixProps = {
  data: MonthlyAttendanceClassMatrix;
  attendanceMap: MonthlyAttendanceMatrixResult["attendanceMap"];
  stats?: { present: number; absent: number; pending: number };
};

function ClassMonthlyMatrix({
  data,
  attendanceMap,
  stats,
}: ClassMonthlyMatrixProps) {
  const hasSessions = data.sessions.length > 0;
  const hasStudents = data.students.length > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-2">
        <div>
          <CardTitle className="text-xl font-semibold">
            {data.className}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {data.teacherNames.length > 0
              ? `Giáo viên: ${data.teacherNames.join(", ")}`
              : "Chưa phân công giáo viên"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">Buổi: {data.sessions.length}</Badge>
          <Badge variant="secondary">Học sinh: {data.students.length}</Badge>
          {stats && (
            <Badge variant="outline">
              Có: {stats.present} • Vắng: {stats.absent} • Chưa chấm:{" "}
              {stats.pending}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasSessions || !hasStudents ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Chưa có lịch hoặc học sinh trong tháng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr>
                  <th className="pl-4 bg-background text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Học sinh
                  </th>
                  {data.sessions.map((session) => (
                    <th
                      key={session.id}
                      className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      <div>{formatDateLabel(session.date)}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {weekdayLabels[session.weekday]} • {session.sessionTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.id} className="border-t">
                    <td className="pl-4 bg-background py-2 pr-4 text-sm font-medium min-w-[200px]">
                      <div>{student.fullName}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {formatEnrollmentStatus(student.status)}
                      </div>
                    </td>
                    {data.sessions.map((session) => {
                      const cellKey = `${data.classId}||${student.id}||${session.id}`;
                      const cell = attendanceMap[cellKey];
                      return (
                        <td
                          key={session.id}
                          className="px-2 py-2 text-center align-middle min-w-[100px]"
                        >
                          <AttendanceCell
                            status={cell?.isPresent}
                            note={cell?.notes}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type AttendanceCellProps = {
  status: boolean | null | undefined;
  note?: string | null;
};

function AttendanceCell({ status, note }: AttendanceCellProps) {
  if (status === true) {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
          Có mặt
        </span>
        {note ? (
          <p className="text-[10px] text-muted-foreground block max-w-[120px] truncate">
            {note}
          </p>
        ) : null}
      </div>
    );
  }
  if (status === false) {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
          Vắng
        </span>
        {note ? (
          <p className="text-[10px] text-muted-foreground block max-w-[120px] truncate">
            {note}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
        --
      </span>
      {note ? (
        <p className="text-[10px] text-muted-foreground block max-w-[120px] truncate">
          {note}
        </p>
      ) : null}
    </div>
  );
}
