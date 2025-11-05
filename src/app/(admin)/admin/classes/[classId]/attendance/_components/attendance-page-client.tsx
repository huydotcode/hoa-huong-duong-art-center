"use client";

import { AttendanceCombinedMatrix } from "@/components/shared/attendance/attendance-combined-matrix";
import { AttendanceDateToolbarClient } from "@/components/shared/attendance/attendance-date-toolbar-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import {
  useAttendanceQuery,
  useTeacherAttendanceQuery,
} from "@/lib/hooks/use-attendance";
import { useClassQuery, useClassStudentsQuery } from "@/lib/hooks/use-class";
import { getClassTeachers } from "@/lib/services/admin-classes-service";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AttendanceLoadingSkeleton } from "./attendance-loading-skeleton";

type DayItem = { day: number; start_time: string; end_time?: string };

function getSessionsForDate(daysOfWeek: unknown, date: string): string[] {
  try {
    const arr: DayItem[] = Array.isArray(daysOfWeek)
      ? (daysOfWeek as DayItem[])
      : typeof daysOfWeek === "string"
        ? (JSON.parse(daysOfWeek) as DayItem[])
        : [];
    const dt = new Date(date);
    const day = dt.getDay();
    return arr.filter((d) => d?.day === day).map((d) => d.start_time);
  } catch {
    return [];
  }
}

export default function AttendancePageClient({ classId }: { classId: string }) {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  // session param is ignored in this view (show all sessions)

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;
  const date = dateParam || defaultDate;

  const { data: cls, isLoading: classLoading } = useClassQuery(classId);
  const { data: studentItems, isLoading: studentsLoading } =
    useClassStudentsQuery(classId);
  const { data: attendanceMapBySession } = useAttendanceQuery(classId, date);
  const { data: teacherAttendanceMapBySession } = useTeacherAttendanceQuery(
    classId,
    date
  );

  const { data: teacherItems, isLoading: teachersLoading } = useQuery({
    queryKey: ["class-teachers", classId],
    queryFn: () => getClassTeachers(classId),
    enabled: !!classId,
  });

  // Collapsible teacher matrix (legacy; reserved for future use)
  // Filter: all/teacher/student for combined matrix
  const [filterMode, setFilterMode] = useState<"all" | "teacher" | "student">(
    "all"
  );
  // Session filter: "all" or a specific session_time
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Always show all sessions

  // External bulk buttons control (from combined matrix)
  const externalBulkMarkRef = useRef<(present: boolean) => void>(() => {});
  const [externalBulkDisabled, setExternalBulkDisabled] = useState(true);

  if (classLoading || studentsLoading || teachersLoading) {
    return <AttendanceLoadingSkeleton />;
  }

  if (!cls) {
    return (
      <div className="px-0">
        <Card className="p-3 lg:p-4">
          <div className="text-sm text-muted-foreground">
            Không tìm thấy lớp
          </div>
        </Card>
      </div>
    );
  }

  const sessions = getSessionsForDate(cls.days_of_week, date);
  const visibleSessions = (() => {
    const base =
      sessionFilter === "all"
        ? sessions
        : sessions.filter((s) => s === sessionFilter);
    if (isMobile) {
      return base.slice(0, 1);
    }
    return base;
  })();

  const students =
    studentItems?.map((i) => ({
      id: i.student.id,
      full_name: i.student.full_name,
      phone: i.student.phone,
    })) || [];

  const teachers =
    teacherItems?.map((i) => ({
      id: i.teacher.id,
      full_name: i.teacher.full_name,
      phone: i.teacher.phone,
    })) || [];

  // Calculate present students count (across all sessions for the day)
  const presentStudentIds = new Set<string>();
  if (attendanceMapBySession) {
    Object.values(attendanceMapBySession).forEach((sessionMap) => {
      Object.entries(sessionMap).forEach(([studentId, isPresent]) => {
        if (isPresent) {
          presentStudentIds.add(studentId);
        }
      });
    });
  }
  const presentCount = presentStudentIds.size;
  const totalStudents = students.length;

  // We will render all sessions; per-session maps will be pulled during render

  return (
    <div className="px-0">
      <Card className="p-3 lg:p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="w-full">
              <AttendanceDateToolbarClient
                basePath={`/admin/classes/${classId}/attendance`}
                date={date}
              />
            </div>
            {/* Desktop: attendance count */}
            <span className="hidden lg:block text-sm text-muted-foreground">
              Có mặt {presentCount}/{totalStudents} HS
            </span>
          </div>
          {/* Mobile inline session select */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="text-xs text-muted-foreground">Ca</span>
            <Select
              value={
                sessionFilter === "all" ? (sessions[0] ?? "") : sessionFilter
              }
              onValueChange={(v) => setSessionFilter(v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 p-3 space-y-3" align="end">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">
                    Đối tượng
                  </span>
                  <Select
                    value={filterMode}
                    onValueChange={(v: "all" | "teacher" | "student") =>
                      setFilterMode(v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="teacher">Giáo viên</SelectItem>
                      <SelectItem value="student">Học sinh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={externalBulkDisabled}
                    onClick={() => externalBulkMarkRef.current(true)}
                    className="flex-1"
                  >
                    Có
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={externalBulkDisabled}
                    onClick={() => externalBulkMarkRef.current(false)}
                    className="flex-1"
                  >
                    Vắng
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Desktop controls */}
          <div className="hidden lg:flex items-center gap-2 lg:ml-auto">
            <span className="text-xs text-muted-foreground">Ca</span>
            <Select
              value={sessionFilter}
              onValueChange={(v) => setSessionFilter(v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Đối tượng</span>
            <Select
              value={filterMode}
              onValueChange={(v: "all" | "teacher" | "student") =>
                setFilterMode(v)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="teacher">Giáo viên</SelectItem>
                <SelectItem value="student">Học sinh</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                disabled={externalBulkDisabled}
                onClick={() => externalBulkMarkRef.current(true)}
              >
                Có
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={externalBulkDisabled}
                onClick={() => externalBulkMarkRef.current(false)}
              >
                Vắng
              </Button>
            </div>
          </div>
        </div>
        <div className="lg:mt-2 space-y-4">
          {sessions.length > 0 ? (
            <>
              {/* Matrices below - 1 column */}
              <div className="space-y-6">
                <AttendanceCombinedMatrix
                  students={students}
                  teachers={teachers}
                  sessions={visibleSessions}
                  studentAttendanceBySession={attendanceMapBySession || {}}
                  teacherAttendanceBySession={
                    teacherAttendanceMapBySession || {}
                  }
                  classId={classId}
                  date={date}
                  filter={filterMode}
                  controlsPlacement="hidden"
                  onBulkActionsReady={({ markSelected, disabled }) => {
                    externalBulkMarkRef.current = markSelected;
                    setExternalBulkDisabled(disabled);
                  }}
                />
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Không có ca học trong ngày đã chọn.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
