"use client";

import { memo, useMemo } from "react";
import { UpdateClassForm } from "@/components/forms/update-class-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrencyVN, formatDateRange } from "@/lib/utils";
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
    <Card className="border p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Lớp học
          </p>
          <h3 className="text-lg font-semibold leading-tight line-clamp-2">
            {c.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatDateRange(c.start_date, c.end_date)}
          </p>
        </div>
        <Badge variant={c.is_active ? "default" : "secondary"}>
          {c.is_active ? "Hoạt động" : "Ngừng"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">Lịch học</p>
          <p className="text-base font-semibold">{scheduleCount} ca / tuần</p>
        </div>
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">Học phí</p>
          <p className="text-base font-semibold">
            {formatCurrencyVN(c.monthly_fee)}
          </p>
        </div>
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">Lương / buổi</p>
          <p className="text-base font-semibold">
            {formatCurrencyVN(c.salary_per_session)}
          </p>
        </div>
        <div className="rounded-lg border p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">Giáo viên</p>
          <p className="text-base font-semibold">{c.teachers_count} người</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="space-y-1">
          <span className="block text-muted-foreground">Sĩ số</span>
          <span className="text-sm font-semibold text-foreground">
            {capacityLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Doanh thu dự kiến:</span>
          <span className="font-semibold text-foreground">
            {formatCurrencyVN((c.current_student_count ?? 0) * c.monthly_fee)}
          </span>
          {isFull && <Badge variant="destructive">Đã đầy</Badge>}
        </div>
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={handleAttendance}
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Điểm danh
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={(e) => onViewSchedule(c.id, e)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Xem lịch
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => router.push(`/admin/classes/${c.id}`)}
        >
          <Info className="mr-2 h-4 w-4" />
          Chi tiết
        </Button>
        <UpdateClassForm classData={c}>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Pencil className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        </UpdateClassForm>
        <Button
          variant="destructive"
          size="sm"
          className="h-9"
          onClick={handleDeleteClick}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
          Xóa
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
