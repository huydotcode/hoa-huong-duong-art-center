"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { importStudentsFromExcel } from "@/lib/services/admin-students-service";
import { normalizePhone } from "@/lib/utils";
import {
  parseExcelFile,
  validateStudentRow,
  type StudentRowWithStatus,
  parseEnrollmentStatus,
  parseEnrollmentDate,
  parsePaymentStatusType,
} from "@/lib/utils/import-students";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  AlertTriangle,
  Download,
  Loader2,
  Pencil,
  Upload,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { z } from "zod";
import {
  getClasses,
  enrollStudents,
} from "@/lib/services/admin-classes-service";
import type { ClassListItem } from "@/types";
import { normalizeText } from "@/lib/utils";
import { PaymentConfirmationDialog } from "@/components/forms/payment-confirmation-dialog";

interface ImportStudentsFormProps {
  children: React.ReactNode;
}

// Schema for editing student row
const editStudentSchema = z.object({
  full_name: z.string().min(1, "Họ và tên không được để trống"),
  phone: z
    .string()
    .refine(
      (val) => {
        if (!val || val.trim().length === 0) return true;
        const trimmed = val.trim();
        return /^0\d{9}$/.test(trimmed);
      },
      {
        message: "Số điện thoại phải có 10 số và bắt đầu bằng 0.",
      }
    )
    .optional()
    .or(z.literal("")),
});

type EditStudentFormData = z.infer<typeof editStudentSchema>;

export function ImportStudentsForm({ children }: ImportStudentsFormProps) {
  const [open, setOpen] = useState(false);
  const [allRows, setAllRows] = useState<StudentRowWithStatus[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [duplicateStudents, setDuplicateStudents] = useState<
    Array<{
      rowIndex: number;
      full_name: string;
      phone: string | null;
    }>
  >([]);
  const [pendingImportData, setPendingImportData] = useState<
    StudentRowWithStatus[]
  >([]);

  // States for class enrollment
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<
    Record<number, string>
  >({}); // rowIndex -> classId
  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<number, "trial" | "active" | "inactive">
  >({}); // rowIndex -> status
  const [enrolling, setEnrolling] = useState(false);

  // States for payment confirmation
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [enrolledStudentsForPayment, setEnrolledStudentsForPayment] = useState<
    Array<{
      studentId: string;
      studentName: string;
      classId: string;
      className: string;
      rowIndex: number;
      enrollmentDate: string;
      suggestedPaymentStatus: "paid" | "unpaid" | "inactive";
    }>
  >([]);

  const router = useRouter();
  const pathname = usePathname();

  const editForm = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      full_name: "",
      phone: "",
    },
  });

  // Load classes when dialog opens
  useEffect(() => {
    if (open) {
      loadClasses();
    }
  }, [open]);

  async function loadClasses() {
    setLoadingClasses(true);
    try {
      const allClasses = await getClasses("", { is_active: true });
      setClasses(allClasses);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Không thể tải danh sách lớp");
    } finally {
      setLoadingClasses(false);
    }
  }

  // Gợi ý lớp dựa trên môn học
  function suggestClass(row: StudentRowWithStatus): ClassListItem | null {
    if (!row.subject || classes.length === 0) return null;

    const normalizedSubject = normalizeText(row.subject.trim().toLowerCase());

    const matchingClasses = classes.filter((c) => {
      const normalizedClassName = normalizeText(c.name.toLowerCase());
      return normalizedClassName.includes(normalizedSubject);
    });

    if (matchingClasses.length === 0) return null;
    if (matchingClasses.length === 1) return matchingClasses[0];

    return matchingClasses[0];
  }

  async function handleEnroll() {
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

    // Lấy từ allRows thay vì importedStudentsWithIds để có thể enroll cả học sinh vừa import
    for (const row of allRows) {
      if (!row.studentId || !row.isValid) continue;

      const classId = selectedClasses[row.rowIndex];
      if (!classId) continue;

      const status =
        selectedStatuses[row.rowIndex] ||
        parseEnrollmentStatus(row.payment_status, row.trial_note);
      const enrollmentDate = parseEnrollmentDate(row.trial_note);

      const key = `${classId}|${status}|${enrollmentDate}`;

      if (!enrollmentsByKey[key]) {
        enrollmentsByKey[key] = [];
      }

      enrollmentsByKey[key].push({
        studentId: row.studentId,
        status,
        enrollment_date: enrollmentDate,
        rowIndex: row.rowIndex,
      });
    }

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
              : `Lỗi khi enroll ${enrollments.length} học sinh vào lớp`
          );
        }
      }

      if (successCount > 0) {
        toast.success(`Đã enroll thành công ${successCount} học sinh vào lớp`);

        // Chuẩn bị data cho payment dialog
        const enrolledStudentsForPayment = Object.values(enrollmentsByKey)
          .flat()
          .map((e) => {
            const row = allRows.find((r) => r.rowIndex === e.rowIndex);
            const classId = selectedClasses[e.rowIndex];
            const classData = classes.find((c) => c.id === classId);

            return {
              studentId: e.studentId,
              studentName: row?.full_name || "",
              classId: classId,
              className: classData?.name || "",
              rowIndex: e.rowIndex,
              enrollmentDate: e.enrollment_date,
              suggestedPaymentStatus: parsePaymentStatusType(
                row?.payment_status
              ),
            };
          })
          .filter((e) => e.classId && e.studentId); // Chỉ lấy những học sinh đã enroll thành công

        if (enrolledStudentsForPayment.length > 0) {
          setEnrolledStudentsForPayment(enrolledStudentsForPayment);
          setPaymentDialogOpen(true);
        } else {
          // Nếu không có học sinh nào để tạo payment, đóng dialog luôn
          router.refresh();
          handleDialogChange(false);
        }
      }

      if (errorCount > 0) {
        toast.warning(`Không thể enroll ${errorCount} học sinh`);
      }
    } catch (error) {
      console.error("Error in enrollment process:", error);
      toast.error("Lỗi khi enroll học sinh");
    } finally {
      setEnrolling(false);
    }
  }

  // Validate all rows (allow duplicate phones)
  const revalidateAllRows = (
    rows: Array<{ full_name: string; phone: string; rowIndex: number }>
  ): StudentRowWithStatus[] => {
    // Validate each row individually (duplicate phones are allowed)
    const validatedRows: StudentRowWithStatus[] = rows.map((row) => {
      const validation = validateStudentRow(row);
      return {
        ...row,
        isValid: validation.valid,
        errors: validation.errors,
      };
    });

    return validatedRows;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (
      !validTypes.includes(selectedFile.type) &&
      !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      toast.error("File không hợp lệ", {
        description: "Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV (.csv)",
      });
      return;
    }

    setIsParsing(true);
    setAllRows([]);
    setEditingRowIndex(null);

    try {
      // Parse file
      const rows = await parseExcelFile(selectedFile);

      if (rows.length === 0) {
        toast.error("File không có dữ liệu", {
          description: "File Excel không chứa dữ liệu học sinh",
        });
        setIsParsing(false);
        return;
      }

      // Validate all rows and add status
      const rowsWithStatus = revalidateAllRows(rows);

      setAllRows(rowsWithStatus);

      const validCount = rowsWithStatus.filter((r) => r.isValid).length;
      const invalidCount = rowsWithStatus.filter((r) => !r.isValid).length;

      if (validCount === 0) {
        toast.error("Không có dữ liệu hợp lệ", {
          description: "Tất cả các dòng đều có lỗi",
        });
      } else if (invalidCount > 0) {
        toast.warning(`Có ${invalidCount} học sinh không hợp lệ`, {
          description: `${validCount} học sinh hợp lệ sẽ được import`,
        });
      } else {
        toast.success(`Đã đọc ${validCount} học sinh`, {
          description: "Tất cả dữ liệu đều hợp lệ",
        });
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Lỗi khi đọc file", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleEditRow = (values: EditStudentFormData) => {
    if (editingRowIndex === null) return;

    const updatedRows = [...allRows];
    const rowToUpdate = updatedRows[editingRowIndex];

    // Update row data
    rowToUpdate.full_name = values.full_name.trim();
    rowToUpdate.phone = normalizePhone(values.phone || "");

    // Re-validate all rows
    const revalidatedRows = revalidateAllRows(updatedRows);
    setAllRows(revalidatedRows);
    setEditingRowIndex(null);
    editForm.reset();

    const updatedRow = revalidatedRows[editingRowIndex];
    if (updatedRow.isValid) {
      toast.success("Đã cập nhật học sinh thành công");
    } else {
      toast.warning("Đã cập nhật nhưng vẫn còn lỗi", {
        description: updatedRow.errors.join(", "),
      });
    }
  };

  const handleImportSuccess = async (
    result: {
      success: number;
      errors: Array<{ row: number; errors: string[] }>;
      studentIds: Array<{ rowIndex: number; studentId: string }>;
    },
    validRows: StudentRowWithStatus[],
    invalidRows: StudentRowWithStatus[]
  ) => {
    if (result.success > 0) {
      toast.success(`Đã import thành công ${result.success} học sinh`);

      // Map studentIds vào allRows để hiển thị trong bảng
      const updatedRows = allRows.map((row) => {
        const studentIdData = result.studentIds.find(
          (s) => s.rowIndex === row.rowIndex
        );
        if (studentIdData) {
          return {
            ...row,
            studentId: studentIdData.studentId,
          };
        }
        return row;
      });

      setAllRows(updatedRows);
    }

    if (result.errors.length > 0) {
      toast.warning(`Có ${result.errors.length} học sinh không thể import`, {
        description: "Kiểm tra chi tiết trong danh sách lỗi",
      });
    }

    if (invalidRows.length > 0) {
      toast.info(`Đã bỏ qua ${invalidRows.length} học sinh không hợp lệ`, {
        description: "Vui lòng chỉnh sửa và import lại nếu cần",
      });
    }

    setIsLoading(false);
  };

  const handleImport = async () => {
    // Filter only valid rows
    const validRows = allRows.filter((row) => row.isValid);
    const invalidRows = allRows.filter((row) => !row.isValid);

    if (validRows.length === 0) {
      toast.error("Không có học sinh hợp lệ để import");
      return;
    }

    // Show warning if there are invalid rows
    if (invalidRows.length > 0) {
      const confirmed = window.confirm(
        `Có ${invalidRows.length} học sinh không hợp lệ sẽ bị bỏ qua.\n` +
          `Chỉ import ${validRows.length} học sinh hợp lệ.\n\n` +
          `Bạn có muốn tiếp tục không?`
      );
      if (!confirmed) return;
    }

    setIsLoading(true);
    try {
      const result = await importStudentsFromExcel(
        validRows.map((row) => ({
          full_name: row.full_name,
          phone: row.phone,
          rowIndex: row.rowIndex,
        })),
        pathname
      );

      // If there are duplicates, show alert dialog
      if (result.duplicates && result.duplicates.length > 0) {
        setDuplicateStudents(result.duplicates);
        setPendingImportData(validRows);
        setShowDuplicateAlert(true);
        setIsLoading(false);
        return;
      }

      // No duplicates, proceed normally
      await handleImportSuccess(result, validRows, invalidRows);
    } catch (error) {
      console.error("Error importing students:", error);
      toast.error("Lỗi khi import học sinh", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại",
      });
      setIsLoading(false);
    }
  };

  const handleConfirmImportWithDuplicates = async () => {
    setIsLoading(true);
    try {
      const invalidRows = allRows.filter((row) => !row.isValid);
      const result = await importStudentsFromExcel(
        pendingImportData.map((row) => ({
          full_name: row.full_name,
          phone: row.phone,
          rowIndex: row.rowIndex,
        })),
        pathname,
        { skipDuplicateCheck: true }
      );

      await handleImportSuccess(result, pendingImportData, invalidRows);

      setShowDuplicateAlert(false);
      setDuplicateStudents([]);
      setPendingImportData([]);
    } catch (error) {
      console.error("Error importing students with duplicates:", error);
      toast.error("Lỗi khi import học sinh", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại",
      });
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create template Excel file with all columns
    const templateData = [
      [
        "STT",
        "Họ Tên",
        "SĐT",
        "Môn",
        "Thời gian",
        "Thứ",
        "Đóng học phí",
        "Ghi chú học thử",
      ],
      [
        "1",
        "Nguyễn Văn A",
        "0123456789",
        "Piano",
        "18h-19h",
        "Thứ 7 - CN",
        "Đã đóng",
        "",
      ],
      [
        "2",
        "Trần Thị B",
        "0987654321",
        "Guitar",
        "17h-18h",
        "Thứ 2 -4",
        "Đã đóng",
        "05/10",
      ],
      ["3", "Lê Văn C", "", "Piano", "9h-10h", "Thứ 7 - CN", "Nghỉ Luôn", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Học sinh");

    // Set column widths
    ws["!cols"] = [
      { wch: 5 }, // STT
      { wch: 25 }, // Họ và tên
      { wch: 15 }, // Số điện thoại
      { wch: 15 }, // Môn
      { wch: 15 }, // Thời gian
      { wch: 15 }, // Thứ
      { wch: 15 }, // Đóng học phí
      { wch: 20 }, // Ghi chú học thử
    ];

    XLSX.writeFile(wb, "Mau_import_hoc_sinh.xlsx");
    toast.success("Đã tải file mẫu");
  };

  const validCount = allRows.filter((r) => r.isValid).length;
  const invalidCount = allRows.filter((r) => !r.isValid).length;

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset khi đóng dialog
      setAllRows([]);
      setEditingRowIndex(null);
      setSelectedClasses({});
      setSelectedStatuses({});
    }
  };

  const studentsWithIds = allRows.filter((r) => r.studentId && r.isValid);
  const selectedCount = Object.values(selectedClasses).filter(
    (classId) => classId !== undefined && classId !== ""
  ).length;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          maxWidth="max-w-[95vw] sm:max-w-6xl lg:max-w-7xl"
          className="max-h-[90vh] overflow-y-auto w-full"
        >
          <DialogHeader>
            <DialogTitle>Import học sinh từ Excel</DialogTitle>
            <DialogDescription>
              Chọn file Excel (.xlsx, .xls, .csv) chứa danh sách học sinh. File
              cần có 2 cột: Họ và tên, Số điện thoại. Số điện thoại có thể để
              trống.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File input */}
            <div className="space-y-2">
              <Label htmlFor="file">Chọn file Excel</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  disabled={isParsing || isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Tải file mẫu
                </Button>
              </div>
            </div>

            {/* Loading state */}
            {isParsing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang đọc file...</span>
              </div>
            )}

            {/* Statistics */}
            {allRows.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="font-medium">Tổng:</span> {allRows.length}
                </div>
                <div className="text-green-600">
                  <span className="font-medium">Hợp lệ:</span> {validCount}
                </div>
                {invalidCount > 0 && (
                  <div className="text-destructive">
                    <span className="font-medium">Không hợp lệ:</span>{" "}
                    {invalidCount}
                  </div>
                )}
              </div>
            )}

            {/* Warning alert */}
            {invalidCount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm text-destructive">
                  <div className="font-medium mb-1">Cảnh báo</div>
                  <div>
                    Có {invalidCount} học sinh không hợp lệ. Vui lòng chỉnh sửa
                    hoặc bỏ qua để tiếp tục import. Chỉ học sinh hợp lệ sẽ được
                    import vào hệ thống.
                  </div>
                </div>
              </div>
            )}

            {/* Students table */}
            {allRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Danh sách học sinh</div>
                  {studentsWithIds.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectedCount > 0 && (
                        <span className="font-medium text-foreground">
                          Đã chọn lớp: {selectedCount}/{studentsWithIds.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bulk status update */}
                {studentsWithIds.length > 0 && selectedCount > 0 && (
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

                <div className="max-h-96 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableHeaderRow>
                        <TableHead className="w-16">Dòng</TableHead>
                        <TableHead>Họ và tên / Số điện thoại</TableHead>
                        <TableHead>Môn</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Thứ</TableHead>
                        <TableHead>Trạng thái học phí</TableHead>
                        <TableHead className="w-24">Trạng thái</TableHead>
                        {studentsWithIds.length > 0 && (
                          <>
                            <TableHead className="w-48">Lớp</TableHead>
                            <TableHead className="w-40">
                              Trạng thái học
                            </TableHead>
                          </>
                        )}
                        <TableHead className="w-32">Thao tác</TableHead>
                      </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                      {allRows.map((row, index) => {
                        const suggestedClass = suggestClass(row);
                        const selectedClassId = selectedClasses[row.rowIndex];

                        return (
                          <React.Fragment key={index}>
                            <TableRow
                              className={
                                row.isValid
                                  ? ""
                                  : "bg-destructive/5 hover:bg-destructive/10"
                              }
                            >
                              <TableCell className="font-medium">
                                {row.rowIndex}
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex flex-col gap-1">
                                  <span>{row.full_name}</span>
                                  {row.phone && (
                                    <span className="text-sm text-muted-foreground">
                                      {row.phone}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{row.subject || "-"}</TableCell>
                              <TableCell>{row.time_slot || "-"}</TableCell>
                              <TableCell>{row.days || "-"}</TableCell>
                              <TableCell>{row.payment_status || "-"}</TableCell>
                              <TableCell>
                                {row.isValid ? (
                                  <Badge variant="default">Hợp lệ</Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    Không hợp lệ
                                  </Badge>
                                )}
                              </TableCell>
                              {studentsWithIds.length > 0 && (
                                <>
                                  <TableCell>
                                    {row.studentId && row.isValid ? (
                                      <Select
                                        value={selectedClassId || "__none__"}
                                        onValueChange={(value) => {
                                          if (value === "__none__") {
                                            setSelectedClasses((prev) => {
                                              const updated = { ...prev };
                                              delete updated[row.rowIndex];
                                              return updated;
                                            });
                                          } else {
                                            setSelectedClasses((prev) => ({
                                              ...prev,
                                              [row.rowIndex]: value,
                                            }));
                                          }
                                        }}
                                        disabled={loadingClasses}
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Chọn lớp" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">
                                            <span className="text-muted-foreground italic">
                                              Không chọn lớp
                                            </span>
                                          </SelectItem>
                                          {classes.map((cls) => {
                                            const isSuggested =
                                              suggestedClass?.id === cls.id;
                                            return (
                                              <SelectItem
                                                key={cls.id}
                                                value={cls.id}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span>{cls.name}</span>
                                                  {isSuggested &&
                                                    !selectedClassId && (
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
                                    ) : (
                                      <span className="text-muted-foreground text-xs">
                                        Chưa import
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {row.studentId &&
                                    row.isValid &&
                                    selectedClassId ? (
                                      <Select
                                        value={
                                          selectedStatuses[row.rowIndex] ||
                                          parseEnrollmentStatus(
                                            row.payment_status,
                                            row.trial_note
                                          )
                                        }
                                        onValueChange={(value) => {
                                          setSelectedStatuses((prev) => ({
                                            ...prev,
                                            [row.rowIndex]: value as
                                              | "trial"
                                              | "active"
                                              | "inactive",
                                          }));
                                        }}
                                      >
                                        <SelectTrigger className="w-full">
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
                                    ) : (
                                      <span className="text-muted-foreground text-xs">
                                        -
                                      </span>
                                    )}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                {!row.isValid && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingRowIndex(index);
                                      editForm.reset({
                                        full_name: row.full_name,
                                        phone: row.phone || "",
                                      });
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Chỉnh sửa
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                            {!row.isValid && row.errors.length > 0 && (
                              <TableRow className="bg-destructive/5">
                                <TableCell
                                  colSpan={studentsWithIds.length > 0 ? 10 : 8}
                                  className="p-2"
                                >
                                  <div className="text-xs text-destructive">
                                    <strong>Lỗi:</strong>{" "}
                                    {row.errors.join(", ")}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* Edit Dialog */}
          <Dialog
            open={editingRowIndex !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingRowIndex(null);
                editForm.reset();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Chỉnh sửa học sinh (Dòng{" "}
                  {editingRowIndex !== null
                    ? allRows[editingRowIndex]?.rowIndex
                    : ""}
                  )
                </DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit(handleEditRow)}
                  className="space-y-4"
                >
                  <FormField
                    control={editForm.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Họ và tên</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập họ và tên"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số điện thoại (tùy chọn)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập số điện thoại (10 số, bắt đầu bằng 0)"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Có thể để trống. Nếu nhập, phải có 10 số và bắt đầu
                          bằng 0.
                        </p>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingRowIndex(null);
                        editForm.reset();
                      }}
                    >
                      Hủy
                    </Button>
                    <Button type="submit">Lưu</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setAllRows([]);
                setEditingRowIndex(null);
              }}
              disabled={isLoading || enrolling}
            >
              Hủy
            </Button>
            {studentsWithIds.length > 0 && selectedCount > 0 && (
              <Button
                onClick={handleEnroll}
                disabled={enrolling}
                variant="default"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang enroll...
                  </>
                ) : (
                  `Đăng ký lớp cho ${selectedCount} học sinh`
                )}
              </Button>
            )}
            {/* Chỉ hiện nút Import khi chưa có studentsWithIds (chưa import) */}
            {studentsWithIds.length === 0 && (
              <Button
                onClick={handleImport}
                disabled={isLoading || enrolling || validCount === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang import...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import ({validCount} học sinh)
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Alert Dialog */}
      <AlertDialog
        open={showDuplicateAlert}
        onOpenChange={setShowDuplicateAlert}
      >
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cảnh báo: Có học sinh trùng lặp
            </AlertDialogTitle>
            <AlertDialogDescription>
              Phát hiện {duplicateStudents.length} học sinh đã tồn tại trong hệ
              thống:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {duplicateStudents.map((dup, index) => (
              <div
                key={index}
                className="p-2 rounded-md bg-destructive/10 text-sm"
              >
                <strong>Dòng {dup.rowIndex}:</strong> {dup.full_name} -{" "}
                {dup.phone || "Không có SĐT"}
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Bạn có muốn import tất cả học sinh (kể cả những học sinh trùng lặp)
            không?
          </p>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmImportWithDuplicates}
              disabled={isLoading}
            >
              {isLoading ? "Đang xử lý..." : "Xác nhận import tất cả"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Confirmation Dialog */}
      <PaymentConfirmationDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) {
            // Khi đóng payment dialog → đóng luôn import dialog và refresh
            router.refresh();
            handleDialogChange(false);
          }
        }}
        enrolledStudents={enrolledStudentsForPayment}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
