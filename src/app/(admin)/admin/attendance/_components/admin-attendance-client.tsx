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
  AdminAttendanceClass,
  AdminAttendanceRow,
  AdminClassSession,
} from "@/lib/services/admin-attendance-service";
import { generateTimeSlots } from "@/lib/utils";

export default function AdminAttendanceClient({
  dateISO,
  sessionLabel,
  classSessionTimes,
  classSessions,
  classes,
  rows,
  initialState,
  initialNotes = {},
  showAllClasses = false,
}: {
  dateISO: string;
  sessionLabel: string;
  classSessionTimes: Record<string, { sessionTime: string; endTime: string }>;
  classSessions: AdminClassSession[];
  classes: AdminAttendanceClass[];
  rows: AdminAttendanceRow[];
  initialState: Record<string, boolean>;
  initialNotes?: Record<string, string | null>;
  showAllClasses?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Use sessionLabel directly since server already normalizes it
  // Ensure it's in the timeSlots list, otherwise fallback to first slot
  const displaySession = useMemo(() => {
    if (timeSlots.includes(sessionLabel)) {
      return sessionLabel;
    }
    return timeSlots[0] || "08:00";
  }, [sessionLabel, timeSlots]);

  const [filterMode, setFilterMode] = useState<"all" | "teacher" | "student">(
    "all"
  );
  const filteredRows = rows.filter((r) =>
    filterMode === "all" ? true : r.kind === filterMode
  );

  const handleSessionChange = useCallback(
    (newSession: string) => {
      if (showAllClasses) return; // Don't allow session change when showing all
      const currentSessionParam = searchParams?.get("session");
      // Only update if the value actually changed from what's in URL or current sessionLabel
      if (newSession === currentSessionParam || newSession === sessionLabel) {
        return;
      }

      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("session", newSession);
      params.delete("showAll"); // Remove showAll when changing session
      router.push(`/admin/attendance?${params.toString()}`);
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
    router.push(`/admin/attendance?${params.toString()}`);
  }, [searchParams, router, showAllClasses]);

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

  const classStats = useMemo(() => {
    const stats = new Map<
      string,
      { teacherCount: number; studentCount: number }
    >();
    rows.forEach((row) => {
      const entry = stats.get(row.classId) || {
        teacherCount: 0,
        studentCount: 0,
      };
      if (row.kind === "teacher") entry.teacherCount += 1;
      else entry.studentCount += 1;
      stats.set(row.classId, entry);
    });
    return stats;
  }, [rows]);

  const classMap = useMemo(() => {
    return new Map(classes.map((cls) => [cls.id, cls]));
  }, [classes]);

  const sessionsByClass = useMemo(() => {
    const map = new Map<string, AdminClassSession[]>();
    classSessions.forEach((session) => {
      if (!map.has(session.classId)) {
        map.set(session.classId, []);
      }
      map.get(session.classId)!.push(session);
    });
    return map;
  }, [classSessions]);

  const grouped = useMemo(() => {
    // When showAllClasses is true, group by classId + sessionTime (each session is a separate group)
    // When false, group by classId only (one group per class)
    const map = new Map<
      string,
      {
        classId: string;
        className: string;
        sessionTime: string;
        endTime?: string;
        rows: AdminAttendanceRow[];
        allRows: AdminAttendanceRow[];
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
              allRows: [],
              initialState: {},
              initialNotes: {},
            });
          }
        });
      });
    } else {
      // Group by classId only (original behavior)
      classes.forEach((c) => {
        const info = classSessionTimes[c.id];
        map.set(c.id, {
          classId: c.id,
          className: c.name,
          sessionTime: info?.sessionTime ?? sessionLabel,
          endTime: info?.endTime,
          rows: [],
          allRows: [],
          initialState: {},
          initialNotes: {},
        });
      });
    }

    // Add all rows to groups
    rows.forEach((row) => {
      if (showAllClasses) {
        const sessions = sessionsByClass.get(row.classId);
        if (sessions) {
          sessions.forEach((session) => {
            const groupKey = `${row.classId}::${session.sessionTime}`;
            const group = map.get(groupKey);
            if (group && !group.allRows.find((r) => r.key === row.key)) {
              group.allRows.push(row);
            }
          });
        }
      } else {
        const group = map.get(row.classId);
        if (group) {
          group.allRows.push(row);
        }
      }
    });

    // Add filtered rows to groups
    filteredRows.forEach((row) => {
      if (showAllClasses) {
        const sessions = sessionsByClass.get(row.classId);
        if (sessions) {
          sessions.forEach((session) => {
            const groupKey = `${row.classId}::${session.sessionTime}`;
            let group = map.get(groupKey);
            if (!group) {
              const classInfo =
                classMap.get(row.classId) ||
                ({ name: row.className } as AdminAttendanceClass);
              group = {
                classId: row.classId,
                className: classInfo?.name || row.className,
                sessionTime: session.sessionTime,
                endTime: session.endTime,
                rows: [row],
                allRows: [row],
                initialState: {},
                initialNotes: {},
              };
              map.set(groupKey, group);
            } else if (!group.rows.find((r) => r.key === row.key)) {
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
            allRows: [row],
            initialState: {},
            initialNotes: {},
          });
        } else {
          const group = map.get(row.classId);
          if (group && !group.rows.find((r) => r.key === row.key)) {
            group.rows.push(row);
          }
        }
      }
    });

    // Add initial state to groups
    Object.entries(initialState).forEach(([key, value]) => {
      const [baseKey, sessionTime] = key.split("@@");
      if (!baseKey) return;
      const [, , classId] = baseKey.split(":");
      if (!classId) return;

      if (showAllClasses) {
        // Match by classId + sessionTime
        const groupKey = `${classId}::${sessionTime}`;
        const group = map.get(groupKey);
        if (group) {
          group.initialState[key] = value;
        }
      } else {
        const group = map.get(classId);
        if (group) {
          group.initialState[key] = value;
        }
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
          if (group) {
            group.initialNotes[key] = value ?? null;
          }
        } else {
          const group = map.get(classId);
          if (group) {
            group.initialNotes[key] = value ?? null;
          }
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      // Sort by sessionTime first (ascending), then by className
      const timeCompare = a.sessionTime.localeCompare(b.sessionTime);
      if (timeCompare !== 0) return timeCompare;
      return a.className.localeCompare(b.className, "vi", {
        sensitivity: "base",
      });
    });
  }, [
    classes,
    classMap,
    filteredRows,
    rows,
    classSessionTimes,
    sessionsByClass,
    sessionLabel,
    initialState,
    initialNotes,
    showAllClasses,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="w-full">
            <AttendanceDateToolbarClient
              basePath={`/admin/attendance`}
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
              {showAllClasses ? "Ẩn bớt" : "Hiện tất cả"}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-block text-xs text-muted-foreground whitespace-nowrap">
            Đối tượng
          </span>
          <Select
            value={filterMode}
            onValueChange={(v: "all" | "teacher" | "student") =>
              setFilterMode(v)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Đối tượng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="teacher">Giáo viên</SelectItem>
              <SelectItem value="student">Học sinh</SelectItem>
            </SelectContent>
          </Select>
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
            const stats = classStats.get(group.classId) || {
              teacherCount: 0,
              studentCount: 0,
            };
            const sessionTime = group.sessionTime;
            const sessionEnd = group.endTime;
            const stateForGroup = group.initialState;
            const notesForGroup = group.initialNotes;

            // Create unique key for each group (classId + sessionTime when showing all)
            const groupKey = showAllClasses
              ? `${group.classId}::${group.sessionTime}`
              : group.classId;

            const summary = attendanceSummaries[groupKey];

            return (
              <Card key={groupKey} className="shadow-sm">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {group.className || "Lớp chưa đặt tên"}
                    </CardTitle>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>
                        GV: {stats.teacherCount} • HS: {stats.studentCount}
                      </div>
                      <div>
                        Có mặt: {summary?.presentStudents ?? 0}/
                        {summary?.totalStudents ?? stats.studentCount} HS
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
                    {bulkActionsMap[groupKey] && (
                      <div className="hidden md:flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={bulkActionsMap[groupKey].toggleSelectAll}
                          className="whitespace-nowrap"
                        >
                          {bulkActionsMap[groupKey].allSelected
                            ? "Bỏ chọn"
                            : "Chọn tất cả"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            bulkActionsMap[groupKey].handleBulk(true)
                          }
                          disabled={
                            bulkActionsMap[groupKey].selectedCount === 0
                          }
                        >
                          Có
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            bulkActionsMap[groupKey].handleBulk(false)
                          }
                          disabled={
                            bulkActionsMap[groupKey].selectedCount === 0
                          }
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
                    statsRows={group.allRows}
                    onStatsChange={(statsSummary) =>
                      setAttendanceSummaries((prev) => {
                        const prevStats = prev[groupKey];
                        if (
                          prevStats &&
                          prevStats.presentStudents ===
                            statsSummary.presentStudents &&
                          prevStats.totalStudents === statsSummary.totalStudents
                        ) {
                          return prev;
                        }
                        return {
                          ...prev,
                          [groupKey]: statsSummary,
                        };
                      })
                    }
                    onBulkActionsReady={
                      group.rows.length > 0
                        ? (actions) => {
                            setBulkActionsMap((prev) => ({
                              ...prev,
                              [groupKey]: actions,
                            }));
                          }
                        : undefined
                    }
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
