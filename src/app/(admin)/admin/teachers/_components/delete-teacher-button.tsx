"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { deleteTeacher } from "@/lib/services/admin-teachers-service";

interface DeleteTeacherButtonProps {
  teacherId: string;
  teacherName: string;
  classNames?: string[];
  variant?: "icon" | "default";
  stopPropagationOnTrigger?: boolean;
}

export function DeleteTeacherButton({
  teacherId,
  teacherName,
  classNames = [],
  variant = "icon",
  stopPropagationOnTrigger = false,
}: DeleteTeacherButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const path = usePathname();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        // Kiểm tra ở client trước khi gọi server action
        if (classNames && classNames.length > 0) {
          toast.error("Không thể xóa giáo viên", {
            description: `Giáo viên đang dạy lớp: ${classNames.join(", ")}. Vui lòng gỡ phân công lớp trước.`,
          });
          setOpen(false);
          return;
        }

        await deleteTeacher(teacherId, path);
        toast.success("Đã xóa giáo viên", {
          description: teacherName,
        });
        window.dispatchEvent(new CustomEvent("teacher-deleted"));
        setOpen(false);
        router.refresh();
      } catch (error) {
        console.error("Error deleting teacher:", error);
        toast.error("Xóa giáo viên thất bại", {
          description:
            error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        });
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant === "icon" ? "ghost" : "destructive"}
          size={variant === "icon" ? "icon" : "default"}
          className={
            variant === "icon"
              ? "text-destructive hover:text-destructive"
              : "w-full sm:w-auto"
          }
          onClickCapture={
            stopPropagationOnTrigger
              ? (event) => {
                  event.stopPropagation();
                }
              : undefined
          }
          disabled={isPending}
        >
          {variant === "icon" ? (
            <Trash2 className="h-4 w-4" />
          ) : (
            "Xóa giáo viên"
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa giáo viên</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn chắc chắn muốn xóa giáo viên{" "}
            <span className="font-medium text-foreground">{teacherName}</span>?
            Giáo viên đang dạy lớp sẽ không thể xóa; hãy chuyển hoặc gỡ phân
            công trước. Tài khoản đăng nhập cũng sẽ bị xóa và hành động này
            không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? "Đang xóa..." : "Xóa giáo viên"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
