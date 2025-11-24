"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getClasses } from "@/lib/services/admin-classes-service";
import { enrollStudents } from "@/lib/services/admin-classes-service";
import {
  parseEnrollmentStatus,
  parseEnrollmentDate,
} from "@/lib/utils/import-students";
import type { ClassListItem } from "@/types";
import type { StudentRowWithStatus } from "@/lib/utils/import-students";
import { toast } from "sonner";
import { Loader2, Calendar } from "lucide-react";
import {
  normalizeText,
  formatCurrencyVN,
  formatDateRange,
  toArray,
} from "@/lib/utils";
import { DAYS_MAP } from "@/lib/constants/schedule";
import { Card } from "@/components/ui/card";
import { usePathname, useRouter } from "next/navigation";
import { WeeklyScheduleCalendar } from "@/app/(admin)/admin/classes/[classId]/_components/weekly-schedule-calendar";
import type { Class } from "@/types/database";

interface MapClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importedStudents: StudentRowWithStatus[]; // Students với studentId
  onSuccess?: () => void;
}

export function MapClassesDialog({
  open,
  onOpenChange,
  importedStudents,
  onSuccess,
}: MapClassesDialogProps) {
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<
    Record<number, string>
  >({}); // rowIndex -> classId
  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<number, "trial" | "active" | "inactive">
  >({}); // rowIndex -> status
  const [enrolling, setEnrolling] = useState(false);
  const [viewingScheduleRowIndex, setViewingScheduleRowIndex] = useState<
    number | null
  >(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      loadClasses();
    }
  }, [open]);

  async function loadClasses() {
    setLoading(true);
    try {
      const allClasses = await getClasses("", { is_active: true });
      setClasses(allClasses);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Không thể tải danh sách lớp");
    } finally {
      setLoading(false);
    }
  }

  // Gợi ý lớp dựa trên môn học (không tự động chọn)
  function suggestClass(row: StudentRowWithStatus): ClassListItem | null {
    if (!row.subject || classes.length === 0) return null;

    const normalizedSubject = normalizeText(row.subject.trim().toLowerCase());

    // Find classes matching subject
    const matchingClasses = classes.filter((c) => {
      const normalizedClassName = normalizeText(c.name.toLowerCase());
      return normalizedClassName.includes(normalizedSubject);
    });

    if (matchingClasses.length === 0) return null;
    if (matchingClasses.length === 1) return matchingClasses[0];

    // If multiple, try to match by time and days (simplified matching)
    // For now, return first matching class
    // In the future, we could improve this by comparing days_of_week and time slots
    return matchingClasses[0];
  }

  async function handleEnroll() {
    // Group by classId, status, and enrollment_date
    // Since enrollStudents accepts a single status and date for all students,
    // we need to group students with the same (classId, status, enrollment_date)
    type EnrollmentKey = string; // Format: "classId|status|enrollment_date"
    const enrollmentsByKey: Record<
      EnrollmentKey,
      Array<{
        studentId: string;
        status: "trial" | "active" | "inactive";
        enrollment_date: string;
        rowIndex: number;
      }>
    > = {};

    for (const student of importedStudents) {
      if (!student.studentId) continue;

      const classId = selectedClasses[student.rowIndex];
      if (!classId) continue;

      // Sử dụng status đã chọn, nếu không có thì parse từ payment_status/trial_note
      const status =
        selectedStatuses[student.rowIndex] ||
        parseEnrollmentStatus(student.payment_status, student.trial_note);
      const enrollmentDate = parseEnrollmentDate(student.trial_note);

      // Create key: "classId|status|enrollment_date"
      const key = `${classId}|${status}|${enrollmentDate}`;

      if (!enrollmentsByKey[key]) {
        enrollmentsByKey[key] = [];
      }

      enrollmentsByKey[key].push({
        studentId: student.studentId,
        status,
        enrollment_date: enrollmentDate,
        rowIndex: student.rowIndex,
      });
    }

    // Check if any students are selected
    const totalSelected = Object.values(enrollmentsByKey).reduce(
      (sum, enrollments) => sum + enrollments.length,
      0
    );

    if (totalSelected === 0) {
      toast.warning("Vui lòng chọn lớp cho ít nhất một học sinh");
      return;
    }

    setEnrolling(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Enroll students grouped by (classId, status, enrollment_date)
      for (const [key, enrollments] of Object.entries(enrollmentsByKey)) {
        try {
          const [classId, status, enrollmentDate] = key.split("|");
          const studentIds = enrollments.map((e) => e.studentId);

          await enrollStudents(
            classId,
            studentIds,
            {
              status: status as "trial" | "active" | "inactive",
              enrollment_date: enrollmentDate,
            },
            pathname
          );

          successCount += enrollments.length;
        } catch (error) {
          console.error("Error enrolling students:", error);
          errorCount += enrollments.length;
          toast.error(
            error instanceof Error
              ? error.message
              : `Lỗi khi đăng ký học ${enrollments.length} học sinh vào lớp`
          );
        }
      }

      if (successCount > 0) {
        toast.success(
          `Đã đăng ký học thành công ${successCount} học sinh vào lớp`
        );
        router.refresh();
        onSuccess?.();
        onOpenChange(false);
      }

      if (errorCount > 0) {
        toast.warning(`Không thể đăng ký học ${errorCount} học sinh`);
      }
    } catch (error) {
      console.error("Error in enrollment process:", error);
      toast.error("Lỗi khi đăng ký học học sinh");
    } finally {
      setEnrolling(false);
    }
  }

  const studentsWithIds = importedStudents.filter((s) => s.studentId);
  // Count only selected classes (non-undefined, non-empty values)
  const selectedCount = Object.values(selectedClasses).filter(
    (classId) => classId !== undefined && classId !== ""
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        maxWidth="max-w-7xl"
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Chọn lớp cho học sinh</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Đang tải danh sách lớp...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Đã import {studentsWithIds.length} học sinh. Vui lòng chọn lớp cho
              từng học sinh.
              {selectedCount > 0 && (
                <span className="ml-2 font-medium text-foreground">
                  Đã chọn: {selectedCount}/{studentsWithIds.length}
                </span>
              )}
            </div>

            {/* Nút set status mặc định cho tất cả học sinh đã chọn lớp */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border">
                <span className="text-xs text-muted-foreground">
                  Set trạng thái mặc định cho tất cả học sinh đã chọn lớp:
                </span>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value) {
                      const newStatuses: Record<
                        number,
                        "trial" | "active" | "inactive"
                      > = {};
                      studentsWithIds.forEach((s) => {
                        if (selectedClasses[s.rowIndex]) {
                          newStatuses[s.rowIndex] = value as
                            | "trial"
                            | "active"
                            | "inactive";
                        }
                      });
                      setSelectedStatuses((prev) => ({
                        ...prev,
                        ...newStatuses,
                      }));
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Học thử</SelectItem>
                    <SelectItem value="active">Đang học</SelectItem>
                    <SelectItem value="inactive">Ngừng học</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto border rounded-md p-2">
              {studentsWithIds.map((student) => {
                const selectedClassId = selectedClasses[student.rowIndex];
                const selectedClass = selectedClassId
                  ? classes.find((c) => c.id === selectedClassId)
                  : undefined;

                // Tính toán gợi ý (không tự động chọn)
                const suggestedClass = suggestClass(student);

                return (
                  <div key={student.rowIndex} className="space-y-2">
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3 border rounded hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {student.subject && (
                            <div>
                              <span className="font-medium">Môn:</span>{" "}
                              {student.subject}
                            </div>
                          )}
                          {student.time_slot && student.days && (
                            <div>
                              <span className="font-medium">Lịch:</span>{" "}
                              {student.time_slot} - {student.days}
                            </div>
                          )}
                          {student.payment_status && (
                            <div>
                              <span className="font-medium">Trạng thái:</span>{" "}
                              {student.payment_status}
                            </div>
                          )}
                          {student.trial_note && (
                            <div>
                              <span className="font-medium">Ghi chú:</span>{" "}
                              {student.trial_note}
                            </div>
                          )}
                          {/* Hiển thị gợi ý lớp */}
                          {suggestedClass && !selectedClassId && (
                            <div className="mt-2 pt-2 border-t">
                              <span className="text-xs text-primary font-medium">
                                💡 Gợi ý: Lớp &quot;{suggestedClass.name}&quot;
                                phù hợp với môn học
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedClassId || "__none__"}
                          onValueChange={(value) => {
                            if (value === "__none__") {
                              // Clear selection
                              setSelectedClasses((prev) => {
                                const updated = { ...prev };
                                delete updated[student.rowIndex];
                                return updated;
                              });
                              // Also close schedule view if open
                              if (
                                viewingScheduleRowIndex === student.rowIndex
                              ) {
                                setViewingScheduleRowIndex(null);
                              }
                            } else {
                              // Set selection
                              setSelectedClasses((prev) => ({
                                ...prev,
                                [student.rowIndex]: value,
                              }));
                            }
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Chọn lớp (tùy chọn)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground italic">
                                Không chọn lớp
                              </span>
                            </SelectItem>
                            {classes.map((cls) => {
                              const isSuggested = suggestedClass?.id === cls.id;
                              return (
                                <SelectItem key={cls.id} value={cls.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{cls.name}</span>
                                    {isSuggested && !selectedClassId && (
                                      <span className="text-xs text-primary font-medium">
                                        (Gợi ý)
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Thông tin lớp đã chọn */}
                    {selectedClass && (
                      <div className="ml-3 mr-3 space-y-2">
                        <Card className="p-3 bg-muted/50 border-primary/20">
                          <div className="space-y-2">
                            <div className="font-medium text-sm text-foreground">
                              {selectedClass.name}
                            </div>

                            {/* Lịch học */}
                            <div className="text-xs">
                              <span className="font-medium text-muted-foreground">
                                Lịch học:{" "}
                              </span>
                              <span className="text-foreground">
                                {(() => {
                                  const daysOfWeek = toArray<{
                                    day: number;
                                    start_time: string;
                                    end_time?: string;
                                  }>(selectedClass.days_of_week);
                                  if (daysOfWeek.length === 0) {
                                    return "Chưa có lịch";
                                  }
                                  return daysOfWeek
                                    .map((slot) => {
                                      const dayLabel =
                                        DAYS_MAP[
                                          slot.day as keyof typeof DAYS_MAP
                                        ]?.short || "";
                                      const timeRange = slot.end_time
                                        ? `${slot.start_time} - ${slot.end_time}`
                                        : slot.start_time;
                                      return `${dayLabel} ${timeRange}`;
                                    })
                                    .join(", ");
                                })()}
                              </span>
                            </div>

                            {/* Thông tin khác */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">
                                  Học sinh:{" "}
                                </span>
                                <span className="font-medium text-foreground">
                                  {selectedClass.students_count}/
                                  {selectedClass.max_student_count}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Học phí:{" "}
                                </span>
                                <span className="font-medium text-foreground">
                                  {formatCurrencyVN(selectedClass.monthly_fee)}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">
                                  Thời gian:{" "}
                                </span>
                                <span className="font-medium text-foreground">
                                  {formatDateRange(
                                    selectedClass.start_date,
                                    selectedClass.end_date
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Trạng thái học */}
                            <div className="pt-2 border-t">
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-muted-foreground flex-shrink-0">
                                  Trạng thái học:
                                </label>
                                <Select
                                  value={
                                    selectedStatuses[student.rowIndex] ||
                                    parseEnrollmentStatus(
                                      student.payment_status,
                                      student.trial_note
                                    )
                                  }
                                  onValueChange={(value) => {
                                    setSelectedStatuses((prev) => ({
                                      ...prev,
                                      [student.rowIndex]: value as
                                        | "trial"
                                        | "active"
                                        | "inactive",
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="trial">
                                      Học thử
                                    </SelectItem>
                                    <SelectItem value="active">
                                      Đang học
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                      Ngừng học
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Nút Xem lịch */}
                            <div className="pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setViewingScheduleRowIndex(
                                    viewingScheduleRowIndex === student.rowIndex
                                      ? null
                                      : student.rowIndex
                                  );
                                }}
                                className="w-full"
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {viewingScheduleRowIndex === student.rowIndex
                                  ? "Ẩn lịch học"
                                  : "Xem lịch học"}
                              </Button>
                            </div>
                          </div>
                        </Card>

                        {/* Hiển thị lịch học khi click "Xem lịch" */}
                        {viewingScheduleRowIndex === student.rowIndex && (
                          <Card className="p-4 bg-background">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <label className="text-sm font-medium">
                                  Lịch học tuần
                                </label>
                              </div>
                              <WeeklyScheduleCalendar
                                daysOfWeek={selectedClass.days_of_week}
                                durationMinutes={selectedClass.duration_minutes}
                                classData={selectedClass as Class}
                              />
                            </div>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={enrolling}
              >
                Bỏ qua
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={enrolling || selectedCount === 0}
              >
                {enrolling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng ký học...
                  </>
                ) : (
                  `Đăng ký lớp cho ${selectedCount} học sinh`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
