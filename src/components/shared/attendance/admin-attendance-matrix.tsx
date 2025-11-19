"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  updateStudentAttendanceNote,
  updateTeacherAttendanceNote,
} from "@/lib/services/attendance-service";
import { toast } from "sonner";
import { StickyNote, Pencil } from "lucide-react";

export default function AdminAttendanceMatrix({
  dateISO,
  sessionLabel,
  rows,
  showClassColumn = true,
  sessionTime,
  initialState = {},
  initialNotes = {},
  onStatsChange,
  statsRows,
  onBulkActionsReady,
  markedBy = "admin",
}: {
  dateISO: string;
  sessionLabel: string;
  rows: AdminAttendanceRow[];
  showClassColumn?: boolean;
  sessionTime?: string;
  initialState?: Record<string, boolean>;
  initialNotes?: Record<string, string | null>;
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
  markedBy?: "admin" | "teacher";
}) {
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(
    new Set()
  );
  const [pendingCellKeys, setPendingCellKeys] = useState<Set<string>>(
    new Set()
  );
  const [cellStates, setCellStates] =
    useState<Record<string, boolean>>(initialState);
  const [cellNotes, setCellNotes] = useState<Record<string, string | null>>(
    initialNotes || {}
  );
  const [pendingNoteKeys, setPendingNoteKeys] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setCellStates(initialState);
    setSelectedCellKeys(new Set());
    setPendingCellKeys(new Set());
    setCellNotes(initialNotes || {});
    setPendingNoteKeys(new Set());
  }, [initialState, initialNotes, sessionLabel, sessionTime]);

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

    // Thêm toast loading
    const personType = row.kind === "student" ? "Học sinh" : "Giáo viên";
    const status = present ? "có mặt" : "vắng";
    const loadingToastId = toast.loading(
      `Đang đánh dấu ${personType} ${row.full_name} ${status}...`
    );

    try {
      if (row.kind === "student") {
        await upsertStudentAttendance({
          classId: row.classId,
          studentId: row.id,
          date: dateISO,
          session_time: effectiveSession,
          is_present: present,
          marked_by: markedBy,
        });
      } else {
        await upsertTeacherAttendance({
          classId: row.classId,
          teacherId: row.id,
          date: dateISO,
          session_time: effectiveSession,
          is_present: present,
          marked_by: markedBy,
        });
      }
      setCellStates((state) => {
        const next = { ...state } as Record<string, boolean>;
        next[cellKey] = present;
        return next;
      });

      // Thay thế toast loading bằng toast success
      toast.success(`Đã đánh dấu ${personType} ${row.full_name} ${status}`, {
        id: loadingToastId,
      });
    } catch (error) {
      console.error("Admin attendance update failed", error);
      // Thay thế toast loading bằng toast error
      toast.error("Cập nhật điểm danh thất bại", {
        id: loadingToastId,
      });
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

  const handleNoteSave = async (row: AdminAttendanceRow, rawValue: string) => {
    const cellKey = `${row.key}@@${effectiveSession}`;
    const trimmed = rawValue.trim();
    const normalized = trimmed.length > 0 ? trimmed : null;
    setPendingNoteKeys((prev) => new Set(prev).add(cellKey));
    const personLabel = row.kind === "student" ? "Học sinh" : "Giáo viên";
    try {
      if (row.kind === "student") {
        await updateStudentAttendanceNote({
          classId: row.classId,
          studentId: row.id,
          date: dateISO,
          session_time: effectiveSession,
          notes: normalized,
        });
      } else {
        await updateTeacherAttendanceNote({
          classId: row.classId,
          teacherId: row.id,
          date: dateISO,
          session_time: effectiveSession,
          notes: normalized,
        });
      }
      setCellNotes((prev) => {
        const next = { ...prev };
        if (normalized) {
          next[cellKey] = normalized;
        } else {
          delete next[cellKey];
        }
        return next;
      });
      toast.success(
        normalized
          ? `Đã lưu ghi chú cho ${personLabel.toLowerCase()} ${row.full_name}`
          : `Đã xóa ghi chú cho ${personLabel.toLowerCase()} ${row.full_name}`
      );
    } catch (error) {
      console.error("Attendance note update failed", error);
      toast.error("Lưu ghi chú thất bại");
      throw error;
    } finally {
      setPendingNoteKeys((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  };

  const handleBulk = async (present: boolean) => {
    const targets: AdminAttendanceRow[] = [];
    selectedCellKeys.forEach((k) => {
      const [rowKey] = k.split("@@");
      const row = rows.find((r) => r.key === rowKey);
      if (row) targets.push(row);
    });

    if (targets.length === 0) return;

    // Thêm toast loading cho bulk update
    const status = present ? "có mặt" : "vắng";
    const loadingToastId = toast.loading(
      `Đang đánh dấu ${targets.length} người ${status}...`
    );

    try {
      await Promise.all(targets.map((row) => applyToggle(row, present)));
      setSelectedCellKeys(new Set());

      // Thay thế toast loading bằng toast success
      toast.success(`Đã đánh dấu ${targets.length} người ${status}`, {
        id: loadingToastId,
      });
    } catch (error) {
      console.error("Bulk attendance update failed", error);
      // Thay thế toast loading bằng toast error
      toast.error("Cập nhật điểm danh hàng loạt thất bại", {
        id: loadingToastId,
      });
    }
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
                <th className="px-3 py-2 text-left min-w-[200px]">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={(showClassColumn ? 1 : 0) + 4}
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
                  const noteValue = cellNotes[cellKey] ?? null;
                  const notePending = pendingNoteKeys.has(cellKey);
                  const canEditNote = typeof status === "boolean";
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
                        <div className="flex flex-wrap items-center justify-center gap-2">
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
                      <td className="px-3 py-2">
                        <div onClick={(event) => event.stopPropagation()}>
                          <AttendanceNoteEditorControl
                            note={noteValue}
                            pending={notePending}
                            canEdit={canEditNote}
                            fullWidth
                            onSave={(value) => handleNoteSave(row, value)}
                          />
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
              const noteValue = cellNotes[cellKey] ?? null;
              const notePending = pendingNoteKeys.has(cellKey);
              const canEditNote = typeof status === "boolean";
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
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium">Ghi chú</p>
                    <div onClick={(event) => event.stopPropagation()}>
                      <AttendanceNoteEditorControl
                        note={noteValue}
                        pending={notePending}
                        canEdit={canEditNote}
                        fullWidth
                        onSave={(value) => handleNoteSave(row, value)}
                      />
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

function AttendanceNoteEditorControl({
  note,
  pending,
  canEdit,
  inline,
  fullWidth,
  onSave,
}: {
  note: string | null;
  pending: boolean;
  canEdit: boolean;
  inline?: boolean;
  fullWidth?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(note ?? "");

  const handleSubmit = async () => {
    try {
      await onSave(value);
      setIsEditing(false);
    } catch {
      // Keep editor open for retry
    }
  };

  const normalizedOriginal = (note ?? "").trim();
  const normalizedDraft = value.trim();
  const isDirty = normalizedDraft !== normalizedOriginal;

  return (
    <div
      className={`text-left text-xs space-y-1 ${
        fullWidth ? "w-full" : inline ? "min-w-[120px]" : "w-full"
      }`}
    >
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Nhập ghi chú..."
            disabled={pending}
            className={`flex-1 ${fullWidth ? "" : "min-w-[200px]"}`}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(false)}
            disabled={pending}
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={pending || !isDirty}
          >
            {pending ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1 text-sm text-muted-foreground">
            <StickyNote className="h-4 w-4 text-primary" />
            <span className="truncate">{note || "Chưa có ghi chú"}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canEdit || pending}
            onClick={() => {
              setValue(note ?? "");
              setIsEditing(true);
            }}
            title={note ? "Sửa ghi chú" : "Thêm ghi chú"}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">
              {note ? "Sửa ghi chú" : "Thêm ghi chú"}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
