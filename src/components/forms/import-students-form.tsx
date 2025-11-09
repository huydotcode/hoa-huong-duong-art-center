"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Upload, Loader2, Download, Pencil, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import {
  parseExcelFile,
  validateStudentRow,
  type StudentRowWithStatus,
} from "@/lib/utils/import-students";
import { importStudentsFromExcel } from "@/lib/services/admin-students-service";
import { usePathname } from "next/navigation";
import { normalizePhone } from "@/lib/utils";

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
  const router = useRouter();
  const pathname = usePathname();

  const editForm = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      full_name: "",
      phone: "",
    },
  });

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

      if (result.success > 0) {
        toast.success(`Đã import thành công ${result.success} học sinh`);
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

      // Reset form
      setAllRows([]);
      setEditingRowIndex(null);
      setOpen(false);

      // Refresh page
      router.refresh();
    } catch (error) {
      console.error("Error importing students:", error);
      toast.error("Lỗi khi import học sinh", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create template Excel file
    const templateData = [
      ["Họ và tên", "Số điện thoại"],
      ["Nguyễn Văn A", "0123456789"],
      ["Trần Thị B", "0987654321"],
      ["Lê Văn C", ""], // Example with empty phone
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Học sinh");

    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, // Họ và tên
      { wch: 15 }, // Số điện thoại
    ];

    XLSX.writeFile(wb, "Mau_import_hoc_sinh.xlsx");
    toast.success("Đã tải file mẫu");
  };

  const validCount = allRows.filter((r) => r.isValid).length;
  const invalidCount = allRows.filter((r) => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              <div className="text-sm font-medium">Danh sách học sinh</div>
              <div className="max-h-96 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableHeaderRow>
                      <TableHead className="w-16">Dòng</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead className="w-24">Trạng thái</TableHead>
                      <TableHead className="w-32">Thao tác</TableHead>
                    </TableHeaderRow>
                  </TableHeader>
                  <TableBody>
                    {allRows.map((row, index) => (
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
                            {row.full_name}
                          </TableCell>
                          <TableCell>{row.phone || "-"}</TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <Badge variant="default">Hợp lệ</Badge>
                            ) : (
                              <Badge variant="destructive">Không hợp lệ</Badge>
                            )}
                          </TableCell>
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
                            <TableCell colSpan={5} className="p-2">
                              <div className="text-xs text-destructive">
                                <strong>Lỗi:</strong> {row.errors.join(", ")}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
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
                        Có thể để trống. Nếu nhập, phải có 10 số và bắt đầu bằng
                        0.
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
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || validCount === 0}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
