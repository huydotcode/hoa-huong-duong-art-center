"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getEnrollmentsByClassForGrades,
  getAllEnrollmentsForTeacher,
  updateEnrollmentScores,
  bulkUpdateScores,
  type GradeRow,
} from "@/lib/services/teacher-grades-service";

interface ClassItem {
  id: string;
  name: string;
}

export default function GradesClient({ classes }: { classes: ClassItem[] }) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [savingAll, setSavingAll] = useState(false);
  const [showAllClasses, setShowAllClasses] = useState(true);

  // Tự động tải tất cả học sinh từ tất cả các lớp khi vào trang lần đầu
  useEffect(() => {
    if (showAllClasses && classes.length > 0) {
      startTransition(async () => {
        const data = await getAllEnrollmentsForTeacher();
        setRows(data);
      });
    }
  }, [showAllClasses, classes.length]);

  // Khi chọn lớp cụ thể, tải dữ liệu của lớp đó
  useEffect(() => {
    if (!selectedClassId) {
      if (!showAllClasses) {
        setRows([]);
      }
      return;
    }

    setShowAllClasses(false);
    startTransition(async () => {
      const data = await getEnrollmentsByClassForGrades(selectedClassId);
      setRows(data);
    });
  }, [selectedClassId, showAllClasses]);

  const handleScoreChange = (
    enrollmentId: string,
    key: "score_1" | "score_2" | "score_3",
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.enrollment_id !== enrollmentId) return row;
        if (value.trim() === "") {
          return { ...row, [key]: null };
        }
        const parsed = Number(value);
        if (Number.isNaN(parsed)) return row;
        // Clamp to [0, 10]
        const bounded = Math.max(0, Math.min(10, parsed));
        return { ...row, [key]: bounded };
      })
    );
  };

  const handleSaveRow = async (row: GradeRow) => {
    try {
      await updateEnrollmentScores(row.enrollment_id, {
        score_1: row.score_1 ?? null,
        score_2: row.score_2 ?? null,
        score_3: row.score_3 ?? null,
      });
      toast.success(`Đã lưu điểm cho ${row.student_name}`);
    } catch (error) {
      console.error("handleSaveRow error:", error);
      toast.error(`Lưu điểm thất bại cho ${row.student_name}`);
    }
  };

  const handleSaveAll = async () => {
    if (rows.length === 0) return;
    setSavingAll(true);
    try {
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
            }))
          );
        }
        toast.success("Đã lưu tất cả điểm của tất cả các lớp.");
      } else if (selectedClassId) {
        await bulkUpdateScores(
          selectedClassId,
          rows.map((row) => ({
            enrollment_id: row.enrollment_id,
            score_1: row.score_1 ?? null,
            score_2: row.score_2 ?? null,
            score_3: row.score_3 ?? null,
          }))
        );
        toast.success("Đã lưu tất cả điểm của lớp.");
      }
    } catch (error) {
      console.error("handleSaveAll error:", error);
      toast.error("Lưu tất cả điểm thất bại.");
    } finally {
      setSavingAll(false);
    }
  };

  const handleExportExcel = async () => {
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
          "Lớp": showAllClasses ? row.class_name : "",
          "Họ Tên": row.student_name,
          SĐT: row.phone || "",
          "Điểm 1": row.score_1 ?? "",
          "Điểm 2": row.score_2 ?? "",
          "Điểm 3": row.score_3 ?? "",
          "Điểm TB": avg,
        };
      });

      const headers = showAllClasses
        ? ["STT", "Lớp", "Họ Tên", "SĐT", "Điểm 1", "Điểm 2", "Điểm 3", "Điểm TB"]
        : ["STT", "Họ Tên", "SĐT", "Điểm 1", "Điểm 2", "Điểm 3", "Điểm TB"];

      const ws = XLSX.utils.json_to_sheet(data, { header: headers });

      // Set column widths
      (ws as unknown as { ["!cols"]?: Array<{ wch: number }> })["!cols"] = showAllClasses
        ? [
            { wch: 6 },
            { wch: 20 },
            { wch: 28 },
            { wch: 14 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
          ]
        : [
            { wch: 6 },
            { wch: 28 },
            { wch: 14 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
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
              <SelectValue placeholder="Chọn lớp" />
            </SelectTrigger>
            <SelectContent>
              {classes.length === 0 ? (
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
          onClick={handleSaveAll}
          disabled={rows.length === 0 || savingAll}
        >
          {savingAll ? "Đang lưu..." : "Lưu tất cả"}
        </Button>
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={rows.length === 0}
        >
          Xuất Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Danh sách học sinh</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isPending ? (
            <div className="p-4 text-sm text-muted-foreground">Đang tải...</div>
          ) : rows.length === 0 ? (
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
                    <th className="px-3 py-2 text-right w-[120px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.enrollment_id} className="border-t">
                      {showAllClasses && (
                        <td className="px-3 py-2">
                          <div className="font-medium text-muted-foreground">
                            {row.class_name}
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.student_name}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.phone || "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Input
                          inputMode="decimal"
                          min={0}
                          max={10}
                          step="0.1"
                          className="h-8 text-center"
                          value={row.score_1 ?? ""}
                          onChange={(event) =>
                            handleScoreChange(
                              row.enrollment_id,
                              "score_1",
                              event.target.value
                            )
                          }
                          placeholder="-"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Input
                          inputMode="decimal"
                          min={0}
                          max={10}
                          step="0.1"
                          className="h-8 text-center"
                          value={row.score_2 ?? ""}
                          onChange={(event) =>
                            handleScoreChange(
                              row.enrollment_id,
                              "score_2",
                              event.target.value
                            )
                          }
                          placeholder="-"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Input
                          inputMode="decimal"
                          min={0}
                          max={10}
                          step="0.1"
                          className="h-8 text-center"
                          value={row.score_3 ?? ""}
                          onChange={(event) =>
                            handleScoreChange(
                              row.enrollment_id,
                              "score_3",
                              event.target.value
                            )
                          }
                          placeholder="-"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {(() => {
                          const scores = [
                            row.score_1,
                            row.score_2,
                            row.score_3,
                          ].filter((s): s is number => typeof s === "number");
                          if (scores.length === 0) return "-";
                          const avg =
                            scores.reduce((sum, s) => sum + s, 0) /
                            scores.length;
                          return avg.toFixed(1);
                        })()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          onClick={() => void handleSaveRow(row)}
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
