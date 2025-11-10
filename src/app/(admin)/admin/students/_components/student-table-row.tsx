"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Calendar } from "lucide-react";
import { UpdateStudentForm } from "@/components/forms";
import { StudentClassScheduleDialog } from "./student-class-schedule-dialog";
import type { Student } from "@/types";
import { isNewStudent } from "@/lib/utils";
import { DeleteStudentButton } from "./delete-student-button";

export function StudentTableRow({ student }: { student: Student }) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const isNew = isNewStudent(student.created_at);

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <span>{student.full_name}</span>
            {isNew && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                Mới
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>{student.phone || "-"}</TableCell>
        <TableCell className="text-center">
          <Badge variant={student.is_active ? "default" : "destructive"}>
            {student.is_active ? "Hoạt động" : "Ngừng hoạt động"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScheduleDialogOpen(true)}
              title="Xem lịch học"
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <UpdateStudentForm
              key={`${student.id}-${student.updated_at}`}
              student={student}
            >
              <Button variant="ghost" size="icon" title="Chỉnh sửa">
                <Pencil className="h-4 w-4" />
              </Button>
            </UpdateStudentForm>
            <DeleteStudentButton student={student} />
          </div>
        </TableCell>
      </TableRow>
      <StudentClassScheduleDialog
        student={student}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />
    </>
  );
}
