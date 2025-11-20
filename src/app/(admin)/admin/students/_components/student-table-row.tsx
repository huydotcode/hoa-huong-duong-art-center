"use client";

import { UpdateStudentForm } from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  formatDateShort,
  formatEnrollmentStatus,
  isNewStudent,
  normalizeText,
} from "@/lib/utils";
import type { StudentWithClassSummary } from "@/types";
import { Book, Calendar, Pencil } from "lucide-react";
import { lazy, memo, Suspense, useMemo, useState } from "react";
import { DeleteStudentButton } from "./delete-student-button";
import {
  getAttendanceStatusBadge,
  getLearningStatusBadge,
  getTuitionStatusBadge,
} from "./student-status-utils";

// Lazy load heavy dialog components
const StudentClassScheduleDialog = lazy(() =>
  import("./student-class-schedule-dialog").then((mod) => ({
    default: mod.StudentClassScheduleDialog,
  }))
);
const ManageStudentClassesDialog = lazy(() =>
  import("./manage-student-classes-dialog").then((mod) => ({
    default: mod.ManageStudentClassesDialog,
  }))
);

function StudentTableRowComponent({
  student,
  activeLearningStatus,
  activeSubject,
}: {
  student: StudentWithClassSummary;
  activeLearningStatus?: string;
  activeSubject?: string;
}) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [manageClassesDialogOpen, setManageClassesDialogOpen] = useState(false);
  const isNew = useMemo(
    () => isNewStudent(student.created_at),
    [student.created_at]
  );
  const classSummary = useMemo(
    () => student.class_summary ?? [],
    [student.class_summary]
  );
  const orderedClasses = useMemo(() => {
    if (classSummary.length <= 1) {
      return classSummary;
    }

    const normalizedSubject = activeSubject
      ? normalizeText(activeSubject)
      : null;

    // Priority order:
    // 1. Classes matching both subject and learning status (if both filters active)
    // 2. Classes matching subject (if subject filter active)
    // 3. Classes matching learning status (if learning status filter active)
    // 4. Other classes

    const priority1: typeof classSummary = [];
    const priority2: typeof classSummary = [];
    const priority3: typeof classSummary = [];
    const others: typeof classSummary = [];

    classSummary.forEach((cls) => {
      const normalizedClassName = normalizeText(cls.className || "");
      const matchesSubject =
        normalizedSubject && normalizedClassName.includes(normalizedSubject);
      const matchesStatus =
        activeLearningStatus && cls.status === activeLearningStatus;

      if (matchesSubject && matchesStatus) {
        priority1.push(cls);
      } else if (matchesSubject) {
        priority2.push(cls);
      } else if (matchesStatus) {
        priority3.push(cls);
      } else {
        others.push(cls);
      }
    });

    // If we have priority classes, return them first
    if (priority1.length > 0 || priority2.length > 0 || priority3.length > 0) {
      return [...priority1, ...priority2, ...priority3, ...others];
    }

    return classSummary;
  }, [classSummary, activeLearningStatus, activeSubject]);
  const visibleClasses = orderedClasses.slice(0, 2);
  const remainingClasses = classSummary.length - visibleClasses.length;
  const enrollmentDate = useMemo(
    () => formatDateShort(student.first_enrollment_date),
    [student.first_enrollment_date]
  );
  const tuitionBadge = getTuitionStatusBadge(student.tuition_status);
  const attendanceBadge = getAttendanceStatusBadge(
    student.attendance_today_status
  );
  const learningBadge = getLearningStatusBadge(student.learning_status);

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
              {visibleClasses.map((cls) => {
                const normalizedSubject = activeSubject
                  ? normalizeText(activeSubject)
                  : null;
                const normalizedClassName = normalizeText(cls.className || "");
                const matchesSubject =
                  normalizedSubject &&
                  normalizedClassName.includes(normalizedSubject);
                const matchesStatus =
                  activeLearningStatus && cls.status === activeLearningStatus;
                const isPreferred = matchesSubject || matchesStatus;

                return (
                  <div
                    key={`${student.id}-${cls.classId}`}
                    className="flex flex-col gap-0.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {cls.className}
                      </span>
                      <Badge
                        variant={isPreferred ? "default" : "outline"}
                        className="text-xs"
                      >
                        {formatEnrollmentStatus(cls.status)}
                      </Badge>
                    </div>
                    {cls.status === "inactive" &&
                      (cls.leaveDate || cls.leaveReason) && (
                        <div className="text-xs text-muted-foreground">
                          {cls.leaveDate && (
                            <span>
                              Ngừng từ {formatDateShort(cls.leaveDate)}
                              {cls.leaveReason ? " • " : ""}
                            </span>
                          )}
                          {cls.leaveReason && <span>Lý do: {cls.leaveReason}</span>}
                        </div>
                      )}
                  </div>
                );
              })}
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
        <TableCell className="max-w-[200px] truncate">
          {student.notes ? (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {student.notes}
            </p>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={learningBadge.variant}>{learningBadge.label}</Badge>
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
              onClick={() => setManageClassesDialogOpen(true)}
              title="Quản lý lớp học"
            >
              <Book className="h-4 w-4" />
            </Button>
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
      {manageClassesDialogOpen && (
        <Suspense fallback={null}>
          <ManageStudentClassesDialog
            student={student}
            open={manageClassesDialogOpen}
            onOpenChange={setManageClassesDialogOpen}
          />
        </Suspense>
      )}
    </>
  );
}

export const StudentTableRow = memo(StudentTableRowComponent);
