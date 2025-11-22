"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  copyStudentsToClass,
  moveStudentsToClass,
} from "@/lib/services/admin-classes-service";
import { getClasses } from "@/lib/services/admin-classes-service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { StudentWithClassSummary } from "@/types";

interface BulkCopyCutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudents: StudentWithClassSummary[];
  action: "copy" | "cut";
  onSuccess?: () => void;
}

export function BulkCopyCutDialog({
  open,
  onOpenChange,
  selectedStudents,
  action,
}: BulkCopyCutDialogProps) {
  const router = useRouter();
  const [sourceClassId, setSourceClassId] = useState<string>("");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<"trial" | "active" | "inactive">(
    "trial"
  );
  const [bulkDate, setBulkDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [sourceClasses, setSourceClasses] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Collect all unique source classes from selected students
  useEffect(() => {
    if (!open || selectedStudents.length === 0) return;

    const classMap = new Map<string, { id: string; name: string }>();
    selectedStudents.forEach((student) => {
      student.class_summary?.forEach((cls) => {
        if (cls.classId && cls.className) {
          classMap.set(cls.classId, { id: cls.classId, name: cls.className });
        }
      });
    });

    const classes = Array.from(classMap.values());
    setSourceClasses(classes);

    // Auto-select first class if only one
    if (classes.length === 1) {
      setSourceClassId(classes[0].id);
    } else {
      setSourceClassId("");
    }
  }, [open, selectedStudents]);

  // Load available target classes
  useEffect(() => {
    if (!open) return;

    getClasses("", { limit: 1000 })
      .then((data) => {
        setAvailableClasses(data.map((c) => ({ id: c.id, name: c.name })));
      })
      .catch((error) => {
        console.error("Error loading classes:", error);
        toast.error("Lỗi khi tải danh sách lớp");
      });
  }, [open]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSourceClassId("");
      setTargetClassId("");
      setBulkStatus("trial");
      setBulkDate(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  const canSubmit =
    sourceClassId && targetClassId && selectedStudents.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    // Validate: all selected students must have the source class
    const studentsWithoutSourceClass = selectedStudents.filter((student) => {
      return !student.class_summary?.some(
        (cls) => cls.classId === sourceClassId
      );
    });

    if (studentsWithoutSourceClass.length > 0) {
      toast.error(
        `${studentsWithoutSourceClass.length} học sinh không có trong lớp nguồn đã chọn`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const studentIds = selectedStudents.map((s) => s.id);

      if (action === "copy") {
        const res = await copyStudentsToClass(
          sourceClassId,
          targetClassId,
          studentIds,
          {
            status: bulkStatus,
            enrollment_date: bulkDate,
            skipExisting: true,
            updateIfExists: false,
          },
          "/admin/students"
        );

        const msgCopy =
          res.skipped > 0
            ? `Copy: +${res.inserted}${res.updated ? `, cập nhật ${res.updated}` : ""}, bỏ qua ${res.skipped}`
            : `Copy: +${res.inserted}${res.updated ? `, cập nhật ${res.updated}` : ""}`;
        toast.success(msgCopy);

        // Show warning if there are conflicts
        if (res.warnings && res.warnings.conflicts.length > 0) {
          const warningMessages = res.warnings.conflicts.map(
            (w) => `${w.studentName} (đang học lớp ${w.conflictingClassName})`
          );
          const subjectName = res.warnings.subject || "môn học";
          toast.warning(
            `Cảnh báo: ${warningMessages.join(", ")} sẽ học 2 lớp cùng môn ${subjectName}.`,
            { duration: 6000 }
          );
        }
      } else {
        const res = await moveStudentsToClass(
          sourceClassId,
          targetClassId,
          studentIds,
          {
            status: bulkStatus,
            enrollment_date: bulkDate,
            skipExisting: true,
            updateIfExists: false,
          },
          "/admin/students"
        );

        const msgCut =
          res.skipped > 0
            ? `Cut: +${res.inserted}${res.updated ? `, cập nhật ${res.updated}` : ""}, bỏ qua ${res.skipped}, -${res.removedFromSource}`
            : `Cut: +${res.inserted}${res.updated ? `, cập nhật ${res.updated}` : ""}, -${res.removedFromSource}`;
        toast.success(msgCut);
      }

      router.refresh();
      onOpenChange(false);
    } catch (error) {
      console.error(`${action === "copy" ? "Copy" : "Cut"} error:`, error);
      toast.error(`${action === "copy" ? "Copy" : "Cut"} học sinh thất bại`, {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {action === "copy" ? "Copy" : "Cut"} {selectedStudents.length} học
            sinh
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Lớp nguồn *</Label>
            <Select value={sourceClassId} onValueChange={setSourceClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lớp nguồn" />
              </SelectTrigger>
              <SelectContent>
                {sourceClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceClasses.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Các học sinh đã chọn không có lớp chung
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Lớp đích *</Label>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lớp đích" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses
                  .filter((cls) => cls.id !== sourceClassId)
                  .map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select
              value={bulkStatus}
              onValueChange={(v) => setBulkStatus(v as typeof bulkStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Học thử</SelectItem>
                <SelectItem value="active">Đang học</SelectItem>
                <SelectItem value="inactive">Ngừng học</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ngày nhập học</Label>
            <Input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isProcessing}>
            {isProcessing
              ? "Đang xử lý..."
              : action === "copy"
                ? "Copy"
                : "Cut"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
