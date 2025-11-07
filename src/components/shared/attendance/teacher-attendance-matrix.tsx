"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { TeacherAttendanceRow } from "@/lib/services/teacher-attendance-service";
import {
  upsertStudentAttendance,
  upsertTeacherAttendance,
} from "@/lib/services/attendance-service";

export default function TeacherAttendanceMatrix({
  dateISO,
  sessionLabel,
  rows,
}: {
  dateISO: string;
  sessionLabel: string;
  rows: TeacherAttendanceRow[];
}) {
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(
    new Set()
  );
  const [pendingCellKeys, setPendingCellKeys] = useState<Set<string>>(
    new Set()
  );

  const headers = useMemo(() => [sessionLabel], [sessionLabel]);
  const allCellKeys = useMemo(
    () => rows.map((row) => `${row.key}@@${sessionLabel}`),
    [rows, sessionLabel]
  );
  const allSelected =
    allCellKeys.length > 0 &&
    allCellKeys.every((key) => selectedCellKeys.has(key));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedCellKeys(new Set());
    } else {
      setSelectedCellKeys(new Set(allCellKeys));
    }
  };

  const applyToggle = async (row: TeacherAttendanceRow, present: boolean) => {
    const cellKey = `${row.key}@@${sessionLabel}`;
    setPendingCellKeys((s) => new Set(s).add(cellKey));
    try {
      if (row.kind === "student") {
        await upsertStudentAttendance({
          classId: row.classId,
          studentId: row.id,
          date: dateISO,
          session_time: sessionLabel,
          is_present: present,
          marked_by: "teacher",
        });
      } else {
        await upsertTeacherAttendance({
          classId: row.classId,
          teacherId: row.id,
          date: dateISO,
          session_time: sessionLabel,
          is_present: present,
          marked_by: "teacher",
        });
      }
    } finally {
      setPendingCellKeys((s) => {
        const n = new Set(s);
        n.delete(cellKey);
        return n;
      });
    }
  };

  const onCellClick = (row: TeacherAttendanceRow) => {
    const key = `${row.key}@@${sessionLabel}`;
    setSelectedCellKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBulk = async (present: boolean) => {
    const targets: TeacherAttendanceRow[] = [];
    selectedCellKeys.forEach((k) => {
      const [rowKey] = k.split("@@");
      const row = rows.find((r) => r.key === rowKey);
      if (row) targets.push(row);
    });

    if (targets.length === 0) return;

    await Promise.all(targets.map((row) => applyToggle(row, present)));
    setSelectedCellKeys(new Set());
  };

  return (
    <div className="space-y-3">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left w-[220px]">Lớp</th>
                <th className="px-3 py-2 text-left w-[320px]">Đối tượng</th>
                {headers.map((s) => (
                  <th key={s} className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">{s}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + headers.length}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const cellKey = `${row.key}@@${sessionLabel}`;
                  const isSelected = selectedCellKeys.has(cellKey);
                  const pending = pendingCellKeys.has(cellKey);
                  return (
                    <tr key={row.key} className="border-t">
                      <td className="px-3 py-2">{row.className}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{row.full_name}</span>
                          <span
                            className={
                              row.kind === "teacher"
                                ? "text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
                                : "text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
                            }
                          >
                            {row.kind === "teacher" ? "GV" : "HS"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.phone}
                        </div>
                      </td>
                      <td
                        className={`px-3 py-2 text-center cursor-pointer hover:bg-muted/50 ${
                          isSelected ? "bg-muted" : ""
                        }`}
                        onClick={() => onCellClick(row)}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                            disabled={pending}
                            onClick={(e) => {
                              e.stopPropagation();
                              applyToggle(row, true);
                            }}
                          >
                            Có
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-3 text-xs"
                            disabled={pending}
                            onClick={(e) => {
                              e.stopPropagation();
                              applyToggle(row, false);
                            }}
                          >
                            Vắng
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleBulk(true)}
              disabled={selectedCellKeys.size === 0}
            >
              Có
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulk(false)}
              disabled={selectedCellKeys.size === 0}
            >
              Vắng
            </Button>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Không có dữ liệu</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulk(true)}
                disabled={selectedCellKeys.size === 0}
              >
                Có
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulk(false)}
                disabled={selectedCellKeys.size === 0}
              >
                Vắng
              </Button>
            </div>
            {rows.map((row) => {
            const cellKey = `${row.key}@@${sessionLabel}`;
            const isSelected = selectedCellKeys.has(cellKey);
            const pending = pendingCellKeys.has(cellKey);
            return (
              <div
                key={`m-${row.key}`}
                className={`p-3 rounded-md border cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={() => onCellClick(row)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      <span className="truncate">{row.full_name}</span>
                      <span
                        className={
                          row.kind === "teacher"
                            ? "text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
                            : "text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
                        }
                      >
                        {row.kind === "teacher" ? "GV" : "HS"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {row.className}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {row.phone}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <Select
                      onValueChange={(v) => applyToggle(row, v === "present")}
                      disabled={pending}
                    >
                      <SelectTrigger className="w-[92px] h-8 text-xs">
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Có</SelectItem>
                        <SelectItem value="absent">Vắng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
            })}
          </>
        )}
      </div>
    </div>
  );
}
