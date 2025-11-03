"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { Plus, Trash2 } from "lucide-react";
import { AddTeacherForm } from "@/components/forms/add-teacher-form";
import ClassTeachersSearchBar from "./class-teachers-search-bar";
import {
  ClassTeacherItem,
  removeClassTeacher,
} from "@/lib/services/admin-classes-service";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface TeachersSectionProps {
  classId: string;
  teachers: ClassTeacherItem[];
  query: string;
  assignedTeacherIds: string[];
}

export default function TeachersSection({
  classId,
  teachers,
  query,
  assignedTeacherIds,
}: TeachersSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedTeacher = teachers.find(
    (t) => t.assignment_id === selectedAssignmentId
  );

  const handleDeleteClick = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAssignmentId) return;

    setIsDeleting(true);
    try {
      await removeClassTeacher(selectedAssignmentId, pathname);
      toast.success("Đã xóa giáo viên khỏi lớp");
      router.refresh();
      setDeleteDialogOpen(false);
      setSelectedAssignmentId(null);
    } catch (error) {
      console.error("Error removing teacher:", error);
      toast.error("Xóa giáo viên thất bại", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-auto">
          <ClassTeachersSearchBar />
        </div>
        <div className="flex justify-end">
          <AddTeacherForm
            classId={classId}
            assignedTeacherIds={assignedTeacherIds}
          >
            <Button size="sm">
              <Plus className="size-4" />
              Thêm giáo viên
            </Button>
          </AddTeacherForm>
        </div>
      </div>
      {query && (
        <p className="mb-2 px-3 text-sm text-muted-foreground">
          Đang tìm danh sách giáo viên theo:{" "}
          <span className="font-medium text-foreground">
            &quot;{query}&quot;
          </span>
        </p>
      )}

      {/* Mobile: Card view */}
      <div className="grid gap-2 md:hidden">
        {teachers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Chưa có giáo viên nào
          </p>
        ) : (
          teachers.map((item) => (
            <Card key={item.assignment_id} className="border p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold">{item.teacher.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.teacher.phone}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vào dạy:{" "}
                    {format(new Date(item.start_date), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteClick(item.assignment_id)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {item.teacher.notes && (
                <div className="mt-2 pt-2 border-t text-sm">
                  <div className="text-muted-foreground">Ghi chú:</div>
                  <div className="font-medium">{item.teacher.notes}</div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Tên giáo viên</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Ngày vào dạy</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Chưa có giáo viên nào
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((item) => (
                <TableRow key={item.assignment_id}>
                  <TableCell className="font-medium">
                    {item.teacher.full_name}
                  </TableCell>
                  <TableCell>{item.teacher.phone}</TableCell>
                  <TableCell>
                    {format(new Date(item.start_date), "dd/MM/yyyy", {
                      locale: vi,
                    })}
                  </TableCell>
                  <TableCell>{item.teacher.notes || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(item.assignment_id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa giáo viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa giáo viên{" "}
              <span className="font-semibold">
                {selectedTeacher?.teacher.full_name}
              </span>{" "}
              khỏi lớp này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
