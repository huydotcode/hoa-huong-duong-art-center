"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import {
  type AdminAttendanceClass,
  type AdminAttendanceRow,
  type AdminClassSession,
  getAdminClassesInSession,
  getAdminAllClassesInDay,
  getParticipantsForClasses,
  getAttendanceStateForSessions,
} from "@/lib/services/admin-attendance-service";
import { generateTimeSlots } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function AdminAttendanceClient({
  dateISO,
  sessionLabel,
  showAllClasses = false,
  initialClassId = null,
}: {
  dateISO: string;
  sessionLabel: string;
  showAllClasses?: boolean;
  initialClassId?: string | null;
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

  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    initialClassId
  );

  useEffect(() => {
    const classParam = searchParams?.get("classId");
    if (classParam) {
      startTransition(() => {
        setSelectedClassId(classParam);
      });
    } else {
      startTransition(() => {
        setSelectedClassId(null);
      });
    }
  }, [searchParams]);

  // --- Data Fetching ---

  // 1. Fetch Class Sessions
  const { data: classSessions = [], isFetching: isSessionsLoading } = useQuery({
    queryKey: [
      "admin-class-sessions",
      { dateISO, sessionLabel, showAllClasses },
    ],
    queryFn: async () => {
      return showAllClasses
        ? await getAdminAllClassesInDay(dateISO)
        : await getAdminClassesInSession(dateISO, sessionLabel);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const classIds = useMemo(
    () => classSessions.map((item) => item.classId),
    [classSessions]
  );

  // 2. Fetch Participants (Classes & Rows) - Dependent on classSessions
  const { data: participantsData, isFetching: isParticipantsLoading } =
    useQuery({
      queryKey: ["admin-participants", { classIds }],
      queryFn: async () => {
        return getParticipantsForClasses(classIds);
      },
      enabled: classIds.length > 0,
      staleTime: 1000 * 60 * 30, // 30 minutes (less likely to change quickly)
    });

  const classes = useMemo(
    () => participantsData?.classes || [],
    [participantsData]
  );
  const rows = useMemo(() => participantsData?.rows || [], [participantsData]);

  // 3. Fetch Attendance State - Dependent on classSessions
  const { data: attendanceState, isFetching: isStateLoading } = useQuery({
    queryKey: ["admin-attendance-state", { dateISO, classSessions }],
    queryFn: async () => {
      return getAttendanceStateForSessions(dateISO, classSessions);
    },
    enabled: classSessions.length > 0,
  });

  const isLoading =
    isSessionsLoading || isParticipantsLoading || isStateLoading;

  // --- Derived State Calculations ---

  const classSessionTimes = useMemo(() => {
    const map = new Map<string, { sessionTime: string; endTime: string }[]>();
    classSessions.forEach((item) => {
      const existing = map.get(item.classId) || [];
      existing.push({ sessionTime: item.sessionTime, endTime: item.endTime });
      map.set(item.classId, existing);
    });

    const result: Record<string, { sessionTime: string; endTime: string }> = {};
    map.forEach((sessions, classId) => {
      result[classId] = sessions[0];
    });
    return result;
  }, [classSessions]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) =>
      filterMode === "all" ? true : r.kind === filterMode
    );
  }, [rows, filterMode]);

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

  const handleClassFilterChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (value === "all") {
        params.delete("classId");
        setSelectedClassId(null);
      } else {
        params.set("classId", value);
        setSelectedClassId(value);
      }
      router.push(`/admin/attendance?${params.toString()}`);
    },
    [router, searchParams]
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

    const initialState = attendanceState?.states || {};
    const initialNotes = attendanceState?.notes || {};

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
    attendanceState,
    showAllClasses,
  ]);

  const visibleGroups = useMemo(() => {
    if (!selectedClassId) return grouped;
    return grouped.filter((group) => group.classId === selectedClassId);
  }, [grouped, selectedClassId]);

  const classSelectOptions = useMemo(() => {
    // Only use classes that are in the sessions list
    // Or should we show all classes in the dropdown even if not in session?
    // Original logic seemed to rely on `classes` prop which was only classes with participants
    const options = classes
      .map((cls) => ({
        value: cls.id,
        label: cls.name || "Lớp chưa đặt tên",
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "vi", { sensitivity: "base" })
      );

    if (
      selectedClassId &&
      !options.some((option) => option.value === selectedClassId)
    ) {
      const rowMatch = rows.find((r) => r.classId === selectedClassId);
      options.push({
        value: selectedClassId,
        label: rowMatch?.className || "Lớp đã chọn",
      });
    }

    return options;
  }, [classes, rows, selectedClassId]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-[220px]">
            <AttendanceDateToolbarClient
              basePath={`/admin/attendance`}
              date={dateISO}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Ca học
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
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Lọc lớp
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <Select
                value={selectedClassId ?? "all"}
                onValueChange={(value) => handleClassFilterChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn lớp" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">Tất cả lớp</SelectItem>
                  {classSelectOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => handleClassFilterChange("all")}
                disabled={!selectedClassId}
              >
                Xóa lọc
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Đối tượng
            </span>
            <Select
              value={filterMode}
              onValueChange={(v: "all" | "teacher" | "student") =>
                setFilterMode(v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Đối tượng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="teacher">Giáo viên</SelectItem>
                <SelectItem value="student">Học sinh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Tóm tắt
            </span>
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <div>
                Ngày:{" "}
                <span className="font-semibold text-foreground">{dateISO}</span>
              </div>
              <div>
                Lớp đang xem:{" "}
                <span className="font-semibold text-foreground">
                  {selectedClassId
                    ? classSelectOptions.find(
                        (option) => option.value === selectedClassId
                      )?.label || "Đã chọn"
                    : showAllClasses
                      ? "Tất cả lớp / mọi ca"
                      : "Theo ca đang chọn"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && visibleGroups.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {selectedClassId
            ? "Không có dữ liệu điểm danh cho lớp này trong ngày/ca đã chọn."
            : showAllClasses
              ? "Không có lớp nào trong ngày này."
              : "Không có lớp nào trong ca này."}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((group) => {
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
