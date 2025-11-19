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
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useMemo, startTransition } from "react";
import type { AttendancePageData } from "@/lib/services/attendance-data-service";

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

export default function AttendancePageClient({
  classId,
  initialData,
  date: initialDate,
}: {
  classId: string;
  initialData: AttendancePageData;
  date: string;
}) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const dateParam = searchParams.get("date");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;
  const date = dateParam || initialDate || defaultDate;

  // Check if current date matches initial date
  const isInitialDate = date === initialDate;

  // Initialize React Query cache with server data ONLY for initial date
  useEffect(() => {
    // Only set cache for class data (doesn't change by date)
    if (initialData.class) {
      queryClient.setQueryData(["class", classId], initialData.class);
    }

    // Only set attendance cache if date matches initial date
    if (isInitialDate) {
      queryClient.setQueryData(
        ["attendance", classId, date],
        initialData.attendanceMap
      );
      queryClient.setQueryData(
        ["teacher-attendance", classId, date],
        initialData.teacherAttendanceMap
      );
    }
  }, [classId, date, initialData, queryClient, isInitialDate]);

  // Use queries - only use initialData if date matches initialDate
  // React Query will automatically refetch when date changes (queryKey changes)
  const { data: attendanceMapBySession } = useAttendanceQuery(classId, date, {
    initialData: isInitialDate ? initialData.attendanceMap : undefined,
  });
  const { data: teacherAttendanceMapBySession } = useTeacherAttendanceQuery(
    classId,
    date,
    {
      initialData: isInitialDate ? initialData.teacherAttendanceMap : undefined,
    }
  );

  // Use lightweight data directly from initialData
  const students = useMemo(() => initialData.students, [initialData.students]);
  const teachers = useMemo(() => initialData.teachers, [initialData.teachers]);
  const cls = useMemo(() => initialData.class, [initialData.class]);

  // Collapsible teacher matrix (legacy; reserved for future use)
  // Filter: all/teacher/student for combined matrix
  const [filterMode, setFilterMode] = useState<"all" | "teacher" | "student">(
    "all"
  );
  // Session filter: must be a specific session_time (no "all" option to reduce queries)
  const [sessionFilter, setSessionFilter] = useState<string>("");

  // External bulk buttons control (from combined matrix)
  const externalBulkMarkRef = useRef<(present: boolean) => void>(() => {});
  const [externalBulkDisabled, setExternalBulkDisabled] = useState(true);

  // Memoize sessions calculation (must be before conditional return)
  const sessions = useMemo(() => {
    if (!cls) return [];
    return getSessionsForDate(cls.days_of_week, date);
  }, [cls, date]);

  // Track previous sessions to detect changes
  const prevSessionsRef = useRef<string[]>([]);

  // Initialize sessionFilter with first session when sessions change
  // Use startTransition to make state update non-blocking and avoid cascading renders
  useEffect(() => {
    const sessionsChanged =
      prevSessionsRef.current.length !== sessions.length ||
      prevSessionsRef.current.some((s, i) => s !== sessions[i]);

    if (sessionsChanged && sessions.length > 0) {
      prevSessionsRef.current = sessions;
      startTransition(() => {
        setSessionFilter((current) => {
          // Only update if current is empty or not in sessions
          if (!current || !sessions.includes(current)) {
            return sessions[0];
          }
          return current;
        });
      });
    } else if (!sessionsChanged) {
      prevSessionsRef.current = sessions;
    }
  }, [sessions]);

  // Only show the selected session (no "all" option to reduce queries)
  const visibleSessions = useMemo(() => {
    if (!sessionFilter || !sessions.includes(sessionFilter)) {
      return sessions.length > 0 ? [sessions[0]] : [];
    }
    return [sessionFilter];
  }, [sessionFilter, sessions]);

  // Calculate present students count for the selected session only
  // Must be before conditional return to satisfy React Hooks rules
  const presentCount = useMemo(() => {
    if (!attendanceMapBySession || visibleSessions.length === 0) return 0;
    const sessionTime = visibleSessions[0];
    const sessionMap = attendanceMapBySession[sessionTime];
    if (!sessionMap) return 0;
    return Object.values(sessionMap).filter((isPresent) => isPresent).length;
  }, [attendanceMapBySession, visibleSessions]);
  const totalStudents = students.length;

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
              value={sessionFilter || (sessions[0] ?? "")}
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
              value={sessionFilter || (sessions[0] ?? "")}
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
