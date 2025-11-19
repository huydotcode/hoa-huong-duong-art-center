"use client";

import { useState, memo, useMemo, lazy, Suspense } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Calendar } from "lucide-react";
import { UpdateStudentForm } from "@/components/forms";
import type { StudentWithClassSummary } from "@/types";
import {
  formatDateShort,
  formatEnrollmentStatus,
  isNewStudent,
} from "@/lib/utils";
import { DeleteStudentButton } from "./delete-student-button";
import {
  getAttendanceStatusBadge,
  getTuitionStatusBadge,
} from "./student-status-utils";
import { Loader2 } from "lucide-react";

// Lazy load heavy dialog component
const StudentClassScheduleDialog = lazy(() =>
  import("./student-class-schedule-dialog").then((mod) => ({
    default: mod.StudentClassScheduleDialog,
  }))
);

function StudentTableRowComponent({
  student,
}: {
  student: StudentWithClassSummary;
}) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const isNew = useMemo(
    () => isNewStudent(student.created_at),
    [student.created_at]
  );
  const classSummary = student.class_summary ?? [];
  const visibleClasses = classSummary.slice(0, 2);
  const remainingClasses = classSummary.length - visibleClasses.length;
  const enrollmentDate = useMemo(
    () => formatDateShort(student.first_enrollment_date),
    [student.first_enrollment_date]
  );
  const tuitionBadge = getTuitionStatusBadge(student.tuition_status);
  const attendanceBadge = getAttendanceStatusBadge(
    student.attendance_today_status
  );

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
        <TableCell>
          {classSummary.length === 0 ? (
            <span className="text-sm text-muted-foreground">Chưa xếp lớp</span>
          ) : (
            <div className="flex flex-col gap-1">
              {visibleClasses.map((cls) => (
                <div
                  key={`${student.id}-${cls.classId}`}
                  className="flex items-center gap-2"
                >
                  <span className="text-sm font-medium truncate">
                    {cls.className}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {formatEnrollmentStatus(cls.status)}
                  </Badge>
                </div>
              ))}
              {remainingClasses > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{remainingClasses} lớp khác
                </span>
              )}
            </div>
          )}
        </TableCell>
        <TableCell>{enrollmentDate}</TableCell>
        <TableCell>
          <Badge variant={tuitionBadge.variant}>{tuitionBadge.label}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant={attendanceBadge.variant}>
            {attendanceBadge.label}
          </Badge>
        </TableCell>
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
      {scheduleDialogOpen && (
        <Suspense fallback={null}>
          <StudentClassScheduleDialog
            student={student}
            open={scheduleDialogOpen}
            onOpenChange={setScheduleDialogOpen}
          />
        </Suspense>
      )}
    </>
  );
}

export const StudentTableRow = memo(StudentTableRowComponent);
