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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import {
  enrollStudent,
  updateStudentEnrollment,
  getClassesIdAndName,
} from "@/lib/services/admin-classes-service";
import { getStudentById } from "@/lib/services/admin-students-service";
import { formatEnrollmentStatus, formatDateShort } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, X } from "lucide-react";
import type { StudentWithClassSummary } from "@/types";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { EnrollmentStatus } from "@/types/database";

interface ManageStudentClassesDialogProps {
  student: StudentWithClassSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EnrollmentWithClass = {
  enrollmentId: string;
  classId: string;
  className: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  leaveDate: string | null;
};

export function ManageStudentClassesDialog({
  student,
  open,
  onOpenChange,
}: ManageStudentClassesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentWithClass[]>([]);
  const [availableClasses, setAvailableClasses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClassId, setNewClassId] = useState("");
  const [newStatus, setNewStatus] = useState<EnrollmentStatus>("trial");
  const [newEnrollmentDate, setNewEnrollmentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [adding, setAdding] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);

  // Fetch all enrollments (including inactive)
  const fetchEnrollments = useCallback(async () => {
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
        classes(id, name)
      `
      )
      .eq("student_id", student.id)
      .order("enrollment_date", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((e) => {
      const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
      return {
        enrollmentId: e.id,
        classId: e.class_id,
        className: classData?.name || "Lớp không tồn tại",
        enrollmentDate: e.enrollment_date,
        status: e.status as EnrollmentStatus,
        leaveDate: e.leave_date,
      };
    });
  }, [student.id, supabase]);

  // Fetch available classes (excluding already enrolled)
  const fetchAvailableClasses = useCallback(async () => {
    const enrolledClassIds = enrollments.map((e) => e.classId);
    const classes = await getClassesIdAndName();
    return classes.filter((c) => !enrolledClassIds.includes(c.id));
  }, [enrollments]);

  // Load data when dialog opens
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const enrollmentsData = await fetchEnrollments();
        setEnrollments(enrollmentsData);
      } catch (error) {
        console.error("Error loading enrollments:", error);
        toast.error("Lỗi khi tải danh sách lớp học");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, fetchEnrollments]);

  // Load available classes when showing add form
  useEffect(() => {
    if (!showAddForm || !open) return;

    const loadClasses = async () => {
      try {
        const classes = await fetchAvailableClasses();
        setAvailableClasses(classes);
      } catch (error) {
        console.error("Error loading classes:", error);
        toast.error("Lỗi khi tải danh sách lớp học");
      }
    };

    loadClasses();
  }, [showAddForm, open, fetchAvailableClasses]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setShowAddForm(false);
      setNewClassId("");
      setNewStatus("trial");
      setNewEnrollmentDate(new Date().toISOString().split("T")[0]);
      setEditingStatus(null);
    }
  }, [open]);

  const handleAddEnrollment = async () => {
    if (!newClassId || !student.id) return;

    setAdding(true);
    try {
      await enrollStudent(
        newClassId,
        student.id,
        {
          enrollment_date: newEnrollmentDate,
          status: newStatus,
        },
        "/admin/students"
      );

      toast.success("Thêm học sinh vào lớp thành công!");

      // Reload enrollments
      const enrollmentsData = await fetchEnrollments();
      setEnrollments(enrollmentsData);

      // Fetch updated student data and dispatch event to update the table
      try {
        const updatedStudent = await getStudentById(student.id);
        if (updatedStudent) {
          // Dispatch event để students-list cập nhật
          window.dispatchEvent(
            new CustomEvent("student-updated", {
              detail: { student: updatedStudent },
            })
          );
        }
      } catch (error) {
        console.error("Error fetching updated student:", error);
        // Vẫn refresh router để đảm bảo data được cập nhật
        router.refresh();
      }

      // Reset form
      setShowAddForm(false);
      setNewClassId("");
      setNewStatus("trial");
      setNewEnrollmentDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Error adding enrollment:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Thêm học sinh vào lớp thất bại"
      );
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStatus = async (
    enrollmentId: string,
    newStatus: EnrollmentStatus
  ) => {
    try {
      await updateStudentEnrollment(
        enrollmentId,
        { status: newStatus },
        "/admin/students"
      );

      toast.success("Cập nhật trạng thái thành công!");

      // Reload enrollments
      const enrollmentsData = await fetchEnrollments();
      setEnrollments(enrollmentsData);

      // Fetch updated student data and dispatch event to update the table
      try {
        const updatedStudent = await getStudentById(student.id);
        if (updatedStudent) {
          // Dispatch event để students-list cập nhật
          window.dispatchEvent(
            new CustomEvent("student-updated", {
              detail: { student: updatedStudent },
            })
          );
        }
      } catch (error) {
        console.error("Error fetching updated student:", error);
        // Vẫn refresh router để đảm bảo data được cập nhật
        router.refresh();
      }

      setEditingStatus(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Cập nhật trạng thái thất bại");
    }
  };

  const getStatusBadgeVariant = (status: EnrollmentStatus) => {
    switch (status) {
      case "active":
        return "default";
      case "trial":
        return "secondary";
      case "inactive":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeClassName = (status: EnrollmentStatus) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-700";
      case "trial":
        return "bg-purple-100 text-purple-700";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        maxWidth="max-w-4xl"
        className="w-full max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Quản lý lớp học - {student.full_name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 overflow-x-auto">
            {/* Add new enrollment form */}
            {!showAddForm ? (
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm vào lớp mới
              </Button>
            ) : (
              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Thêm vào lớp mới</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewClassId("");
                      setNewStatus("trial");
                      setNewEnrollmentDate(
                        new Date().toISOString().split("T")[0]
                      );
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chọn lớp</label>
                    <Select value={newClassId} onValueChange={setNewClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn lớp" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClasses.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trạng thái</label>
                    <Select
                      value={newStatus}
                      onValueChange={(value) =>
                        setNewStatus(value as EnrollmentStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Học thử</SelectItem>
                        <SelectItem value="active">Đang học</SelectItem>
                        <SelectItem value="inactive">Ngừng học</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ngày tham gia</label>
                    <Input
                      type="date"
                      value={newEnrollmentDate}
                      onChange={(e) => setNewEnrollmentDate(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddEnrollment}
                  disabled={!newClassId || adding}
                  className="w-full"
                >
                  {adding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang thêm...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm vào lớp
                    </>
                  )}
                </Button>
              </Card>
            )}

            {/* Enrollments list */}
            {enrollments.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Học sinh chưa tham gia lớp học nào
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-semibold">Danh sách lớp học</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableHeaderRow>
                        <TableHead>Tên lớp</TableHead>
                        <TableHead>Ngày tham gia</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => (
                        <TableRow key={enrollment.enrollmentId}>
                          <TableCell className="font-medium">
                            {enrollment.className}
                          </TableCell>
                          <TableCell>
                            {formatDateShort(enrollment.enrollmentDate)}
                          </TableCell>
                          <TableCell>
                            {editingStatus === enrollment.enrollmentId ? (
                              <Select
                                value={enrollment.status}
                                onValueChange={(value) => {
                                  handleUpdateStatus(
                                    enrollment.enrollmentId,
                                    value as EnrollmentStatus
                                  );
                                }}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setEditingStatus(null);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="trial">Học thử</SelectItem>
                                  <SelectItem value="active">
                                    Đang học
                                  </SelectItem>
                                  <SelectItem value="inactive">
                                    Ngừng học
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant={getStatusBadgeVariant(
                                  enrollment.status
                                )}
                                className={getStatusBadgeClassName(
                                  enrollment.status
                                )}
                              >
                                {formatEnrollmentStatus(enrollment.status)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingStatus(
                                  editingStatus === enrollment.enrollmentId
                                    ? null
                                    : enrollment.enrollmentId
                                );
                              }}
                              title="Đổi trạng thái"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
