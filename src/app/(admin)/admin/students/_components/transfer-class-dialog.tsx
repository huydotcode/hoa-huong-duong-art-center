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
import { WeeklyScheduleCalendar } from "@/app/(admin)/admin/classes/[classId]/_components/weekly-schedule-calendar";
import {
  getClassesBySubject,
  moveStudentsToClass,
  getClassById,
} from "@/lib/services/admin-classes-service";
import { normalizeText, toArray } from "@/lib/utils";
import { SUBJECTS } from "@/lib/constants/subjects";
import { DAYS_MAP, DAY_ORDER } from "@/lib/constants/schedule";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, X } from "lucide-react";
import type { Class } from "@/types/database";
import { Input } from "@/components/ui/input";

interface TransferClassDialogProps {
  studentId: string;
  currentClassId: string;
  currentClassName: string;
  currentClassSubject?: string | null;
  currentClassSchedule: Array<{
    day: number;
    start_time: string;
    end_time?: string;
  }>;
  currentClassDuration: number;
  currentClassStatus: "trial" | "active" | "inactive";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferClassDialog({
  studentId,
  currentClassId,
  currentClassName,
  currentClassSubject,
  currentClassSchedule,
  currentClassDuration,
  currentClassStatus,
  open,
  onOpenChange,
}: TransferClassDialogProps) {
  const [availableClasses, setAvailableClasses] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableClassesWithDetails, setAvailableClassesWithDetails] =
    useState<Class[]>([]);
  const [filterDay, setFilterDay] = useState<number | "all">("all");
  const [filterTime, setFilterTime] = useState<string>("");
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [targetClassData, setTargetClassData] = useState<Class | null>(null);
  const [loadingClassesDetails, setLoadingClassesDetails] = useState(false);
  const [loadingTargetClass, setLoadingTargetClass] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const router = useRouter();

  // Load available classes by subject
  useEffect(() => {
    if (open && currentClassId) {
      // Ưu tiên dùng subject từ classData, fallback về extract từ name
      let matchingSubject: string | undefined;

      if (currentClassSubject) {
        // Use subject field if available
        matchingSubject = currentClassSubject;
      } else {
        // Fallback: Extract subject from class name
        const normalizedClassName = normalizeText(currentClassName);
        matchingSubject = SUBJECTS.find((subject) =>
          normalizedClassName.includes(normalizeText(subject))
        );
      }

      if (matchingSubject) {
        getClassesBySubject(matchingSubject, [currentClassId])
          .then(async (data) => {
            setAvailableClasses(data.map((c) => ({ id: c.id, name: c.name })));
            // Load full details for all available classes
            setLoadingClassesDetails(true);
            try {
              const details = await Promise.all(
                data.map((c) => getClassById(c.id))
              );
              const validDetails = details.filter(
                (c): c is Class => c !== null
              );
              setAvailableClassesWithDetails(validDetails);
              setFilteredClasses(validDetails);
            } catch (error) {
              console.error("Error loading class details:", error);
              toast.error("Lỗi khi tải chi tiết lớp học");
            } finally {
              setLoadingClassesDetails(false);
            }
          })
          .catch((error) => {
            console.error("Error loading available classes:", error);
            toast.error("Lỗi khi tải danh sách lớp cùng môn học");
          });
      } else {
        setAvailableClasses([]);
        setAvailableClassesWithDetails([]);
        setFilteredClasses([]);
      }
    }
  }, [open, currentClassId, currentClassName, currentClassSubject]);

  // Filter classes by day and time
  useEffect(() => {
    if (availableClassesWithDetails.length === 0) {
      setFilteredClasses([]);
      return;
    }

    let filtered = [...availableClassesWithDetails];

    // Filter by day
    if (filterDay !== "all") {
      filtered = filtered.filter((cls) => {
        const daysOfWeek = toArray<{
          day: number;
          start_time: string;
          end_time?: string;
        }>(cls.days_of_week);
        return daysOfWeek.some((slot) => slot.day === filterDay);
      });
    }

    // Filter by time
    if (filterTime.trim()) {
      const [filterHour, filterMin] = filterTime
        .split(":")
        .map((v) => parseInt(v, 10));
      const filterMinutes = (filterHour || 0) * 60 + (filterMin || 0);

      filtered = filtered.filter((cls) => {
        const daysOfWeek = toArray<{
          day: number;
          start_time: string;
          end_time?: string;
        }>(cls.days_of_week);
        return daysOfWeek.some((slot) => {
          const [startHour, startMin] = (slot.start_time || "00:00")
            .split(":")
            .map((v) => parseInt(v, 10));
          const startMinutes = (startHour || 0) * 60 + (startMin || 0);

          let endMinutes: number;
          if (slot.end_time) {
            const [endHour, endMin] = slot.end_time
              .split(":")
              .map((v) => parseInt(v, 10));
            endMinutes = (endHour || 0) * 60 + (endMin || 0);
          } else {
            endMinutes = startMinutes + (cls.duration_minutes || 60);
          }

          return filterMinutes >= startMinutes && filterMinutes <= endMinutes;
        });
      });
    }

    setFilteredClasses(filtered);
  }, [availableClassesWithDetails, filterDay, filterTime]);

  // Load target class details when selected
  useEffect(() => {
    if (targetClassId) {
      setLoadingTargetClass(true);
      getClassById(targetClassId)
        .then((data) => {
          setTargetClassData(data);
        })
        .catch((error) => {
          console.error("Error loading target class:", error);
          toast.error("Lỗi khi tải thông tin lớp học");
          setTargetClassData(null);
        })
        .finally(() => {
          setLoadingTargetClass(false);
        });
    } else {
      setTargetClassData(null);
    }
  }, [targetClassId]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setTargetClassId("");
      setTargetClassData(null);
      setFilterDay("all");
      setFilterTime("");
      setFilteredClasses([]);
    }
  }, [open]);

  const handleTransfer = async () => {
    if (!currentClassId || !targetClassId || !studentId) return;

    setTransferring(true);
    try {
      await moveStudentsToClass(
        currentClassId,
        targetClassId,
        [studentId],
        {
          enrollment_date: new Date().toISOString().split("T")[0],
          status: currentClassStatus, // Keep the same status when transferring
        },
        "/admin/students"
      );

      toast.success("Chuyển lớp thành công!");
      onOpenChange(false);
      // Refresh will be handled by parent component
      router.refresh();
    } catch (error) {
      console.error("Error transferring student:", error);
      toast.error("Chuyển lớp thất bại", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại sau.",
      });
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        maxWidth="max-w-5xl"
        className="w-full max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Chuyển lớp - {currentClassName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filter by day and time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lọc theo thứ</label>
              <Select
                value={filterDay === "all" ? "all" : String(filterDay)}
                onValueChange={(value) =>
                  setFilterDay(value === "all" ? "all" : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả các thứ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả các thứ</SelectItem>
                  {DAY_ORDER.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {DAYS_MAP[day].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Lọc theo giờ (HH:MM)
              </label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={filterTime}
                  onChange={(e) => setFilterTime(e.target.value)}
                  placeholder="VD: 14:30"
                  className="flex-1"
                />
                {filterTime && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFilterTime("")}
                    title="Xóa bộ lọc giờ"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Show filtered classes list */}
          {loadingClassesDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableClasses.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Không có lớp nào cùng môn học để chuyển
            </div>
          ) : filteredClasses.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Chọn lớp mới ({filteredClasses.length} lớp)
              </label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredClasses.map((cls) => (
                  <Card
                    key={cls.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      targetClassId === cls.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setTargetClassId(cls.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{cls.name}</h5>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {(() => {
                            const daysOfWeek = toArray<{
                              day: number;
                              start_time: string;
                              end_time?: string;
                            }>(cls.days_of_week);
                            if (daysOfWeek.length === 0) {
                              return "Chưa có lịch";
                            }
                            return daysOfWeek
                              .map((slot) => {
                                const dayLabel =
                                  DAYS_MAP[slot.day as keyof typeof DAYS_MAP]
                                    ?.short || "";
                                const timeRange = slot.end_time
                                  ? `${slot.start_time} - ${slot.end_time}`
                                  : slot.start_time;
                                return `${dayLabel} ${timeRange}`;
                              })
                              .join(", ");
                          })()}
                        </div>
                      </div>
                      {targetClassId === cls.id && (
                        <div className="ml-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {filterDay !== "all" || filterTime
                ? "Không tìm thấy lớp nào phù hợp với bộ lọc"
                : "Đang tải danh sách lớp..."}
            </div>
          )}

          {/* Show target class schedule when selected */}
          {targetClassId && targetClassData && (
            <div className="space-y-2 pt-2 border-t">
              {loadingTargetClass ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-sm mb-2">
                      Lịch học lớp mới: {targetClassData.name}
                    </h5>
                    <Card className="p-3 bg-background">
                      <WeeklyScheduleCalendar
                        daysOfWeek={targetClassData.days_of_week}
                        durationMinutes={targetClassData.duration_minutes}
                        classData={targetClassData}
                      />
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transfer button */}
          <Button
            onClick={handleTransfer}
            disabled={!targetClassId || transferring}
            className="w-full"
          >
            {transferring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang chuyển...
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Chuyển lớp
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
