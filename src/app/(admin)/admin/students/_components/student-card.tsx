"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Calendar } from "lucide-react";
import { UpdateStudentForm } from "@/components/forms";
import { StudentClassScheduleDialog } from "./student-class-schedule-dialog";
import type { Student } from "@/types";
import { isNewStudent } from "@/lib/utils";
import { DeleteStudentButton } from "./delete-student-button";

export function StudentCard({ student }: { student: Student }) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const isNew = isNewStudent(student.created_at);

  return (
    <>
      <Card>
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{student.full_name}</h3>
                {isNew && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Mới
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {student.phone || "Chưa có"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setScheduleDialogOpen(true);
                }}
                title="Xem lịch học"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <UpdateStudentForm
                key={`${student.id}-${student.updated_at}`}
                student={student}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Chỉnh sửa"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </UpdateStudentForm>
              <DeleteStudentButton student={student} className="h-8 w-8" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={student.is_active ? "default" : "destructive"}>
              {student.is_active ? "Hoạt động" : "Ngừng hoạt động"}
            </Badge>
          </div>
        </CardContent>
      </Card>
      <StudentClassScheduleDialog
        student={student}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
      />
    </>
  );
}
