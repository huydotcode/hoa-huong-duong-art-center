"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getEnrollmentsByClassForGrades,
  getAllEnrollmentsForTeacher,
  updateEnrollmentScores,
  bulkUpdateScores,
  getTeacherClassesForGrades,
  type GradeRow,
} from "@/lib/services/teacher-grades-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  useForm,
  useFieldArray,
  Controller,
  Control,
  useWatch,
} from "react-hook-form";

interface FormValues {
  students: GradeRow[];
}

export default function GradesClient() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [savingAll, setSavingAll] = useState(false);
  const [showAllClasses, setShowAllClasses] = useState(true);
  const queryClient = useQueryClient();

  // Initialize form
  const { control, handleSubmit, getValues } = useForm<FormValues>({
    defaultValues: {
      students: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "students",
    keyName: "fieldId", // Add keyName to avoid conflict with id property in GradeRow if any
  });

  // Fetch classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ["teacher-grades-classes"],
    queryFn: () => getTeacherClassesForGrades(),
  });

  // Fetch enrollments
  const { data: serverRows, isLoading: isLoadingRows } = useQuery({
    queryKey: ["teacher-grades-rows", showAllClasses ? "all" : selectedClassId],
    queryFn: async () => {
      if (showAllClasses) {
        return getAllEnrollmentsForTeacher();
      } else if (selectedClassId) {
        return getEnrollmentsByClassForGrades(selectedClassId);
      }
      return [];
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (serverRows) {
      replace(serverRows);
    }
  }, [serverRows, replace]);

  const handleScoreChange = (value: string): number | null => {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    // Clamp to [0, 10]
    return Math.max(0, Math.min(10, parsed));
  };

  const handleSaveRow = async (index: number) => {
    const row = getValues(`students.${index}`);
    if (!row) return;

    try {
      // Trim nhận xét khi lưu
      const trimmedNotes = row.teacher_notes?.trim() || null;
      await updateEnrollmentScores(row.enrollment_id, {
        score_1: row.score_1 ?? null,
        score_2: row.score_2 ?? null,
        score_3: row.score_3 ?? null,
        teacher_notes: trimmedNotes,
      });
      toast.success(`Đã lưu điểm và nhận xét cho ${row.student_name}`);
      queryClient.invalidateQueries({ queryKey: ["teacher-grades-rows"] });
    } catch (error) {
      console.error("handleSaveRow error:", error);
      toast.error(`Lưu điểm thất bại cho ${row.student_name}`);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (data.students.length === 0) return;
    setSavingAll(true);
    try {
      const rows = data.students;
      if (showAllClasses) {
        // Lưu từng lớp riêng biệt
        const rowsByClass = new Map<string, GradeRow[]>();
        rows.forEach((row) => {
          if (!rowsByClass.has(row.class_id)) {
            rowsByClass.set(row.class_id, []);
          }
          rowsByClass.get(row.class_id)!.push(row);
        });

        for (const [classId, classRows] of rowsByClass.entries()) {
          await bulkUpdateScores(
            classId,
            classRows.map((row) => ({
              enrollment_id: row.enrollment_id,
              score_1: row.score_1 ?? null,
              score_2: row.score_2 ?? null,
              score_3: row.score_3 ?? null,
              teacher_notes: row.teacher_notes?.trim() || null,
            }))
          );
        }
        toast.success("Đã lưu tất cả điểm và nhận xét của tất cả các lớp.");
      } else if (selectedClassId) {
        await bulkUpdateScores(
          selectedClassId,
          rows.map((row) => ({
            enrollment_id: row.enrollment_id,
            score_1: row.score_1 ?? null,
            score_2: row.score_2 ?? null,
            score_3: row.score_3 ?? null,
            teacher_notes: row.teacher_notes?.trim() || null,
          }))
        );
        toast.success("Đã lưu tất cả điểm và nhận xét của lớp.");
      }
      queryClient.invalidateQueries({ queryKey: ["teacher-grades-rows"] });
    } catch (error) {
      console.error("handleSaveAll error:", error);
      toast.error("Lưu tất cả điểm thất bại.");
    } finally {
      setSavingAll(false);
    }
  };

  const handleExportExcel = async () => {
    const rows = getValues("students");
    if (rows.length === 0) {
      toast.error("Chưa có dữ liệu để xuất.");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const className = showAllClasses
        ? "TatCaCacLop"
        : classes.find((c) => c.id === selectedClassId)?.name || "Lop";

      const toFixed1 = (v: number) =>
        Number.isFinite(v) ? Number(v.toFixed(1)) : v;

      const data = rows.map((row, idx) => {
        const scores = [row.score_1, row.score_2, row.score_3].filter(
          (s): s is number => typeof s === "number"
        );
        const avg =
          scores.length > 0
            ? toFixed1(scores.reduce((sum, s) => sum + s, 0) / scores.length)
            : "";

        return {
          STT: idx + 1,
          Lớp: showAllClasses ? row.class_name : "",
          "Họ Tên": row.student_name,
          SĐT: row.phone || "",
          "Điểm 1": row.score_1 ?? "",
          "Điểm 2": row.score_2 ?? "",
          "Điểm 3": row.score_3 ?? "",
          "Điểm TB": avg,
          "Nhận xét": row.teacher_notes || "",
        };
      });

      const headers = showAllClasses
        ? [
            "STT",
            "Lớp",
            "Họ Tên",
            "SĐT",
            "Điểm 1",
            "Điểm 2",
            "Điểm 3",
            "Điểm TB",
            "Nhận xét",
          ]
        : [
            "STT",
            "Họ Tên",
            "SĐT",
            "Điểm 1",
            "Điểm 2",
            "Điểm 3",
            "Điểm TB",
            "Nhận xét",
          ];

      const ws = XLSX.utils.json_to_sheet(data, { header: headers });

      // Set column widths
      (ws as unknown as { ["!cols"]?: Array<{ wch: number }> })["!cols"] =
        showAllClasses
          ? [
              { wch: 6 },
              { wch: 20 },
              { wch: 28 },
              { wch: 14 },
              { wch: 10 },
              { wch: 10 },
              { wch: 10 },
              { wch: 10 },
              { wch: 40 },
            ]
          : [
              { wch: 6 },
              { wch: 28 },
              { wch: 14 },
              { wch: 10 },
              { wch: 10 },
              { wch: 10 },
              { wch: 10 },
              { wch: 40 },
            ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Grades");

      const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_");
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const filename = `diem_${safe(className)}_${yyyy}-${mm}-${dd}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success("Đã xuất Excel thành công.");
    } catch (error) {
      console.error("Export excel error:", error);
      toast.error("Xuất Excel thất bại.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Lớp:</span>
          <Select
            value={showAllClasses ? "all" : selectedClassId}
            onValueChange={(value) => {
              if (value === "all") {
                setSelectedClassId("");
                setShowAllClasses(true);
              } else {
                setSelectedClassId(value);
                setShowAllClasses(false);
              }
            }}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue
                placeholder={isLoadingClasses ? "Đang tải..." : "Chọn lớp"}
              />
            </SelectTrigger>
            <SelectContent>
              {isLoadingClasses ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : classes.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Bạn chưa được phân công lớp.
                </div>
              ) : (
                <>
                  <SelectItem value="all">Tất cả các lớp</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="default"
          onClick={() => handleSubmit(onSubmit)()}
          disabled={fields.length === 0 || savingAll}
        >
          {savingAll ? "Đang lưu..." : "Lưu tất cả"}
        </Button>
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={fields.length === 0}
        >
          Xuất Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách học sinh</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingRows ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fields.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Chưa có học sinh trong lớp này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    {showAllClasses && (
                      <th className="px-3 py-2 text-left min-w-[180px]">Lớp</th>
                    )}
                    <th className="px-3 py-2 text-left min-w-[220px]">
                      Họ và tên
                    </th>
                    <th className="px-3 py-2 text-left min-w-[140px]">SĐT</th>
                    <th className="px-3 py-2 text-center w-[120px]">Điểm 1</th>
                    <th className="px-3 py-2 text-center w-[120px]">Điểm 2</th>
                    <th className="px-3 py-2 text-center w-[120px]">Điểm 3</th>
                    <th className="px-3 py-2 text-center w-[120px]">Điểm TB</th>
                    <th className="px-3 py-2 text-left min-w-[200px]">
                      Nhận xét
                    </th>
                    <th className="px-3 py-2 text-right w-[120px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.fieldId} className="border-t">
                      {showAllClasses && (
                        <td className="px-3 py-2">
                          <div className="font-medium text-muted-foreground">
                            {field.class_name}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="font-medium">{field.student_name}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {field.phone || "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Controller
                          control={control}
                          name={`students.${index}.score_1`}
                          render={({ field: { value, onChange, ...rest } }) => (
                            <Input
                              {...rest}
                              value={value ?? ""}
                              onChange={(e) => {
                                const val = handleScoreChange(e.target.value);
                                // If input is empty string, we set null to state but show empty string in input via value prop
                                // handleScoreChange returns null for empty string
                                onChange(e.target.value === "" ? null : val);
                              }}
                              inputMode="decimal"
                              min={0}
                              max={10}
                              step="0.1"
                              className="h-8 text-center"
                              placeholder="-"
                            />
                          )}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Controller
                          control={control}
                          name={`students.${index}.score_2`}
                          render={({ field: { value, onChange, ...rest } }) => (
                            <Input
                              {...rest}
                              value={value ?? ""}
                              onChange={(e) => {
                                const val = handleScoreChange(e.target.value);
                                onChange(e.target.value === "" ? null : val);
                              }}
                              inputMode="decimal"
                              min={0}
                              max={10}
                              step="0.1"
                              className="h-8 text-center"
                              placeholder="-"
                            />
                          )}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Controller
                          control={control}
                          name={`students.${index}.score_3`}
                          render={({ field: { value, onChange, ...rest } }) => (
                            <Input
                              {...rest}
                              value={value ?? ""}
                              onChange={(e) => {
                                const val = handleScoreChange(e.target.value);
                                onChange(e.target.value === "" ? null : val);
                              }}
                              inputMode="decimal"
                              min={0}
                              max={10}
                              step="0.1"
                              className="h-8 text-center"
                              placeholder="-"
                            />
                          )}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <RowAverage control={control} index={index} />
                      </td>
                      <td className="px-3 py-2">
                        <Controller
                          control={control}
                          name={`students.${index}.teacher_notes`}
                          render={({ field: { value, onChange, ...rest } }) => (
                            <Textarea
                              {...rest}
                              value={value ?? ""}
                              onChange={onChange}
                              className="min-h-[60px] text-sm resize-none"
                              placeholder="Nhập nhận xét..."
                            />
                          )}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          onClick={() => void handleSaveRow(index)}
                        >
                          Lưu
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RowAverage({
  control,
  index,
}: {
  control: Control<FormValues>;
  index: number;
}) {
  const scores = useWatch({
    control,
    name: [
      `students.${index}.score_1`,
      `students.${index}.score_2`,
      `students.${index}.score_3`,
    ],
  });

  const validScores = scores.filter((s): s is number => typeof s === "number");
  if (validScores.length === 0) return <span>-</span>;
  const avg = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
  return <span>{avg.toFixed(1)}</span>;
}
