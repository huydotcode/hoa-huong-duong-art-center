"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignTeacherToClass,
  getClasses,
} from "@/lib/services/admin-classes-service";
import type { ClassListItem } from "@/types";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AssignTeacherToClassDialogProps {
  teacherId: string;
  teacherName: string;
  currentClasses?: string[];
  buttonVariant?: "outline" | "ghost" | "default" | "secondary";
  buttonSize?: "sm" | "default" | "icon";
  buttonLabel?: string;
  hideLabel?: boolean;
  showIcon?: boolean;
  stopPropagationOnTrigger?: boolean;
  ariaLabel?: string;
}

export function AssignTeacherToClassDialog({
  teacherId,
  teacherName,
  currentClasses = [],
  buttonVariant = "outline",
  buttonSize = "sm",
  buttonLabel,
  hideLabel = false,
  showIcon = true,
  stopPropagationOnTrigger = false,
  ariaLabel = "Thêm lớp",
}: AssignTeacherToClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const router = useRouter();
  const path = usePathname();

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const data = await getClasses("", {
        is_active: true,
      });
      setClasses(data);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Không thể tải danh sách lớp");
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedClassId) return;
    setIsAssigning(true);
    try {
      await assignTeacherToClass(teacherId, selectedClassId, path);
      toast.success("Đã thêm giáo viên vào lớp");
      window.dispatchEvent(new CustomEvent("teacher-updated"));
      setOpen(false);
      setSelectedClassId("");
      router.refresh();
    } catch (error) {
      console.error("Error assigning teacher:", error);
      toast.error("Không thể thêm giáo viên vào lớp", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          loadClasses();
        } else {
          setSelectedClassId("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className="gap-1 w-full sm:w-fit px-2"
          onClickCapture={
            stopPropagationOnTrigger
              ? (event) => {
                  event.stopPropagation();
                }
              : undefined
          }
          aria-label={ariaLabel}
        >
          {showIcon && <Plus className="h-4 w-4" />}
          {buttonLabel && (
            <span className={hideLabel ? "sr-only" : undefined}>
              {buttonLabel}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm {teacherName} vào lớp</DialogTitle>
          <DialogDescription>
            Chọn lớp để gán giáo viên này. Lớp giáo viên đang dạy sẽ bị ẩn.
          </DialogDescription>
        </DialogHeader>

        {currentClasses.length > 0 && (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            <div className="text-muted-foreground">
              Giáo viên đang dạy: ({currentClasses.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentClasses.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Chọn lớp</label>
          <Select
            value={selectedClassId}
            onValueChange={setSelectedClassId}
            disabled={loadingClasses || classes.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn lớp" />
            </SelectTrigger>
            <SelectContent>
              {classes
                .filter((cls) => !currentClasses.includes(cls.name))
                .map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    <div className="flex items-start flex-col gap-0.5">
                      <span>{cls.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {cls.subject || "Chưa rõ môn"} ·{" "}
                        {cls.days_of_week
                          .map((slot) => `T${slot.day + 1} ${slot.start_time}`)
                          .join(", ")}
                      </span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {classes.length === 0 && !loadingClasses && (
            <p className="text-sm text-muted-foreground">
              Không tìm thấy lớp nào phù hợp.
            </p>
          )}
          {loadingClasses && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải lớp...
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleAssign}
            disabled={!selectedClassId || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang thêm...
              </>
            ) : (
              "Thêm vào lớp"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
