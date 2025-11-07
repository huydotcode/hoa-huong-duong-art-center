"use client";

import { useState } from "react";
import { AttendanceDateToolbarClient } from "@/components/shared/attendance/attendance-date-toolbar-client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import TeacherAttendanceMatrix from "@/components/shared/attendance/teacher-attendance-matrix";
import type { TeacherAttendanceRow } from "@/lib/services/teacher-attendance-service";

export default function TeacherAttendanceClient({
  dateISO,
  sessionLabel,
  rows,
}: {
  dateISO: string;
  sessionLabel: string;
  rows: TeacherAttendanceRow[];
}) {
  const [filterMode, setFilterMode] = useState<"all" | "teacher" | "student">(
    "all"
  );
  const filteredRows = rows.filter((r) =>
    filterMode === "all" ? true : r.kind === filterMode
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="w-full">
            <AttendanceDateToolbarClient
              basePath={`/teacher/attendance`}
              date={dateISO}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <TeacherAttendanceMatrix
        dateISO={dateISO}
        sessionLabel={sessionLabel}
        rows={filteredRows}
      />
    </div>
  );
}
