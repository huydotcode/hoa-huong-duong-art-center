"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyScheduleCalendar } from "@/app/(admin)/admin/classes/[classId]/_components/weekly-schedule-calendar";
import { formatEnrollmentStatus, toArray } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Calendar, ArrowRight } from "lucide-react";
import type { Student } from "@/types";
import type { Class } from "@/types/database";
import { TransferClassDialog } from "./transfer-class-dialog";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

interface StudentClassScheduleDialogProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EnrollmentRow = {
  id: string;
  class_id: string;
  enrollment_date: string;
  status: "trial" | "active" | "inactive";
  leave_date?: string | null;
  classes?:
    | {
        id: string;
        name: string;
        subject?: string | null;
        days_of_week: unknown;
        duration_minutes: number;
        is_active: boolean;
      }
    | Array<{
        id: string;
        name: string;
        subject?: string | null;
        days_of_week: unknown;
        duration_minutes: number;
        is_active: boolean;
      }>;
};

export function StudentClassScheduleDialog({
  student,
  open,
  onOpenChange,
}: StudentClassScheduleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<
    Array<{
      enrollmentId: string;
      classId: string;
      className: string;
      classSubject?: string | null;
      daysOfWeek: Array<{
        day: number;
        start_time: string;
        end_time?: string;
      }>;
      durationMinutes: number;
      enrollmentDate: string;
      status: "trial" | "active" | "inactive";
    }>
  >([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const supabase = useMemo(() => createSupabaseClient(), []);

  const mapClasses = useCallback(
    (enrollments: EnrollmentRow[]) =>
      enrollments
        .filter((e) => {
          const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
          return classData?.is_active === true;
        })
        .map((e) => {
          const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
          return {
            enrollmentId: e.id,
            classId: e.class_id,
            className: classData?.name || "",
            classSubject: classData?.subject ?? null,
            daysOfWeek: toArray<{
              day: number;
              start_time: string;
              end_time?: string;
            }>(classData?.days_of_week || []),
            durationMinutes: Number(classData?.duration_minutes || 0),
            enrollmentDate: e.enrollment_date,
            status: e.status as "trial" | "active" | "inactive",
          };
        }),
    []
  );

  const applyClasses = useCallback((data: typeof classes) => {
    setClasses(data);
    setSelectedClass((prev) => {
      if (prev && data.some((c) => c.classId === prev)) {
        return prev;
      }
      return data.length > 0 ? data[0].classId : null;
    });
  }, []);

  const fetchClasses = useCallback(async () => {
    if (!student.id) return [];

    const { data, error } = await supabase
      .from("student_class_enrollments")
      .select(
        `
        id,
        class_id,
        enrollment_date,
        status,
        leave_date,
        classes(id, name, subject, days_of_week, duration_minutes, is_active)
      `
      )
      .eq("student_id", student.id)
      .in("status", ["active", "trial"])
      .is("leave_date", null);

    if (error) {
      throw error;
    }

    return mapClasses(data || []);
  }, [student.id, supabase, mapClasses]);

  const reloadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClasses();
      applyClasses(data);
    } catch (error) {
      console.error("Error loading student classes:", error);
      toast.error("Lỗi khi tải danh sách lớp học");
    } finally {
      setLoading(false);
    }
  }, [fetchClasses, applyClasses]);

  // Load student's current classes whenever dialog opens
  useEffect(() => {
    if (!open) return;
    let isActive = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchClasses();
        if (!isActive) return;
        applyClasses(data);
      } catch (error) {
        if (!isActive) return;
        console.error("Error loading student classes:", error);
        toast.error("Lỗi khi tải danh sách lớp học");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [open, fetchClasses, applyClasses]);

  // Refresh when class schedule updated elsewhere while dialog is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      if (!open) return;
      const customEvent = event as CustomEvent<{ classId?: string }>;
      const classId = customEvent.detail?.classId;
      if (classId && !classes.some((cls) => cls.classId === classId)) {
        // Student không thuộc lớp này, bỏ qua
        return;
      }
      reloadClasses();
    };

    window.addEventListener("class-schedule-updated", handler as EventListener);
    return () => {
      window.removeEventListener(
        "class-schedule-updated",
        handler as EventListener
      );
    };
  }, [open, reloadClasses, classes]);

  const selectedClassData = classes.find((c) => c.classId === selectedClass);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        maxWidth="max-w-5xl"
        className="w-full max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Lịch học - {student.full_name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Học sinh chưa tham gia lớp học nào
          </div>
        ) : (
          <div className="space-y-6">
            {/* Class selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Chọn lớp</label>
              <Select
                value={selectedClass || ""}
                onValueChange={setSelectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lớp" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.classId} value={c.classId}>
                      {c.className} ({formatEnrollmentStatus(c.status)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClassData && (
              <Card className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">
                      {selectedClassData.className}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ngày tham gia:{" "}
                      {new Date(
                        selectedClassData.enrollmentDate
                      ).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        selectedClassData.status === "active"
                          ? "bg-blue-100 text-blue-700"
                          : selectedClassData.status === "trial"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                      }
                    >
                      {formatEnrollmentStatus(selectedClassData.status)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransferDialogOpen(true)}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Chuyển lớp
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Lịch học
                  </div>
                  <WeeklyScheduleCalendar
                    daysOfWeek={selectedClassData.daysOfWeek}
                    durationMinutes={selectedClassData.durationMinutes}
                    classData={
                      {
                        id: selectedClassData.classId,
                        name: selectedClassData.className,
                        days_of_week: selectedClassData.daysOfWeek,
                        duration_minutes: selectedClassData.durationMinutes,
                        current_student_count: 0,
                        max_student_count: 0,
                        monthly_fee: 0,
                        salary_per_session: 0,
                        start_date: "",
                        end_date: "",
                        is_active: true,
                        created_at: "",
                        updated_at: "",
                      } as Class
                    }
                  />
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Transfer class dialog */}
        {selectedClassData && (
          <TransferClassDialog
            studentId={student.id}
            currentClassId={selectedClassData.classId}
            currentClassName={selectedClassData.className}
            currentClassSubject={selectedClassData.classSubject}
            currentClassSchedule={selectedClassData.daysOfWeek}
            currentClassDuration={selectedClassData.durationMinutes}
            currentClassStatus={selectedClassData.status}
            open={transferDialogOpen}
            onOpenChange={(open) => {
              setTransferDialogOpen(open);
              if (!open) {
                // Refresh student classes when transfer dialog closes
                if (student.id) {
                  reloadClasses();
                }
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
