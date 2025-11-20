"use client";

import { UpdateStudentForm } from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatDateShort,
  formatEnrollmentStatus,
  formatScheduleSlots,
  isNewStudent,
} from "@/lib/utils";
import type { StudentWithClassSummary } from "@/types";
import { Book, Calendar, Loader2, Pencil, QrCode } from "lucide-react";
import { lazy, memo, Suspense, useMemo, useState } from "react";
import { DeleteStudentButton } from "./delete-student-button";
import {
  getAttendanceStatusBadge,
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
const StudentQRDialog = lazy(() =>
  import("./student-qr-dialog").then((mod) => ({
    default: mod.StudentQRDialog,
  }))
);

function StudentCardComponent({
  student,
}: {
  student: StudentWithClassSummary;
}) {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [manageClassesDialogOpen, setManageClassesDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
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
                  setManageClassesDialogOpen(true);
                }}
                title="Quản lý lớp học"
              >
                <Book className="h-4 w-4" />
              </Button>
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setQrDialogOpen(true);
                }}
                title="Tạo QR code"
              >
                <QrCode className="h-4 w-4" />
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
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Ngày nhập học</span>
              <span className="font-medium">{enrollmentDate}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Đóng học phí</span>
              <Badge variant={tuitionBadge.variant}>{tuitionBadge.label}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Điểm danh hôm nay</span>
              <Badge variant={attendanceBadge.variant}>
                {attendanceBadge.label}
              </Badge>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {classSummary.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa xếp lớp</p>
            ) : (
              <>
                {visibleClasses.map((cls) => (
                  <div
                    key={`${student.id}-${cls.classId}`}
                    className="space-y-0.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cls.className}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatEnrollmentStatus(cls.status)}
                      </Badge>
                    </div>
                    {cls.schedule && cls.schedule.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatScheduleSlots(cls.schedule)}
                      </p>
                    )}
                    {cls.status === "inactive" &&
                      (cls.leaveDate || cls.leaveReason) && (
                        <p className="text-xs text-muted-foreground">
                          {cls.leaveDate && (
                            <span>
                              Ngừng từ {formatDateShort(cls.leaveDate)}
                              {cls.leaveReason ? " • " : ""}
                            </span>
                          )}
                          {cls.leaveReason && (
                            <span>Lý do: {cls.leaveReason}</span>
                          )}
                        </p>
                      )}
                  </div>
                ))}
                {remainingClasses > 0 && (
                  <p className="text-xs text-muted-foreground">
                    +{remainingClasses} lớp khác
                  </p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      {scheduleDialogOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <StudentClassScheduleDialog
            student={student}
            open={scheduleDialogOpen}
            onOpenChange={setScheduleDialogOpen}
          />
        </Suspense>
      )}
      {manageClassesDialogOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <ManageStudentClassesDialog
            student={student}
            open={manageClassesDialogOpen}
            onOpenChange={setManageClassesDialogOpen}
          />
        </Suspense>
      )}
      {qrDialogOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <StudentQRDialog
            studentId={student.id}
            studentName={student.full_name}
            open={qrDialogOpen}
            onOpenChange={setQrDialogOpen}
          />
        </Suspense>
      )}
    </>
  );
}

export const StudentCard = memo(StudentCardComponent);
