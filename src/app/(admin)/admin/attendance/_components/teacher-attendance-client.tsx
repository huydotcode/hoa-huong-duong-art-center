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
import AdminAttendanceMatrix from "@/components/shared/attendance/admin-attendance-matrix";
import type { AdminAttendanceRow } from "@/lib/services/admin-attendance-service";

export default function AdminAttendanceClient({
  dateISO,
  sessionLabel,
  rows,
}: {
  dateISO: string;
  sessionLabel: string;
  rows: AdminAttendanceRow[];
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
              basePath={`/admin/attendance`}
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

      <AdminAttendanceMatrix
        dateISO={dateISO}
        sessionLabel={sessionLabel}
        rows={filteredRows}
      />
    </div>
  );
}
