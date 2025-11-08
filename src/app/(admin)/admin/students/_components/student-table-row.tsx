"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Calendar } from "lucide-react";
import { UpdateStudentForm } from "@/components/forms";
import { StudentClassScheduleDialog } from "./student-class-schedule-dialog";
import type { Student } from "@/types";

export function StudentTableRow({ student }: { student: Student }) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{student.full_name}</TableCell>
        <TableCell>{student.phone}</TableCell>
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
            <UpdateStudentForm student={student}>
              <Button variant="ghost" size="icon" title="Chỉnh sửa">
                <Pencil className="h-4 w-4" />
              </Button>
            </UpdateStudentForm>
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
