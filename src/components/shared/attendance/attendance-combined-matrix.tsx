"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import {
  useAttendanceToggleAnySession,
  useTeacherAttendanceToggleAnySession,
} from "@/lib/hooks/use-attendance";

type Student = { id: string; full_name: string; phone: string | null };
type Teacher = { id: string; full_name: string; phone: string };

type FilterMode = "all" | "teacher" | "student";

export function AttendanceCombinedMatrix(props: {
  students: Student[];
  teachers: Teacher[];
  sessions: string[];
  studentAttendanceBySession: Record<string, Record<string, boolean>>;
  teacherAttendanceBySession: Record<string, Record<string, boolean>>;
  classId: string;
  date: string;
  filter: FilterMode;
  controlsPlacement?: "internal" | "hidden";
  onBulkActionsReady?: (api: {
    markSelected: (present: boolean) => void;
    disabled: boolean;
  }) => void;
}) {
  const {
    students,
    teachers,
    sessions,
    studentAttendanceBySession,
    teacherAttendanceBySession,
    classId,
    date,
    filter,
  } = props;

  const toggleStudent = useAttendanceToggleAnySession(classId, date);
  const toggleTeacher = useTeacherAttendanceToggleAnySession(classId, date);

  type Row = {
    key: string;
    id: string;
    kind: "student" | "teacher";
    full_name: string;
    phone: string;
  };
  const rows: Row[] = useMemo(() => {
    const tRows: Row[] = teachers.map((t) => ({
      key: `t:${t.id}`,
      id: t.id,
      kind: "teacher",
      full_name: t.full_name,
      phone: t.phone,
    }));
    const sRows: Row[] = students.map((s) => ({
      key: `s:${s.id}`,
      id: s.id,
      kind: "student",
      full_name: s.full_name,
      phone: s.phone || "",
    }));
    let all = [...tRows, ...sRows];
    if (filter === "teacher") all = tRows;
    if (filter === "student") all = sRows;
    return all;
  }, [teachers, students, filter]);

  // UI state per session keyed by row key (kind:id)
  const [showSelectIdsBySession, setShowSelectIdsBySession] = useState<
    Record<string, Set<string>>
  >({});
  const [selectedMapBySession, setSelectedMapBySession] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const baseShowSelectIdsBySession: Record<
    string,
    Set<string>
  > = useMemo(() => {
    const obj: Record<string, Set<string>> = {};
    sessions.forEach((s) => {
      const base = new Set<string>();
      Object.keys(studentAttendanceBySession[s] || {}).forEach((id) =>
        base.add(`s:${id}`)
      );
      Object.keys(teacherAttendanceBySession[s] || {}).forEach((id) =>
        base.add(`t:${id}`)
      );
      obj[s] = base;
    });
    return obj;
  }, [sessions, studentAttendanceBySession, teacherAttendanceBySession]);

  const effectiveShowSelectIdsBySession: Record<
    string,
    Set<string>
  > = useMemo(() => {
    const obj: Record<string, Set<string>> = {};
    sessions.forEach((s) => {
      obj[s] = new Set([
        ...Array.from(baseShowSelectIdsBySession[s] || new Set<string>()),
        ...Array.from(showSelectIdsBySession[s] || new Set<string>()),
      ]);
    });
    return obj;
  }, [sessions, baseShowSelectIdsBySession, showSelectIdsBySession]);

  const effectiveSelectedMapBySession: Record<
    string,
    Record<string, boolean>
  > = useMemo(() => {
    const obj: Record<string, Record<string, boolean>> = {};
    sessions.forEach((s) => {
      const combined: Record<string, boolean> = {};
      Object.entries(studentAttendanceBySession[s] || {}).forEach(
        ([id, v]) => (combined[`s:${id}`] = v)
      );
      Object.entries(teacherAttendanceBySession[s] || {}).forEach(
        ([id, v]) => (combined[`t:${id}`] = v)
      );
      obj[s] = { ...combined, ...(selectedMapBySession[s] || {}) };
    });
    return obj;
  }, [
    sessions,
    studentAttendanceBySession,
    teacherAttendanceBySession,
    selectedMapBySession,
  ]);

  // Removed row selection; bulk now applies to selected cells or all rows in selected columns

  const [pendingCellKeys, setPendingCellKeys] = useState<Set<string>>(
    new Set()
  );

  // Mobile card selection state
  const [selectedMobileRowKeys, setSelectedMobileRowKeys] = useState<
    Set<string>
  >(new Set());
  const [isMobileBulkPending, setIsMobileBulkPending] = useState(false);

  const handleMobileBulkMark = useCallback(
    async (present: boolean) => {
      const session = sessions[0];
      if (!session || selectedMobileRowKeys.size === 0) return;
      const selectedRows = rows.filter((r) => selectedMobileRowKeys.has(r.key));

      // Thêm toast loading
      const status = present ? "có mặt" : "vắng";
      const loadingToastId = toast.loading(
        `Đang đánh dấu ${selectedRows.length} người ${status}...`
      );

      setIsMobileBulkPending(true);
      try {
        await Promise.all(
          selectedRows.map((row) =>
            row.kind === "student"
              ? toggleStudent.mutateAsync({
                  sessionTime: session,
                  studentId: row.id,
                  isPresent: present,
                })
              : toggleTeacher.mutateAsync({
                  sessionTime: session,
                  teacherId: row.id,
                  isPresent: present,
                })
          )
        );
        setShowSelectIdsBySession((prev) => {
          const next = { ...prev } as Record<string, Set<string>>;
          const setForSession = new Set(next[session] || []);
          selectedRows.forEach((r) => setForSession.add(r.key));
          next[session] = setForSession;
          return next;
        });
        setSelectedMapBySession((prev) => {
          const next = { ...prev } as Record<string, Record<string, boolean>>;
          const mapForSession = { ...(next[session] || {}) };
          selectedRows.forEach((r) => (mapForSession[r.key] = present));
          next[session] = mapForSession;
          return next;
        });
        setSelectedMobileRowKeys(new Set());

        // Thay thế toast loading bằng toast success
        toast.success(`Đã đánh dấu ${selectedRows.length} người ${status}`, {
          id: loadingToastId,
        });
      } catch {
        // Thay thế toast loading bằng toast error
        toast.error("Cập nhật điểm danh thất bại", {
          id: loadingToastId,
        });
      } finally {
        setIsMobileBulkPending(false);
      }
    },
    [selectedMobileRowKeys, sessions, rows, toggleStudent, toggleTeacher]
  );

  const applyToggle = async (session: string, row: Row, present: boolean) => {
    const cellKey = `${row.key}@@${session}`;
    setPendingCellKeys((prev) => {
      const next = new Set(prev);
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
        await toggleStudent.mutateAsync({
          sessionTime: session,
          studentId: row.id,
          isPresent: present,
        });
      } else {
        await toggleTeacher.mutateAsync({
          sessionTime: session,
          teacherId: row.id,
          isPresent: present,
        });
      }
      setShowSelectIdsBySession((prev) => {
        const next = { ...prev };
        const setForSession = new Set(next[session] || []);
        setForSession.add(row.key);
        next[session] = setForSession;
        return next;
      });
      setSelectedMapBySession((prev) => ({
        ...prev,
        [session]: { ...(prev[session] || {}), [row.key]: present },
      }));

      // Thay thế toast loading bằng toast success
      toast.success(`Đã đánh dấu ${personType} ${row.full_name} ${status}`, {
        id: loadingToastId,
      });
    } catch {
      // Thay thế toast loading bằng toast error
      toast.error("Cập nhật điểm danh thất bại", {
        id: loadingToastId,
      });
    } finally {
      setPendingCellKeys((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  };

  const handleSelectChange = (session: string, row: Row, value: string) => {
    const present = value === "present";
    setSelectedMapBySession((prev) => ({
      ...prev,
      [session]: { ...(prev[session] || {}), [row.key]: present },
    }));
    // applyToggle đã xử lý toast loading/success/error rồi, không cần catch ở đây
    applyToggle(session, row, present).catch(() => {
      // Error đã được xử lý trong applyToggle
    });
  };

  // Removed legacy per-session bulk function (replaced by column multi-select)

  const isAnyPending = toggleStudent.isPending || toggleTeacher.isPending;
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set()
  );
  const [selectedCellKeys, setSelectedCellKeys] = useState<Set<string>>(
    new Set()
  );

  const toggleSessionSelect = (session: string, checked: boolean) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (checked) next.add(session);
      else next.delete(session);
      return next;
    });
  };

  const markSelectedForSelectedSessions = useCallback(
    async (present: boolean) => {
      const sessionsToApply = Array.from(selectedSessions);
      const cellKeys = Array.from(selectedCellKeys);
      if (sessionsToApply.length === 0 && cellKeys.length === 0) {
        toast.info("Chọn ít nhất 1 cột hoặc 1 ô");
        return;
      }

      // Tính số lượng người sẽ được đánh dấu
      const selectedRows = rows;
      const totalCount =
        cellKeys.length > 0
          ? cellKeys.length
          : sessionsToApply.length * selectedRows.length;

      // Thêm toast loading
      const status = present ? "có mặt" : "vắng";
      const loadingToastId = toast.loading(
        `Đang đánh dấu ${totalCount} người ${status}...`
      );

      try {
        await Promise.all(
          cellKeys.length > 0
            ? cellKeys.map((ck) => {
                const [rKey, session] = ck.split("@@");
                const row = rows.find((r) => r.key === rKey);
                if (!row) return Promise.resolve();
                return row.kind === "student"
                  ? toggleStudent.mutateAsync({
                      sessionTime: session,
                      studentId: row.id,
                      isPresent: present,
                    })
                  : toggleTeacher.mutateAsync({
                      sessionTime: session,
                      teacherId: row.id,
                      isPresent: present,
                    });
              })
            : sessionsToApply.flatMap((session) =>
                selectedRows.map((row) =>
                  row.kind === "student"
                    ? toggleStudent.mutateAsync({
                        sessionTime: session,
                        studentId: row.id,
                        isPresent: present,
                      })
                    : toggleTeacher.mutateAsync({
                        sessionTime: session,
                        teacherId: row.id,
                        isPresent: present,
                      })
                )
              )
        );
        // Update local UI state for displayed selects
        setShowSelectIdsBySession((prev) => {
          const next = { ...prev } as Record<string, Set<string>>;
          if (cellKeys.length > 0) {
            cellKeys.forEach((ck) => {
              const [rKey, session] = ck.split("@@");
              const setForSession = new Set(next[session] || []);
              setForSession.add(rKey);
              next[session] = setForSession;
            });
          } else {
            sessionsToApply.forEach((session) => {
              const setForSession = new Set(next[session] || []);
              selectedRows.forEach((r) => setForSession.add(r.key));
              next[session] = setForSession;
            });
          }
          return next;
        });
        setSelectedMapBySession((prev) => {
          const next = { ...prev } as Record<string, Record<string, boolean>>;
          if (cellKeys.length > 0) {
            cellKeys.forEach((ck) => {
              const [rKey, session] = ck.split("@@");
              const mapForSession = { ...(next[session] || {}) };
              mapForSession[rKey] = present;
              next[session] = mapForSession;
            });
          } else {
            sessionsToApply.forEach((session) => {
              const mapForSession = { ...(next[session] || {}) };
              selectedRows.forEach((r) => (mapForSession[r.key] = present));
              next[session] = mapForSession;
            });
          }
          return next;
        });
        // Clear all selections after successful apply
        setSelectedCellKeys(new Set());
        setSelectedSessions(new Set());

        // Thay thế toast loading bằng toast success
        toast.success(`Đã đánh dấu ${totalCount} người ${status}`, {
          id: loadingToastId,
        });
      } catch {
        // Thay thế toast loading bằng toast error
        toast.error("Cập nhật điểm danh thất bại", {
          id: loadingToastId,
        });
      }
    },
    [selectedSessions, selectedCellKeys, rows, toggleStudent, toggleTeacher]
  );
  // no long-press timers (minimal cell UI removed)

  // expose bulk actions to parent when requested (avoid calling during render)
  const { onBulkActionsReady } = props;
  useEffect(() => {
    if (onBulkActionsReady) {
      onBulkActionsReady({
        markSelected: (present: boolean) =>
          void markSelectedForSelectedSessions(present),
        disabled:
          (selectedSessions.size === 0 && selectedCellKeys.size === 0) ||
          isAnyPending,
      });
    }
  }, [
    onBulkActionsReady,
    selectedSessions,
    selectedCellKeys,
    isAnyPending,
    markSelectedForSelectedSessions,
  ]);

  const allMobileRowsSelected =
    rows.length > 0 && selectedMobileRowKeys.size === rows.length;
  const mobileHasSelection = selectedMobileRowKeys.size > 0;

  // Calculate present students count for mobile display
  const presentStudentIds = new Set<string>();
  Object.values(studentAttendanceBySession).forEach((sessionMap) => {
    Object.entries(sessionMap).forEach(([studentId, isPresent]) => {
      if (isPresent) {
        presentStudentIds.add(studentId);
      }
    });
  });
  const presentCount = presentStudentIds.size;
  const totalStudents = students.length;

  return (
    <>
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allMobileRowsSelected}
                onCheckedChange={(checked) =>
                  setSelectedMobileRowKeys(
                    checked ? new Set(rows.map((r) => r.key)) : new Set()
                  )
                }
              />
              <span className="text-sm text-muted-foreground">Chọn tất cả</span>
              <span className="text-sm text-muted-foreground ml-2">
                Có mặt {presentCount}/{totalStudents} HS
              </span>
            </div>
            {mobileHasSelection && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  disabled={isMobileBulkPending}
                  onClick={() => handleMobileBulkMark(true)}
                >
                  Có
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isMobileBulkPending}
                  onClick={() => handleMobileBulkMark(false)}
                >
                  Vắng
                </Button>
              </div>
            )}
          </div>
        )}
        {rows.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            Không có dữ liệu
          </Card>
        ) : (
          rows.map((row) => {
            const session = sessions[0];
            if (!session) {
              return (
                <Card key={`m-${row.key}`} className="p-3">
                  <div className="text-sm text-muted-foreground">
                    Không có dữ liệu
                  </div>
                </Card>
              );
            }
            const showSelect = effectiveShowSelectIdsBySession[session]?.has(
              row.key
            );
            const selectedPresent =
              effectiveSelectedMapBySession[session]?.[row.key];
            const checked = Boolean(
              row.kind === "student"
                ? (studentAttendanceBySession[session] || {})[row.id]
                : (teacherAttendanceBySession[session] || {})[row.id]
            );
            const current = (selectedPresent ?? checked) as boolean;
            const cellKey = `${row.key}@@${session}`;
            const isPending = pendingCellKeys.has(cellKey);
            const isSelected = selectedMobileRowKeys.has(row.key);
            return (
              <Card
                key={`m-${row.key}`}
                className={`p-3 cursor-pointer ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.closest("button") ||
                    target.closest("[role=combobox]") ||
                    target.closest("[data-radix-select-trigger]") ||
                    target.closest("[data-radix-checkbox]")
                  ) {
                    return;
                  }
                  setSelectedMobileRowKeys((prev) => {
                    const next = new Set(prev);
                    if (next.has(row.key)) next.delete(row.key);
                    else next.add(row.key);
                    return next;
                  });
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        setSelectedMobileRowKeys((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(row.key);
                          else next.delete(row.key);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden"
                    />
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2 truncate">
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
                        {row.phone}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {showSelect ? (
                      <Select
                        value={current ? "present" : "absent"}
                        onValueChange={(v) =>
                          handleSelectChange(session, row, v)
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger
                          className={`w-[92px] h-8 text-xs ${
                            current
                              ? "border-primary! focus-visible:border-primary! focus-visible:ring-primary/50"
                              : "border-destructive! focus-visible:border-destructive! focus-visible:ring-destructive/50"
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Có</SelectItem>
                          <SelectItem value="absent">Vắng</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant={current ? "default" : "outline"}
                          className="h-8 px-3 text-xs"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSelectIdsBySession((prev) => {
                              const next = { ...prev } as Record<
                                string,
                                Set<string>
                              >;
                              const setForSession = new Set(
                                next[session] || []
                              );
                              setForSession.add(row.key);
                              next[session] = setForSession;
                              return next;
                            });
                            applyToggle(session, row, true);
                          }}
                        >
                          Có
                        </Button>
                        <Button
                          size="sm"
                          variant={!current ? "destructive" : "outline"}
                          className="h-8 px-3 text-xs"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSelectIdsBySession((prev) => {
                              const next = { ...prev } as Record<
                                string,
                                Set<string>
                              >;
                              const setForSession = new Set(
                                next[session] || []
                              );
                              setForSession.add(row.key);
                              next[session] = setForSession;
                              return next;
                            });
                            applyToggle(session, row, false);
                          }}
                        >
                          Vắng
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        {props.controlsPlacement !== "hidden" && (
          <div className="mb-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={
                (selectedSessions.size === 0 && selectedCellKeys.size === 0) ||
                isAnyPending
              }
              onClick={() => markSelectedForSelectedSessions(true)}
            >
              Có
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={
                (selectedSessions.size === 0 && selectedCellKeys.size === 0) ||
                isAnyPending
              }
              onClick={() => markSelectedForSelectedSessions(false)}
            >
              Vắng
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Tên</TableHead>
              <TableHead>Số điện thoại</TableHead>
              {sessions.map((s) => (
                <TableHead
                  key={`head-${s}`}
                  className={`text-center ${selectedSessions.has(s) ? "bg-accent" : ""}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium">{s}</span>
                    <Checkbox
                      className="bg-background border border-muted rounded"
                      checked={selectedSessions.has(s)}
                      onCheckedChange={(checked) =>
                        toggleSessionSelect(s, Boolean(checked))
                      }
                    />
                  </div>
                </TableHead>
              ))}
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3 + sessions.length}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.key} className="hover:bg-transparent">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{row.full_name}</span>
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
                  </TableCell>
                  <TableCell>{row.phone}</TableCell>
                  {sessions.map((session) => {
                    const showSelect = effectiveShowSelectIdsBySession[
                      session
                    ]?.has(row.key);
                    const selectedPresent =
                      effectiveSelectedMapBySession[session]?.[row.key];
                    const checked = Boolean(
                      row.kind === "student"
                        ? (studentAttendanceBySession[session] || {})[row.id]
                        : (teacherAttendanceBySession[session] || {})[row.id]
                    );
                    const openSelect = () => {
                      setShowSelectIdsBySession((prev) => {
                        const next = { ...prev };
                        const setForSession = new Set(next[session] || []);
                        setForSession.add(row.key);
                        next[session] = setForSession;
                        return next;
                      });
                    };
                    const current = (selectedPresent ?? checked) as boolean;
                    const cellKey = `${row.key}@@${session}`;
                    const isCellSelected = selectedCellKeys.has(cellKey);
                    const isPending = pendingCellKeys.has(cellKey);
                    const toggleCell = () => {
                      setSelectedCellKeys((prev) => {
                        const next = new Set(prev);
                        if (next.has(cellKey)) next.delete(cellKey);
                        else next.add(cellKey);
                        return next;
                      });
                    };
                    return (
                      <TableCell
                        key={`cell-${row.key}-${session}`}
                        className={`text-center cursor-pointer hover:bg-muted/50 transition-colors ${selectedSessions.has(session) ? "bg-accent/40" : ""} ${isCellSelected ? "bg-primary/15" : ""}`}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (
                            target.closest("button") ||
                            target.closest("[role=combobox]") ||
                            target.closest("[data-radix-select-trigger]")
                          ) {
                            return;
                          }
                          toggleCell();
                        }}
                      >
                        {showSelect ? (
                          <div className="flex justify-center">
                            <Select
                              value={current ? "present" : "absent"}
                              onValueChange={(v) =>
                                handleSelectChange(session, row, v)
                              }
                              disabled={isPending}
                            >
                              <SelectTrigger
                                className={`w-[120px] h-8 text-xs ${
                                  current
                                    ? "border-primary! focus-visible:border-primary! focus-visible:ring-primary/50"
                                    : "border-destructive! focus-visible:border-destructive! focus-visible:ring-destructive/50"
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Có</SelectItem>
                                <SelectItem value="absent">Vắng</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-center">
                            <Button
                              size="sm"
                              variant={current ? "default" : "outline"}
                              className="h-8 text-xs"
                              disabled={isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                openSelect();
                                applyToggle(session, row, true);
                              }}
                            >
                              Có
                            </Button>
                            <Button
                              size="sm"
                              variant={!current ? "destructive" : "outline"}
                              className="h-8 text-xs"
                              disabled={isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                openSelect();
                                applyToggle(session, row, false);
                              }}
                            >
                              Vắng
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
