"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Calendar } from "lucide-react";
import { UpdateStudentForm } from "@/components/forms";
import { StudentClassScheduleDialog } from "./student-class-schedule-dialog";
import type { Student } from "@/types";

export function StudentCard({ student }: { student: Student }) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h3 className="font-semibold">{student.full_name}</h3>
              <p className="text-sm text-muted-foreground">{student.phone}</p>
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
              <UpdateStudentForm student={student}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Chỉnh sửa"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </UpdateStudentForm>
            </div>
          </div>
          <Badge variant={student.is_active ? "default" : "destructive"}>
            {student.is_active ? "Hoạt động" : "Ngừng hoạt động"}
          </Badge>
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
