"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toArray } from "@/lib/utils";
import { type Class } from "@/types";
import { EditDayScheduleForm } from "@/components/forms/edit-day-schedule-form";
import {
  DAYS_MAP,
  DAY_ORDER,
  TIME_PERIOD_ORDER,
} from "@/lib/constants/schedule";
import {
  calculateEndTime,
  getTimePeriod,
  formatTimeRange,
} from "@/lib/utils/time";
import { Edit } from "lucide-react";

interface WeeklyScheduleCalendarProps {
  daysOfWeek: Class["days_of_week"];
  durationMinutes: number;
  classData?: Class;
  readOnly?: boolean;
}

// Type definition for schedule map
type ScheduleTime = { time: string; startTime: string };
type PeriodScheduleMap = Map<string, ScheduleTime[]>;
type DayScheduleMap = Map<number, PeriodScheduleMap>;

const DayCard = memo(function DayCard({
  day,
  dayInfo,
  periodMap,
  hasClass,
  isSelected,
  onSelect,
  readOnly,
}: {
  day: number;
  dayInfo: { label: string; short: string };
  periodMap: PeriodScheduleMap;
  hasClass: boolean;
  isSelected: boolean;
  onSelect: (day: number) => void;
  readOnly: boolean;
}) {
  const handleClick = useCallback(() => {
    if (!readOnly) onSelect(day);
  }, [day, onSelect, readOnly]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readOnly) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(day);
      }
    },
    [day, onSelect, readOnly]
  );

  return (
    <Card
      key={day}
      onClick={handleClick}
      role={readOnly ? undefined : "button"}
      tabIndex={readOnly ? -1 : 0}
      aria-label={readOnly ? undefined : `Chỉnh sửa lịch học ${dayInfo.label}`}
      onKeyDown={readOnly ? undefined : handleKeyDown}
      className={`
        border p-3 text-center transition-all duration-200 
        w-full sm:w-auto ${readOnly ? "cursor-default" : "cursor-pointer"}
        ${
          hasClass
            ? "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/40 hover:shadow-md"
            : "bg-muted/30 hover:bg-muted/50 border-muted"
        }
        ${!readOnly && isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
      `}
    >
      <div className="flex items-center justify-center gap-1 mb-2">
        <span className="text-sm font-bold text-muted-foreground">
          <span className="sm:hidden">{dayInfo.label}</span>
          <span className="hidden sm:inline">{dayInfo.short}</span>
        </span>
        {hasClass && !readOnly && (
          <Edit className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
      {hasClass ? (
        <div className="space-y-2">
          {TIME_PERIOD_ORDER.map((period) => {
            const periodTimes = periodMap.get(period);
            if (!periodTimes || periodTimes.length === 0) return null;
            return (
              <div key={period} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {period}
                </div>
                {periodTimes.map((item: ScheduleTime, idx: number) => (
                  <Badge
                    key={`${item.startTime}-${idx}`}
                    variant="default"
                    className="text-xs w-full justify-center py-1 leading-tight font-normal"
                  >
                    {item.time}
                  </Badge>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground/60 py-2">
          Chưa có lịch
        </div>
      )}
    </Card>
  );
});

export function WeeklyScheduleCalendar({
  daysOfWeek,
  durationMinutes,
  classData,
  readOnly = false,
}: WeeklyScheduleCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const handleSelectDay = useCallback(
    (day: number) => {
      if (readOnly) return;
      setSelectedDay((prev) => (prev === day ? null : day));
    },
    [readOnly]
  );

  // Memoize schedule map calculation to avoid recalculation on every render
  const scheduleDays = useMemo(
    () =>
      toArray<{
        day: number;
        start_time: string;
        end_time?: string;
      }>(daysOfWeek),
    [daysOfWeek]
  );

  const scheduleMap = useMemo<DayScheduleMap>(() => {
    const map: DayScheduleMap = new Map();

    scheduleDays.forEach((item) => {
      if (!map.has(item.day)) {
        map.set(item.day, new Map());
      }
      const dayMap = map.get(item.day)!;
      const period = getTimePeriod(item.start_time);

      if (!dayMap.has(period)) {
        dayMap.set(period, []);
      }

      // Nếu đã có end_time trong DB thì dùng, nếu không thì tính từ duration_minutes
      const endTime =
        item.end_time || calculateEndTime(item.start_time, durationMinutes);
      const timeRange = formatTimeRange(item.start_time, endTime);
      dayMap.get(period)!.push({
        time: timeRange,
        startTime: item.start_time,
      });
    });

    // Sort times by start time within each period for each day
    map.forEach((dayMap) => {
      dayMap.forEach((times) => {
        times.sort((a, b) => a.startTime.localeCompare(b.startTime));
      });
    });

    return map;
  }, [durationMinutes, scheduleDays]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-7 w-full">
      {DAY_ORDER.map((dayNum) => {
        const dayInfo = DAYS_MAP[dayNum];
        const day = Number(dayNum);
        const dayMap =
          scheduleMap.get(day) || new Map<string, ScheduleTime[]>();
        const hasClass = dayMap.size > 0;

        return (
          <DayCard
            key={day}
            day={day}
            dayInfo={dayInfo}
            periodMap={dayMap}
            hasClass={hasClass}
            isSelected={selectedDay === day}
            onSelect={handleSelectDay}
            readOnly={readOnly}
          />
        );
      })}
      {!readOnly && selectedDay !== null && classData && (
        <EditDayScheduleForm
          classData={classData}
          day={selectedDay}
          open={selectedDay !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedDay(null);
          }}
        />
      )}
    </div>
  );
}
