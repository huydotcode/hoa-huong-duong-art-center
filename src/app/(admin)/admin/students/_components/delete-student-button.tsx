"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import type { Student, StudentWithClassSummary } from "@/types";
import { deleteStudent } from "@/lib/services/admin-students-service";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

interface DeleteStudentButtonProps {
  student: Student | StudentWithClassSummary;
  className?: string;
}

export function DeleteStudentButton({
  student,
  className,
}: DeleteStudentButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const path = usePathname();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      // Kiểm tra ở client trước khi gọi server action
      const studentWithClasses = student as StudentWithClassSummary;
      const hasActiveClasses =
        studentWithClasses.class_summary?.some(
          (cls) => cls.status === "active" || cls.status === "trial"
        ) ?? false;

      if (hasActiveClasses) {
        const activeClassNames =
          studentWithClasses.class_summary
            ?.filter((cls) => cls.status === "active" || cls.status === "trial")
            .map((cls) => cls.className)
            .join(", ") || "các lớp đang học";

        toast.error("Không thể xóa học sinh", {
          description: `Học sinh đang học lớp: ${activeClassNames}. Vui lòng chuyển hoặc xóa phân công lớp trước.`,
        });
        setOpen(false);
        setIsDeleting(false);
        return;
      }

      await deleteStudent(student.id, path);
      toast.success("Đã xóa học sinh thành công");
      setOpen(false);
      // Notify client lists to optimistically remove the student
      try {
        window.dispatchEvent(
          new CustomEvent("student-deleted", { detail: { id: student.id } })
        );
      } catch {}
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Xóa học sinh thất bại", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => !isDeleting && setOpen(value)}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`text-destructive hover:text-destructive ${className ?? ""}`}
          title="Xóa học sinh"
          onClick={(event) => event.stopPropagation()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa học sinh</AlertDialogTitle>
          <AlertDialogDescription>
            Hành động này sẽ xóa học sinh{" "}
            <span className="font-semibold">{student.full_name}</span> khỏi hệ
            thống. Thao tác không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Xóa học sinh"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
