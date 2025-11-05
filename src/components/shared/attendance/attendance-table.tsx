"use client";

import { useState, useRef, useEffect } from "react";
import type * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Button } from "@/components/ui/button";
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
import { useAttendanceMutation } from "@/lib/hooks/use-attendance";
import { Checkbox } from "@/components/ui/checkbox";

type Student = { id: string; full_name: string; phone: string };

export function AttendanceTable(props: {
  students: Student[];
  attendanceMap: Record<string, boolean>;
  classId: string;
  date: string;
  sessionTime: string;
}) {
  const { students, attendanceMap, classId, date, sessionTime } = props;
  const { toggle } = useAttendanceMutation(classId, date, sessionTime);

  const [showSelectIds, setShowSelectIds] = useState<Set<string>>(new Set());
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [checkedStudentIds, setCheckedStudentIds] = useState<Set<string>>(
    new Set()
  );

  // Compute base showSelectIds from attendanceMap
  const baseShowSelectIds = new Set(Object.keys(attendanceMap));

  // Merge with manually added IDs
  const effectiveShowSelectIds = new Set([
    ...baseShowSelectIds,
    ...showSelectIds,
  ]);

  // Merge selectedMap with attendanceMap
  const effectiveSelectedMap: Record<string, boolean> = {
    ...attendanceMap,
    ...selectedMap,
  };

  const presentCount = students.filter((s) => attendanceMap[s.id]).length;
  const allChecked =
    students.length > 0 && checkedStudentIds.size === students.length;
  const someChecked =
    checkedStudentIds.size > 0 && checkedStudentIds.size < students.length;
  const selectAllCheckboxRef =
    useRef<React.ElementRef<typeof CheckboxPrimitive.Root>>(null);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const element =
        selectAllCheckboxRef.current as unknown as HTMLButtonElement;
      if (element && someChecked) {
        element.setAttribute("data-state", "indeterminate");
        element.ariaChecked = "mixed";
      }
    }
  }, [someChecked]);

  const handleToggle = async (studentId: string, present: boolean) => {
    try {
      await toggle.mutateAsync({ studentId, isPresent: present });
      // Show select with the chosen state for both present and absent
      showSelectFor(studentId, present);
    } catch {
      toast.error("Cập nhật điểm danh thất bại");
    }
  };

  const showSelectFor = (studentId: string, present: boolean) => {
    setSelectedMap((m) => ({ ...m, [studentId]: present }));
    setShowSelectIds((s) => new Set(s).add(studentId));
  };

  const handleSelectChange = (studentId: string, value: string) => {
    const present = value === "present";
    setSelectedMap((m) => ({ ...m, [studentId]: present }));
    handleToggle(studentId, present).catch(() => {
      toast.error("Cập nhật điểm danh thất bại");
    });
  };

  const toggleCheckbox = (studentId: string, checked: boolean) => {
    setCheckedStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setCheckedStudentIds(new Set(students.map((s) => s.id)));
    } else {
      setCheckedStudentIds(new Set());
    }
  };

  const handleSelectAll = () => {
    setCheckedStudentIds(new Set(students.map((s) => s.id)));
  };

  const handleDeselectAll = () => {
    setCheckedStudentIds(new Set());
  };

  const handleMarkSelectedPresent = async () => {
    const selectedIds = Array.from(checkedStudentIds);
    if (selectedIds.length === 0) {
      toast.info("Vui lòng chọn ít nhất một học sinh");
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((studentId) =>
          toggle.mutateAsync({ studentId, isPresent: true })
        )
      );
      // Show select for all checked students
      const newShowSelectIds = new Set(selectedIds);
      const newSelectedMap: Record<string, boolean> = {};
      selectedIds.forEach((id) => {
        newSelectedMap[id] = true;
      });
      setShowSelectIds(newShowSelectIds);
      setSelectedMap(newSelectedMap);
    } catch {
      toast.error("Cập nhật điểm danh thất bại");
    }
  };

  const handleMarkSelectedAbsent = async () => {
    const selectedIds = Array.from(checkedStudentIds);
    if (selectedIds.length === 0) {
      toast.info("Vui lòng chọn ít nhất một học sinh");
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((studentId) =>
          toggle.mutateAsync({ studentId, isPresent: false })
        )
      );
      // Show select for all checked students with absent state
      const newShowSelectIds = new Set(selectedIds);
      const newSelectedMap: Record<string, boolean> = {};
      selectedIds.forEach((id) => {
        newSelectedMap[id] = false;
      });
      setShowSelectIds(newShowSelectIds);
      setSelectedMap(newSelectedMap);
    } catch {
      toast.error("Cập nhật điểm danh thất bại");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground hidden sm:block">
          Học sinh có mặt: {presentCount}/{students.length}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="default"
            disabled={checkedStudentIds.size === 0 || toggle.isPending}
            onClick={handleMarkSelectedPresent}
          >
            Có mặt
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={checkedStudentIds.size === 0 || toggle.isPending}
            onClick={handleMarkSelectedAbsent}
          >
            Vắng
          </Button>
          <Button size="sm" variant="outline" onClick={handleSelectAll}>
            Chọn tất cả
          </Button>
          <Button size="sm" variant="outline" onClick={handleDeselectAll}>
            Bỏ chọn
          </Button>
        </div>
      </div>

      {/* Desktop/tablet (md+) layout: Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead className="w-[36px]">
                <Checkbox
                  ref={selectAllCheckboxRef}
                  checked={allChecked}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead className="text-right">Trạng thái</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Chưa có học sinh nào
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => {
                const checked = Boolean(attendanceMap[s.id]);
                const isPending = toggle.isPending;
                const isRowChecked = checkedStudentIds.has(s.id);
                return (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      // Don't toggle if clicking on interactive elements
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button") ||
                        target.closest("select") ||
                        target.closest('[role="combobox"]') ||
                        target.closest('[data-slot="checkbox"]')
                      ) {
                        return;
                      }
                      toggleCheckbox(s.id, !isRowChecked);
                    }}
                  >
                    <TableCell className="w-[36px]">
                      <Checkbox
                        checked={isRowChecked}
                        onCheckedChange={(checked) =>
                          toggleCheckbox(s.id, checked as boolean)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>{s.phone}</TableCell>
                    <TableCell>
                      {effectiveShowSelectIds.has(s.id) ? (
                        <div className="flex justify-end">
                          <Select
                            value={
                              effectiveSelectedMap[s.id] ? "present" : "absent"
                            }
                            onValueChange={(v) => handleSelectChange(s.id, v)}
                            disabled={isPending}
                          >
                            <SelectTrigger
                              className={`w-[120px] h-8 text-xs ${
                                effectiveSelectedMap[s.id]
                                  ? "border-primary focus-visible:ring-primary/50"
                                  : "border-destructive focus-visible:ring-destructive/50"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Có mặt</SelectItem>
                              <SelectItem value="absent">Vắng</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant={checked ? "default" : "outline"}
                            className="h-8 text-xs"
                            disabled={isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(s.id, true);
                            }}
                          >
                            Có mặt
                          </Button>
                          <Button
                            size="sm"
                            variant={!checked ? "destructive" : "outline"}
                            className="h-8 text-xs"
                            disabled={isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(s.id, false);
                            }}
                          >
                            Vắng
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile layout: each student as a card */}
      <div className="md:hidden space-y-2">
        {students.map((s) => {
          const checked = Boolean(attendanceMap[s.id]);
          const isPending = toggle.isPending;
          const isRowChecked = checkedStudentIds.has(s.id);
          return (
            <div
              key={s.id}
              className="border rounded p-3 cursor-pointer"
              onClick={(e) => {
                // Don't toggle if clicking on interactive elements
                const target = e.target as HTMLElement;
                if (
                  target.closest("button") ||
                  target.closest("select") ||
                  target.closest('[role="combobox"]') ||
                  target.closest('[data-slot="checkbox"]')
                ) {
                  return;
                }
                toggleCheckbox(s.id, !isRowChecked);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Checkbox
                    checked={isRowChecked}
                    onCheckedChange={(checked) =>
                      toggleCheckbox(s.id, checked as boolean)
                    }
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.phone}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {effectiveShowSelectIds.has(s.id) ? (
                    <Select
                      value={effectiveSelectedMap[s.id] ? "present" : "absent"}
                      onValueChange={(v) => handleSelectChange(s.id, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        className={`w-[120px] h-8 text-xs ${
                          effectiveSelectedMap[s.id]
                            ? "border-primary! focus-visible:border-primary! focus-visible:ring-primary/50"
                            : "border-destructive! focus-visible:border-destructive! focus-visible:ring-destructive/50"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Có mặt</SelectItem>
                        <SelectItem value="absent">Vắng</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={checked ? "default" : "outline"}
                        className="h-8 text-xs"
                        disabled={isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(s.id, true);
                        }}
                      >
                        Có mặt
                      </Button>
                      <Button
                        size="sm"
                        variant={!checked ? "destructive" : "outline"}
                        className="h-8 text-xs"
                        disabled={isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(s.id, false);
                        }}
                      >
                        Vắng
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
