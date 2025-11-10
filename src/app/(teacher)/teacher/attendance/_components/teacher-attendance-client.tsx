"use client";

import { useCallback, useMemo } from "react";
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
import type {
  TeacherAttendanceClass,
  TeacherAttendanceRow,
} from "@/lib/services/teacher-attendance-service";
import { generateTimeSlots } from "@/lib/utils";

export default function TeacherAttendanceClient({
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
  classes: TeacherAttendanceClass[];
  rows: TeacherAttendanceRow[];
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

  // Only show students
  const studentRows = useMemo(
    () => rows.filter((r) => r.kind === "student"),
    [rows]
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
      router.push(`/teacher/attendance?${params.toString()}`);
    },
    [searchParams, router, sessionLabel]
  );

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
        initialState: {},
      });
    });

    studentRows.forEach((row) => {
      if (!map.has(row.classId)) {
        const info = classSessionTimes[row.classId];
        map.set(row.classId, {
          classId: row.classId,
          className: row.className,
          sessionTime: info?.sessionTime ?? sessionLabel,
          endTime: info?.endTime,
          rows: [row],
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
  }, [classes, studentRows, classSessionTimes, sessionLabel, initialState]);

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
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Không có lớp nào trong ca này.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const sessionTime = group.sessionTime;
            const sessionEnd = group.endTime;
            const stateForGroup = group.initialState;
            const totalStudents = group.rows.length;
            const presentStudents = group.rows.reduce((sum, row) => {
              const key = `${row.key}@@${sessionTime}`;
              return stateForGroup[key] ? sum + 1 : sum;
            }, 0);

            return (
              <Card key={group.classId} className="shadow-sm">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {group.className || "Lớp chưa đặt tên"}
                    </CardTitle>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>HS: {totalStudents}</div>
                      <div>
                        Có mặt: {presentStudents}/{totalStudents} HS
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
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    Danh sách học sinh
                  </div>
                  {group.rows.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Chưa có học sinh đăng ký.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.rows.map((row) => {
                        const key = `${row.key}@@${sessionTime}`;
                        const isPresent = stateForGroup[key] === true;
                        return (
                          <div
                            key={row.key}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">
                                {row.full_name}
                              </div>
                              {row.phone && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {row.phone}
                                </div>
                              )}
                            </div>
                            <Badge
                              variant={isPresent ? "default" : "secondary"}
                              className={
                                isPresent
                                  ? "bg-emerald-500/90 text-white hover:bg-emerald-500"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {isPresent ? "Có mặt" : "Vắng"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
