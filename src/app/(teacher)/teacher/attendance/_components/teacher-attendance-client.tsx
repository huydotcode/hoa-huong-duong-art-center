"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AttendanceDateToolbarClient } from "@/components/shared/attendance/attendance-date-toolbar-client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AdminAttendanceMatrix from "@/components/shared/attendance/admin-attendance-matrix";
import type {
  TeacherAttendanceRow,
  TeacherClassSession,
} from "@/lib/services/teacher-attendance-service";
import { getTeacherAttendanceViewData } from "@/lib/services/teacher-attendance-service";
import { generateTimeSlots, getCurrentSessionLabel } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

function normalizeToHourSlot(time: string): string {
  const [hour] = time.split(":").map(Number);
  const roundedHour = Math.max(6, Math.min(22, hour));
  return `${String(roundedHour).padStart(2, "0")}:00`;
}

export default function TeacherAttendanceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parsing params
  const dateParam = searchParams?.get("date");
  const sessionParam = searchParams?.get("session");
  const showAllParam = searchParams?.get("showAll");

  const dateISO = (dateParam ? new Date(dateParam) : new Date())
    .toISOString()
    .slice(0, 10);

  const sessionLabel = sessionParam
    ? sessionParam
    : normalizeToHourSlot(getCurrentSessionLabel());

  const showAllClasses = showAllParam === "true";

  // Data fetching
  const { data: viewData, isLoading } = useQuery({
    queryKey: ["teacher-attendance", { dateISO, sessionLabel, showAllClasses }],
    queryFn: async () =>
      getTeacherAttendanceViewData(dateISO, sessionLabel, showAllClasses),
  });

  // Extract data from viewData or defaults with memoization to satisfy linter
  const classSessionTimes = useMemo(
    () => viewData?.classSessionTimes || {},
    [viewData]
  );
  const classSessions = useMemo(
    () => viewData?.classSessions || [],
    [viewData]
  );
  const classes = useMemo(() => viewData?.classes || [], [viewData]);
  const rows = useMemo(() => viewData?.rows || [], [viewData]);
  const initialState = useMemo(() => viewData?.initialState || {}, [viewData]);
  const initialNotes = useMemo(() => viewData?.initialNotes || {}, [viewData]);

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const displaySession = useMemo(() => {
    if (timeSlots.includes(sessionLabel)) {
      return sessionLabel;
    }
    return timeSlots[0] || "08:00";
  }, [sessionLabel, timeSlots]);

  // Only show students
  const studentRows = useMemo(
    () => rows.filter((r) => r.kind === "student"),
    [rows]
  );

  const handleSessionChange = useCallback(
    (newSession: string) => {
      if (showAllClasses) return;
      const currentSessionParam = searchParams?.get("session");
      if (newSession === currentSessionParam || newSession === sessionLabel) {
        return;
      }

      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("session", newSession);
      params.delete("showAll");
      router.push(`/teacher/attendance?${params.toString()}`);
    },
    [searchParams, router, sessionLabel, showAllClasses]
  );

  const handleShowAllToggle = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (showAllClasses) {
      params.delete("showAll");
    } else {
      params.set("showAll", "true");
    }
    router.push(`/teacher/attendance?${params.toString()}`);
  }, [router, searchParams, showAllClasses]);

  const classMap = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes]
  );

  const sessionsByClass = useMemo(() => {
    const map = new Map<string, TeacherClassSession[]>();
    classSessions.forEach((session) => {
      if (!map.has(session.classId)) {
        map.set(session.classId, []);
      }
      map.get(session.classId)!.push(session);
    });
    return map;
  }, [classSessions]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        classId: string;
        className: string;
        sessionTime: string;
        endTime?: string;
        rows: TeacherAttendanceRow[];
        initialState: Record<string, boolean>;
        initialNotes: Record<string, string | null>;
      }
    >();

    if (showAllClasses) {
      sessionsByClass.forEach((sessions, classId) => {
        const classInfo = classMap.get(classId);
        sessions.forEach((session) => {
          const groupKey = `${classId}::${session.sessionTime}`;
          if (!map.has(groupKey)) {
            map.set(groupKey, {
              classId,
              className: classInfo?.name || "",
              sessionTime: session.sessionTime,
              endTime: session.endTime,
              rows: [],
              initialState: {},
              initialNotes: {},
            });
          }
        });
      });
    } else {
      classes.forEach((c) => {
        const info = classSessionTimes[c.id];
        map.set(c.id, {
          classId: c.id,
          className: c.name,
          sessionTime: info?.sessionTime ?? sessionLabel,
          endTime: info?.endTime,
          rows: [],
          initialState: {},
          initialNotes: {},
        });
      });
    }

    studentRows.forEach((row) => {
      if (showAllClasses) {
        const sessions = sessionsByClass.get(row.classId);
        if (sessions) {
          sessions.forEach((session) => {
            const groupKey = `${row.classId}::${session.sessionTime}`;
            const group = map.get(groupKey);
            if (group && !group.rows.find((r) => r.key === row.key)) {
              group.rows.push(row);
            }
          });
        }
      } else {
        if (!map.has(row.classId)) {
          const info = classSessionTimes[row.classId];
          map.set(row.classId, {
            classId: row.classId,
            className: row.className,
            sessionTime: info?.sessionTime ?? sessionLabel,
            endTime: info?.endTime,
            rows: [row],
            initialState: {},
            initialNotes: {},
          });
        } else {
          map.get(row.classId)!.rows.push(row);
        }
      }
    });

    Object.entries(initialState).forEach(([key, value]) => {
      const [baseKey, sessionTime] = key.split("@@");
      if (!baseKey) return;
      const [, , classId] = baseKey.split(":");
      if (!classId) return;

      if (showAllClasses) {
        const groupKey = `${classId}::${sessionTime}`;
        const group = map.get(groupKey);
        if (!group) return;
        group.initialState[key] = value;
      } else {
        const group = map.get(classId);
        if (!group) return;
        group.initialState[key] = value;
      }
    });

    if (initialNotes) {
      Object.entries(initialNotes).forEach(([key, value]) => {
        const [baseKey, sessionTime] = key.split("@@");
        if (!baseKey) return;
        const [, , classId] = baseKey.split(":");
        if (!classId) return;

        if (showAllClasses) {
          const groupKey = `${classId}::${sessionTime}`;
          const group = map.get(groupKey);
          if (!group) return;
          group.initialNotes[key] = value ?? null;
        } else {
          const group = map.get(classId);
          if (!group) return;
          group.initialNotes[key] = value ?? null;
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (showAllClasses) {
        const timeCompare = a.sessionTime.localeCompare(b.sessionTime);
        if (timeCompare !== 0) return timeCompare;
      }
      return a.className.localeCompare(b.className, "vi", {
        sensitivity: "base",
      });
    });
  }, [
    classes,
    studentRows,
    classSessionTimes,
    sessionLabel,
    initialState,
    initialNotes,
    showAllClasses,
    sessionsByClass,
    classMap,
  ]);

  const summaryKeyForGroup = useCallback(
    (group: { classId: string; sessionTime: string }) =>
      showAllClasses ? `${group.classId}::${group.sessionTime}` : group.classId,
    [showAllClasses]
  );

  const [attendanceSummaries, setAttendanceSummaries] = useState<
    Record<string, { presentStudents: number; totalStudents: number }>
  >({});

  const [bulkActionsMap, setBulkActionsMap] = useState<
    Record<
      string,
      {
        selectedCount: number;
        allSelected: boolean;
        toggleSelectAll: () => void;
        handleBulk: (present: boolean) => Promise<void>;
      }
    >
  >({});

  const handleStatsChange = useCallback(
    (
      mapKey: string,
      statsSummary: { presentStudents: number; totalStudents: number }
    ) => {
      setAttendanceSummaries((prev) => {
        const prevStats = prev[mapKey];
        if (
          prevStats &&
          prevStats.presentStudents === statsSummary.presentStudents &&
          prevStats.totalStudents === statsSummary.totalStudents
        ) {
          return prev;
        }
        return {
          ...prev,
          [mapKey]: statsSummary,
        };
      });
    },
    []
  );

  const handleBulkActionsReady = useCallback(
    (
      mapKey: string,
      actions: {
        selectedCount: number;
        allSelected: boolean;
        toggleSelectAll: () => void;
        handleBulk: (present: boolean) => Promise<void>;
      }
    ) => {
      setBulkActionsMap((prev) => {
        const prevActions = prev[mapKey];
        if (
          prevActions &&
          prevActions.selectedCount === actions.selectedCount &&
          prevActions.allSelected === actions.allSelected
        ) {
          return prev;
        }
        return {
          ...prev,
          [mapKey]: actions,
        };
      });
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle case where teacherId is invalid (viewData is null)
  if (viewData === null && !isLoading) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-destructive">
        Không tìm thấy thông tin giáo viên.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="w-full">
            <AttendanceDateToolbarClient
              basePath={`/teacher/attendance`}
              date={dateISO}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="hidden md:inline-block text-xs text-muted-foreground whitespace-nowrap">
              Ca
            </span>
            <Select
              value={displaySession}
              onValueChange={handleSessionChange}
              disabled={showAllClasses}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Chọn giờ" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showAllClasses ? "default" : "outline"}
              size="sm"
              onClick={handleShowAllToggle}
              className="whitespace-nowrap"
            >
              {showAllClasses ? "Xem theo ca" : "Tất cả ca"}
            </Button>
          </div>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {showAllClasses
            ? "Không có lớp nào trong ngày này."
            : "Không có lớp nào trong ca này."}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const sessionTime = group.sessionTime;
            const sessionEnd = group.endTime;
            const stateForGroup = group.initialState;
            const notesForGroup = group.initialNotes;
            const totalStudents = group.rows.length;
            const summaryKey = summaryKeyForGroup(group);
            const summary = attendanceSummaries[summaryKey];
            const bulkActions = bulkActionsMap[summaryKey];

            return (
              <Card key={summaryKey} className="shadow-sm">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {group.className || "Lớp chưa đặt tên"}
                    </CardTitle>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>HS: {totalStudents}</div>
                      <div>
                        Có mặt: {summary?.presentStudents ?? 0}/
                        {summary?.totalStudents ?? totalStudents} HS
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="uppercase tracking-wide"
                    >
                      Ca {sessionTime}
                      {sessionEnd ? ` - ${sessionEnd}` : ""}
                    </Badge>
                    {bulkActions && (
                      <div className="hidden md:flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={bulkActions.toggleSelectAll}
                          className="whitespace-nowrap"
                        >
                          {bulkActions.allSelected ? "Bỏ chọn" : "Chọn tất cả"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => bulkActions.handleBulk(true)}
                          disabled={bulkActions.selectedCount === 0}
                        >
                          Có
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => bulkActions.handleBulk(false)}
                          disabled={bulkActions.selectedCount === 0}
                        >
                          Vắng
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-2 md:px-6">
                  <AdminAttendanceMatrix
                    dateISO={dateISO}
                    sessionLabel={sessionTime}
                    sessionTime={sessionTime}
                    rows={group.rows}
                    showClassColumn={false}
                    initialState={stateForGroup}
                    initialNotes={notesForGroup}
                    statsRows={group.rows}
                    onStatsChange={(statsSummary) =>
                      handleStatsChange(summaryKey, statsSummary)
                    }
                    onBulkActionsReady={
                      group.rows.length > 0
                        ? (actions) =>
                            handleBulkActionsReady(summaryKey, actions)
                        : undefined
                    }
                    markedBy="teacher"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
