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
} from "@/lib/services/admin-attendance-service";
import { generateTimeSlots } from "@/lib/utils";

export default function AdminAttendanceClient({
  dateISO,
  sessionLabel,
  classSessionTimes,
  classes,
  rows,
  initialState,
}: {
  dateISO: string;
  sessionLabel: string;
  classSessionTimes: Record<string, { sessionTime: string; endTime: string }>;
  classes: AdminAttendanceClass[];
  rows: AdminAttendanceRow[];
  initialState: Record<string, boolean>;
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
      const currentSessionParam = searchParams?.get("session");
      // Only update if the value actually changed from what's in URL or current sessionLabel
      if (newSession === currentSessionParam || newSession === sessionLabel) {
        return;
      }

      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("session", newSession);
      router.push(`/admin/attendance?${params.toString()}`);
    },
    [searchParams, router, sessionLabel]
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

  const grouped = useMemo(() => {
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
      }
    >();

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
      });
    });

    rows.forEach((row) => {
      const group = map.get(row.classId);
      if (!group) return;
      group.allRows.push(row);
    });

    filteredRows.forEach((row) => {
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
        });
      } else {
        map.get(row.classId)!.rows.push(row);
      }
    });

    Object.entries(initialState).forEach(([key, value]) => {
      const [baseKey] = key.split("@@");
      if (!baseKey) return;
      const [, , classId] = baseKey.split(":");
      if (!classId) return;
      const group = map.get(classId);
      if (!group) return;
      group.initialState[key] = value;
    });

    return Array.from(map.values()).sort((a, b) =>
      a.className.localeCompare(b.className, "vi", {
        sensitivity: "base",
      })
    );
  }, [
    classes,
    filteredRows,
    rows,
    classSessionTimes,
    sessionLabel,
    initialState,
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
            <Select value={displaySession} onValueChange={handleSessionChange}>
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
          Không có lớp nào trong ca này.
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
            const summary = attendanceSummaries[group.classId];

            return (
              <Card key={group.classId} className="shadow-sm">
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
                    {bulkActionsMap[group.classId] && (
                      <div className="hidden md:flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={
                            bulkActionsMap[group.classId].toggleSelectAll
                          }
                          className="whitespace-nowrap"
                        >
                          {bulkActionsMap[group.classId].allSelected
                            ? "Bỏ chọn"
                            : "Chọn tất cả"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            bulkActionsMap[group.classId].handleBulk(true)
                          }
                          disabled={
                            bulkActionsMap[group.classId].selectedCount === 0
                          }
                        >
                          Có
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            bulkActionsMap[group.classId].handleBulk(false)
                          }
                          disabled={
                            bulkActionsMap[group.classId].selectedCount === 0
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
                    statsRows={group.allRows}
                    onStatsChange={(statsSummary) =>
                      setAttendanceSummaries((prev) => {
                        const prevStats = prev[group.classId];
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
                          [group.classId]: statsSummary,
                        };
                      })
                    }
                    onBulkActionsReady={
                      group.rows.length > 0
                        ? (actions) => {
                            setBulkActionsMap((prev) => ({
                              ...prev,
                              [group.classId]: actions,
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
