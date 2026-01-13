"use client";

import { memo, useMemo } from "react";
import { UpdateClassForm } from "@/components/forms/update-class-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrencyVN } from "@/lib/utils";
import { type ClassListItem } from "@/types";
import { Calendar, ClipboardCheck, Pencil, Info } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClassCardProps {
  classItem: ClassListItem;
  onViewSchedule: (classId: string, e: React.MouseEvent) => void;
}

import {
  checkClassDependencies,
  deleteClass,
} from "@/lib/services/admin-classes-service";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

function ClassCardComponent({ classItem: c, onViewSchedule }: ClassCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showWarningAlert, setShowWarningAlert] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // Memoize schedule count calculation
  const scheduleCount = useMemo(() => {
    try {
      const daysOfWeek =
        typeof c.days_of_week === "string"
          ? JSON.parse(c.days_of_week)
          : c.days_of_week;
      return Array.isArray(daysOfWeek) ? daysOfWeek.length : 0;
    } catch {
      return 0;
    }
  }, [c.days_of_week]);

  const capacityLabel = useMemo(() => {
    if (
      typeof c.current_student_count === "number" &&
      typeof c.max_student_count === "number" &&
      c.max_student_count > 0
    ) {
      return `${c.current_student_count}/${c.max_student_count} học sinh`;
    }
    return `${c.current_student_count ?? c.students_count} học sinh`;
  }, [c.current_student_count, c.max_student_count, c.students_count]);

  const handleAttendance = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams();
    params.set("classId", c.id);
    params.set("showAll", "true");
    router.push(`/admin/attendance?${params.toString()}`);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isPending) return;

      const result = await checkClassDependencies(c.id);
      if (result.hasData) {
        setWarningMessage(
          result.message || "Lớp học đang có dữ liệu liên quan."
        );
        setShowWarningAlert(true);
      } else {
        setShowDeleteAlert(true);
      }
    } catch (error) {
      toast.error("Có lỗi khi kiểm tra dữ liệu lớp học");
      console.error(error);
    }
  };

  const confirmDelete = () => {
    startTransition(async () => {
      try {
        await deleteClass(c.id, "/admin/classes");
        toast.success("Xóa lớp học thành công");
      } catch (error) {
        toast.error("Không thể xóa lớp học");
        console.error(error);
      } finally {
        setShowDeleteAlert(false);
        setShowWarningAlert(false);
      }
    });
  };

  const isFull =
    typeof c.current_student_count === "number" &&
    typeof c.max_student_count === "number" &&
    c.current_student_count >= c.max_student_count;

  return (
    <Card className="flex flex-col sm:flex-row border shadow-sm transition-all hover:border-primary/40 hover:shadow-md overflow-hidden group">
      {/* Left Content Section */}
      <div className="flex-1 p-3 flex flex-col gap-2 min-w-0 justify-center">
        {/* Header: Name + Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-tight truncate text-primary/90">
              {c.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {scheduleCount} ca
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span>{formatCurrencyVN(c.monthly_fee)}</span>
            </div>
          </div>
          <Badge
            variant={c.is_active ? "outline" : "secondary"}
            className={`text-[10px] px-1.5 py-0 h-5 ${c.is_active ? "border-green-500 text-green-600 bg-green-50" : ""}`}
          >
            {c.is_active ? "Hoạt động" : "Ngừng"}
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-xs pt-1 border-t border-dashed w-fit">
          <div className="flex items-center gap-1" title="Sĩ số">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isFull ? "bg-red-500" : "bg-green-500"}`}
            />
            <span className="font-medium text-foreground">{capacityLabel}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>GV:</span>
            <span className="font-medium text-foreground">
              {c.teachers_count}
            </span>
          </div>
        </div>
      </div>

      {/* Right Actions Section - Horizontal buttons */}
      <div className="flex items-center justify-end p-2 gap-1 border-t sm:border-t-0 sm:border-l bg-muted/10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={handleAttendance}
          title="Điểm danh"
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={(e) => onViewSchedule(c.id, e)}
          title="Xem lịch học"
        >
          <Calendar className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={() => router.push(`/admin/classes/${c.id}`)}
          title="Chi tiết lớp học"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>

        <UpdateClassForm classData={c}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            title="Chỉnh sửa"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </UpdateClassForm>

        <div className="w-px h-4 bg-border mx-1 hidden sm:block" />

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleDeleteClick}
          disabled={isPending}
          title="Xóa lớp học"
        >
          {isPending ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa lớp học?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lớp <strong>{c.name}</strong> không?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showWarningAlert} onOpenChange={setShowWarningAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Cảnh báo: Dữ liệu liên quan
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{warningMessage}</p>
              <p className="font-medium text-foreground">
                Nếu bạn tiếp tục, tất cả dữ liệu này sẽ bị xóa vĩnh viễn cùng
                với lớp học. Bạn có chắc chắn muốn tiếp tục không?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? "Đang xóa..." : "Vẫn xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export const ClassCard = memo(ClassCardComponent);
