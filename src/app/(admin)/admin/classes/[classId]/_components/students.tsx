"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { EnrollStudentForm } from "@/components/forms/enroll-student-form";
import { UpdateEnrollmentForm } from "@/components/forms/update-enrollment-form";
import {
  copyStudentsToClass,
  moveStudentsToClass,
} from "@/lib/services/admin-classes-service";
import { type ClassStudentItem } from "@/types";
import { formatEnrollmentStatus } from "@/lib/utils";
import { Plus, Pencil, Copy, Scissors } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import ClassStudentsSearchBar from "./class-students-search-bar";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function StudentsSection({
  classId,
  students,
  query,
  status = "all",
  targetClasses = [],
  enrolledStudentIds,
}: {
  classId: string;
  students: ClassStudentItem[];
  query: string;
  status?: "all" | "trial" | "active" | "inactive";
  targetClasses?: Array<{ id: string; name: string }>;
  enrolledStudentIds: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<
    string | null
  >(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<"trial" | "active" | "inactive">(
    "trial"
  );
  const [bulkDate, setBulkDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"copy" | "cut">("copy");

  const selectedEnrollment =
    students.find((s) => s.enrollment_id === selectedEnrollmentId) || null;

  const toggleSelect = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((prev) =>
      checked
        ? Array.from(new Set([...prev, studentId]))
        : prev.filter((id) => id !== studentId)
    );
  };

  const allSelected =
    selectedStudentIds.length > 0 &&
    selectedStudentIds.length === students.length;

  const toggleSelectAll = (checked: boolean) => {
    setSelectedStudentIds(checked ? students.map((s) => s.student.id) : []);
  };

  const canSubmit =
    selectedStudentIds.length > 0 && !!targetClassId && !isProcessing;

  const [skipExisting] = useState(true);
  const [updateIfExists] = useState(false);

  const handleCopy = async () => {
    if (!canSubmit) return;
    setIsProcessing(true);
    try {
      const res = await copyStudentsToClass(
        classId,
        targetClassId,
        selectedStudentIds,
        {
          status: bulkStatus,
          enrollment_date: bulkDate,
          skipExisting,
          updateIfExists,
        },
        pathname
      );
      const msgCopy =
        res.skipped > 0
          ? `Copy: +${res.inserted}${res.updated ? `, cập nhật ${res.updated}` : ""}, bỏ qua ${res.skipped}`
          : `Copy: +${res.inserted}${res.updated ? `, cập nhật ${res.updated}` : ""}`;
      toast.success(msgCopy);
      router.refresh();
      setSelectedStudentIds([]);
      setBulkDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCut = async () => {
    if (!canSubmit) return;
    setIsProcessing(true);
    try {
      const res = await moveStudentsToClass(
        classId,
        targetClassId,
        selectedStudentIds,
        {
          status: bulkStatus,
          enrollment_date: bulkDate,
          skipExisting,
          updateIfExists,
        },
        pathname
      );
      const msgCut =
        res.skipped > 0
          ? `Cut: +${res.inserted}${res.updated ? `, cập nhật ${res.updated}` : ""}, bỏ qua ${res.skipped}, -${res.removedFromSource}`
          : `Cut: +${res.inserted}${res.updated ? `, cập nhật ${res.updated}` : ""}, -${res.removedFromSource}`;
      toast.success(msgCut);
      router.refresh();
      setSelectedStudentIds([]);
      setBulkDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {/* Search bar full width on mobile */}
        <div className="w-full md:w-auto">
          <ClassStudentsSearchBar />
        </div>
        {/* Actions: status filter + add button; bulk ops via modal when selecting */}
        <div className="w-full md:w-auto flex flex-col gap-2 md:gap-2">
          <div className="w-full flex items-center gap-2 justify-between md:justify-end">
            <div className="flex-1 md:flex-none">
              <Select
                value={status}
                onValueChange={(value) => {
                  const sp = new URLSearchParams(searchParams?.toString());
                  if (value === "all") {
                    sp.delete("status");
                  } else {
                    sp.set("status", value);
                  }
                  router.push(`${pathname}?${sp.toString()}`);
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Lọc trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="trial">Học thử</SelectItem>
                  <SelectItem value="active">Đang học</SelectItem>
                  <SelectItem value="inactive">Ngừng học</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="shrink-0">
              <EnrollStudentForm
                classId={classId}
                enrolledStudentIds={enrolledStudentIds}
              >
                <Button size="sm" className="whitespace-nowrap">
                  <Plus className="size-4" />
                  Thêm học sinh
                </Button>
              </EnrollStudentForm>
            </div>
          </div>

          {/* Bulk actions trigger - only show when there is selection */}
          {selectedStudentIds.length > 0 && (
            <div className="w-full flex flex-col md:flex-row md:items-center gap-2 md:justify-end">
              <div className="text-xs text-muted-foreground">
                Đã chọn: {selectedStudentIds.length}
              </div>
              <div className="flex gap-2 md:justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setBulkAction("copy");
                    setBulkDialogOpen(true);
                  }}
                >
                  <Copy className="size-4 mr-1" /> Copy
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setBulkAction("cut");
                    setBulkDialogOpen(true);
                  }}
                >
                  <Scissors className="size-4 mr-1" /> Cut
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {query && (
        <p className="mb-2 px-3 text-sm text-muted-foreground">
          Đang tìm danh sách học sinh theo:{" "}
          <span className="font-medium text-foreground">
            &quot;{query}&quot;
          </span>
        </p>
      )}

      {/* Mobile: Card view */}
      <div className="grid gap-2 md:hidden">
        {students.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Chưa có học sinh nào
          </p>
        ) : (
          <>
            {/* Mobile select-all */}
            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
              <span>Chọn tất cả</span>
            </div>
            {students.map((s) => (
              <Card
                key={s.enrollment_id}
                className={`border p-3 cursor-pointer hover:bg-muted/50 relative pl-10 ${
                  !s.student.is_active ? "opacity-60 bg-muted/30" : ""
                }`}
                onClick={() => setSelectedEnrollmentId(s.enrollment_id)}
              >
                {/* Mobile item checkbox */}
                <input
                  type="checkbox"
                  className="size-4 absolute left-3 top-3"
                  checked={selectedStudentIds.includes(s.student.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => toggleSelect(s.student.id, e.target.checked)}
                />
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{s.student.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {s.student.phone || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Đăng ký:{" "}
                      {format(new Date(s.enrollment_date), "dd/MM/yyyy", {
                        locale: vi,
                      })}
                    </p>
                    {s.leave_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Rời lớp:{" "}
                        {format(new Date(s.leave_date), "dd/MM/yyyy", {
                          locale: vi,
                        })}
                      </p>
                    )}
                    {s.leave_reason && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Lý do: {s.leave_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 justify-end">
                    <Badge
                      variant={
                        s.status === "active"
                          ? "default"
                          : s.status === "trial"
                            ? "outline"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {formatEnrollmentStatus(s.status)}
                    </Badge>
                    {!s.student.is_active && (
                      <Badge variant="destructive" className="text-xs">
                        Đã ẩn
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead className="w-[36px]">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
              <TableHead>Ngày rời lớp</TableHead>
              <TableHead>Lý do rời lớp</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Chưa có học sinh nào
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow
                  key={s.enrollment_id}
                  className={
                    !s.student.is_active ? "opacity-60 bg-muted/30" : ""
                  }
                >
                  <TableCell className="w-[36px]">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={selectedStudentIds.includes(s.student.id)}
                      onChange={(e) =>
                        toggleSelect(s.student.id, e.target.checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {s.student.full_name}
                  </TableCell>
                  <TableCell>{s.student.phone || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(s.enrollment_date), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.leave_date
                      ? format(new Date(s.leave_date), "dd/MM/yyyy", {
                          locale: vi,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px]">
                    {s.leave_reason ? (
                      <span className="truncate block" title={s.leave_reason}>
                        {s.leave_reason}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge
                        variant={
                          s.status === "active"
                            ? "default"
                            : s.status === "trial"
                              ? "outline"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {formatEnrollmentStatus(s.status)}
                      </Badge>
                      {!s.student.is_active && (
                        <Badge variant="destructive" className="text-xs">
                          Đã ẩn
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedEnrollmentId(s.enrollment_id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedEnrollment && (
        <UpdateEnrollmentForm
          enrollment={selectedEnrollment}
          open={selectedEnrollmentId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedEnrollmentId(null);
          }}
        />
      )}

      {/* Bulk operation modal */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === "copy"
                ? "Copy học sinh sang lớp khác"
                : "Cut học sinh sang lớp khác"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <div className="text-sm font-medium mb-1">Lớp đích</div>
              <Select value={targetClassId} onValueChange={setTargetClassId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn lớp đích" />
                </SelectTrigger>
                <SelectContent>
                  {targetClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="text-sm font-medium mb-1">Trạng thái</div>
                <Select
                  value={bulkStatus}
                  onValueChange={(v) =>
                    setBulkStatus(v as "trial" | "active" | "inactive")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Học thử</SelectItem>
                    <SelectItem value="active">Đang học</SelectItem>
                    <SelectItem value="inactive">Ngừng học</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Ngày đăng ký</div>
                <input
                  type="date"
                  className="w-full border rounded-md h-9 px-2 text-sm bg-background"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                />
              </div>
            </div>
            {/* Duplicate handling defaults: skipExisting=true, updateIfExists=false (hidden) */}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              Hủy
            </Button>
            <Button
              onClick={bulkAction === "copy" ? handleCopy : handleCut}
              disabled={!canSubmit || isProcessing}
              className="w-full sm:w-auto"
              variant={bulkAction === "copy" ? "default" : "destructive"}
            >
              {isProcessing
                ? "Đang xử lý..."
                : bulkAction === "copy"
                  ? "Xác nhận Copy"
                  : "Xác nhận Cut"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
