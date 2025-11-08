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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyScheduleCalendar } from "@/app/(admin)/admin/classes/[classId]/_components/weekly-schedule-calendar";
import { getStudentCurrentClasses } from "@/lib/services/admin-students-service";
import { formatEnrollmentStatus } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Calendar, ArrowRight } from "lucide-react";
import type { Student } from "@/types";
import type { Class } from "@/types/database";
import { TransferClassDialog } from "./transfer-class-dialog";

interface StudentClassScheduleDialogProps {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  // Load student's current classes
  useEffect(() => {
    if (!open || !student.id) return;

    let cancelled = false;

    const loadClasses = async () => {
      setLoading(true);
      try {
        const data = await getStudentCurrentClasses(student.id);
        if (!cancelled) {
          setClasses(data);
          if (data.length > 0) {
            setSelectedClass(data[0].classId);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading student classes:", error);
          toast.error("Lỗi khi tải danh sách lớp học");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadClasses();

    return () => {
      cancelled = true;
    };
  }, [open, student.id]);

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
              <>
                {/* Class info */}
                <Card className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">
                        {selectedClassData.className}
                      </h3>
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
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ngày tham gia:{" "}
                      {new Date(
                        selectedClassData.enrollmentDate
                      ).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </Card>

                {/* Schedule calendar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium">Lịch học</label>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransferDialogOpen(true)}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Chuyển lớp
                    </Button>
                  </div>
                  <Card className="p-4">
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
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* Transfer class dialog */}
        {selectedClassData && (
          <TransferClassDialog
            studentId={student.id}
            currentClassId={selectedClassData.classId}
            currentClassName={selectedClassData.className}
            currentClassSchedule={selectedClassData.daysOfWeek}
            currentClassDuration={selectedClassData.durationMinutes}
            currentClassStatus={selectedClassData.status}
            open={transferDialogOpen}
            onOpenChange={(open) => {
              setTransferDialogOpen(open);
              if (!open) {
                // Refresh student classes when transfer dialog closes
                if (student.id) {
                  getStudentCurrentClasses(student.id)
                    .then((data) => {
                      setClasses(data);
                      if (data.length > 0) {
                        setSelectedClass(data[0].classId);
                      } else {
                        setSelectedClass(null);
                      }
                    })
                    .catch((error) => {
                      console.error("Error refreshing student classes:", error);
                    });
                }
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
