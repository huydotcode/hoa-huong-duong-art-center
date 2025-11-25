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
import { enrollStudents } from "@/lib/services/admin-classes-service";
import { getClasses } from "@/lib/services/admin-classes-service";
import { getStudentById } from "@/lib/services/admin-students-service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { StudentWithClassSummary } from "@/types";
import type { ClassListItem } from "@/types";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function formatClassSchedule(cls?: ClassListItem) {
  if (!cls || !cls.days_of_week || cls.days_of_week.length === 0) {
    return "Chưa có lịch học";
  }

  return cls.days_of_week
    .map((slot) => {
      const day = DAY_LABELS[slot.day] ?? `Thứ ${slot.day}`;
      const start = slot.start_time?.slice(0, 5);
      const end = slot.end_time?.slice(0, 5);

      if (start && end) {
        return `${day} · ${start}-${end}`;
      }
      if (start) {
        return `${day} · ${start}`;
      }
      return day;
    })
    .join(", ");
}

interface BulkEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudents: StudentWithClassSummary[];
  onSuccess?: () => void;
}

export function BulkEnrollDialog({
  open,
  onOpenChange,
  selectedStudents,
}: BulkEnrollDialogProps) {
  const router = useRouter();
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<"trial" | "active" | "inactive">(
    "trial"
  );
  const [bulkDate, setBulkDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<ClassListItem[]>([]);

  // Load available classes
  useEffect(() => {
    if (!open) return;

    getClasses("", { limit: 1000 })
      .then((data) => {
        setAvailableClasses(data);
      })
      .catch((error) => {
        console.error("Error loading classes:", error);
        toast.error("Lỗi khi tải danh sách lớp");
      });
  }, [open]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setTargetClassId("");
      setBulkStatus("trial");
      setBulkDate(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  const canSubmit = targetClassId && selectedStudents.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsProcessing(true);
    try {
      const studentIds = selectedStudents.map((s) => s.id);

      await enrollStudents(
        targetClassId,
        studentIds,
        {
          status: bulkStatus,
          enrollment_date: bulkDate,
        },
        "/admin/students"
      );

      toast.success(`Đã thêm ${studentIds.length} học sinh vào lớp thành công`);

      // Fetch updated student data and dispatch events to update the table
      try {
        const updatedStudents = await Promise.all(
          studentIds.map((id) => getStudentById(id))
        );

        // Dispatch events for each updated student
        updatedStudents.forEach((student) => {
          if (student) {
            window.dispatchEvent(
              new CustomEvent("student-updated", {
                detail: { student },
              })
            );
          }
        });
      } catch (error) {
        console.error("Error fetching updated students:", error);
        // Fallback to router refresh if event dispatch fails
        router.refresh();
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Enroll error:", error);
      toast.error("Thêm học sinh vào lớp thất bại", {
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
            Thêm {selectedStudents.length} học sinh vào lớp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Lớp *</Label>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn lớp" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => {
                  const scheduleText = formatClassSchedule(cls);
                  return (
                    <SelectItem key={cls.id} value={cls.id}>
                      <div className="flex items-start flex-col gap-0.5">
                        <span>{cls.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {scheduleText}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
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
            {isProcessing ? "Đang xử lý..." : "Thêm vào lớp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
