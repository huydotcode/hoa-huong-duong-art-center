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
import type { Student } from "@/types";
import { deleteStudent } from "@/lib/services/admin-students-service";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";

interface DeleteStudentButtonProps {
  student: Student;
  className?: string;
}

export function DeleteStudentButton({
  student,
  className,
}: DeleteStudentButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const path = usePathname();

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteStudent(student.id, path);
      toast.success("Đã xóa học sinh thành công");
      setOpen(false);
      router.refresh();
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
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
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
