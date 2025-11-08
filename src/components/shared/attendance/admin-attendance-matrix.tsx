"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { AdminAttendanceRow } from "@/lib/services/admin-attendance-service";
import {
  upsertStudentAttendance,
  upsertTeacherAttendance,
} from "@/lib/services/attendance-service";
import { toast } from "sonner";

export default function AdminAttendanceMatrix({
  dateISO,
  sessionLabel,
  rows,
  showClassColumn = true,
  sessionTime,
  initialState = {},
  onStatsChange,
  statsRows,
  onBulkActionsReady,
}: {
  dateISO: string;
  sessionLabel: string;
  rows: AdminAttendanceRow[];
  showClassColumn?: boolean;
  sessionTime?: string;
  initialState?: Record<string, boolean>;
  onStatsChange?: (stats: {
    presentStudents: number;
    totalStudents: number;
  }) => void;
  statsRows?: AdminAttendanceRow[];
  onBulkActionsReady?: (actions: {
    selectedCount: number;
    allSelected: boolean;
    toggleSelectAll: () => void;
    handleBulk: (present: boolean) => Promise<void>;
  }) => void;
}) {
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(
    new Set()
  );
  const [pendingCellKeys, setPendingCellKeys] = useState<Set<string>>(
    new Set()
  );
  const [cellStates, setCellStates] =
    useState<Record<string, boolean>>(initialState);

  useEffect(() => {
    setCellStates(initialState);
    setSelectedCellKeys(new Set());
    setPendingCellKeys(new Set());
  }, [initialState, sessionLabel, sessionTime]);

  const effectiveSession = sessionTime ?? sessionLabel;

  const statsSourceRows = statsRows ?? rows;
  const allCellKeys = useMemo(
    () => rows.map((row) => `${row.key}@@${effectiveSession}`),
    [rows, effectiveSession]
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

  useEffect(() => {
    if (!onStatsChange) return;

    const totalStudents = statsSourceRows.filter(
      (row) => row.kind === "student"
    ).length;
    let presentStudents = 0;
    statsSourceRows.forEach((row) => {
      if (row.kind !== "student") return;
      const key = `${row.key}@@${effectiveSession}`;
      if (cellStates[key] === true) {
        presentStudents += 1;
      }
    });

    onStatsChange({ presentStudents, totalStudents });
  }, [statsSourceRows, cellStates, effectiveSession, onStatsChange]);
  const applyToggle = async (row: AdminAttendanceRow, present: boolean) => {
    const cellKey = `${row.key}@@${effectiveSession}`;
    setPendingCellKeys((s) => {
      const next = new Set(s);
      next.add(cellKey);
      return next;
    });
    try {
      if (row.kind === "student") {
        await upsertStudentAttendance({
          classId: row.classId,
          studentId: row.id,
          date: dateISO,
          session_time: effectiveSession,
          is_present: present,
          marked_by: "admin",
        });
      } else {
        await upsertTeacherAttendance({
          classId: row.classId,
          teacherId: row.id,
          date: dateISO,
          session_time: effectiveSession,
          is_present: present,
          marked_by: "admin",
        });
      }
      setCellStates((state) => {
        const next = { ...state } as Record<string, boolean>;
        next[cellKey] = present;
        return next;
      });
    } catch (error) {
      console.error("Admin attendance update failed", error);
      toast.error("Cập nhật điểm danh thất bại");
    } finally {
      setPendingCellKeys((s) => {
        const n = new Set(s);
        n.delete(cellKey);
        return n;
      });
    }
  };

  const onCellClick = (row: AdminAttendanceRow) => {
    const key = `${row.key}@@${effectiveSession}`;
    setSelectedCellKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBulk = async (present: boolean) => {
    const targets: AdminAttendanceRow[] = [];
    selectedCellKeys.forEach((k) => {
      const [rowKey] = k.split("@@");
      const row = rows.find((r) => r.key === rowKey);
      if (row) targets.push(row);
    });

    if (targets.length === 0) return;

    await Promise.all(targets.map((row) => applyToggle(row, present)));
    setSelectedCellKeys(new Set());
  };

  useEffect(() => {
    if (!onBulkActionsReady) return;

    onBulkActionsReady({
      selectedCount: selectedCellKeys.size,
      allSelected,
      toggleSelectAll,
      handleBulk,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCellKeys.size, allSelected]);

  return (
    <div className="space-y-3">
      {/* Desktop */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {showClassColumn && (
                  <th className="px-3 py-2 text-left w-[220px]">Lớp</th>
                )}
                <th className="px-3 py-2 text-left min-w-[220px]">Họ tên</th>
                <th className="px-3 py-2 text-left min-w-[160px]">
                  Số điện thoại
                </th>
                <th className="px-3 py-2 text-center min-w-[240px]">
                  <span className="font-medium">Trạng thái</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showClassColumn ? 1 : 0) + 3}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const cellKey = `${row.key}@@${effectiveSession}`;
                  const isSelected = selectedCellKeys.has(cellKey);
                  const pending = pendingCellKeys.has(cellKey);
                  const status = cellStates[cellKey];
                  return (
                    <tr
                      key={row.key}
                      className={`border-t cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/15 border-l-2 border-l-primary"
                          : "hover:bg-muted/40"
                      }`}
                      onClick={() => onCellClick(row)}
                    >
                      {showClassColumn && (
                        <td className="px-3 py-2">{row.className}</td>
                      )}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {row.full_name}
                          </span>
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
                      </td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">
                        {row.phone || "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {status === undefined ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  applyToggle(row, true);
                                }}
                                disabled={pending}
                              >
                                Có mặt
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  applyToggle(row, false);
                                }}
                                disabled={pending}
                              >
                                Vắng
                              </Button>
                            </>
                          ) : (
                            <Select
                              value={
                                status === true
                                  ? "present"
                                  : status === false
                                    ? "absent"
                                    : undefined
                              }
                              onValueChange={(value) =>
                                applyToggle(row, value === "present")
                              }
                              disabled={pending}
                            >
                              <SelectTrigger
                                className="w-[120px] h-8 text-xs"
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                                onPointerDown={(event) =>
                                  event.stopPropagation()
                                }
                              >
                                <SelectValue placeholder="Chọn trạng thái" />
                              </SelectTrigger>
                              <SelectContent align="center">
                                <SelectItem value="present">Có</SelectItem>
                                <SelectItem value="absent">Vắng</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Không có dữ liệu</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
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
              const cellKey = `${row.key}@@${effectiveSession}`;
              const isSelected = selectedCellKeys.has(cellKey);
              const pending = pendingCellKeys.has(cellKey);
              const status = cellStates[cellKey];
              return (
                <div
                  key={`m-${row.key}`}
                  className={`p-3 rounded-md border cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => onCellClick(row)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                        <span
                          className="min-w-0"
                          style={{ wordBreak: "break-word" }}
                        >
                          {row.full_name}
                        </span>
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
                      {status === undefined ? (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              applyToggle(row, true);
                            }}
                            disabled={pending}
                          >
                            Có
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              applyToggle(row, false);
                            }}
                            disabled={pending}
                          >
                            Vắng
                          </Button>
                        </>
                      ) : (
                        <Select
                          value={
                            status === true
                              ? "present"
                              : status === false
                                ? "absent"
                                : undefined
                          }
                          onValueChange={(v) =>
                            applyToggle(row, v === "present")
                          }
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
                      )}
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
