"use client";

import { useState } from "react";
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

interface WeeklyScheduleCalendarProps {
  daysOfWeek: Class["days_of_week"];
  durationMinutes: number;
  classData: Class;
}

export function WeeklyScheduleCalendar({
  daysOfWeek,
  durationMinutes,
  classData,
}: WeeklyScheduleCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const scheduleDays = toArray<{
    day: number;
    start_time: string;
    end_time?: string;
  }>(daysOfWeek);

  // Create a map grouped by day and time period (Sáng, Trưa, Chiều)
  const scheduleMap = new Map<
    number,
    Map<string, Array<{ time: string; startTime: string }>>
  >();
  scheduleDays.forEach((item) => {
    if (!scheduleMap.has(item.day)) {
      scheduleMap.set(item.day, new Map());
    }
    const dayMap = scheduleMap.get(item.day)!;
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
  scheduleMap.forEach((dayMap) => {
    dayMap.forEach((times) => {
      times.sort((a, b) => {
        return a.startTime.localeCompare(b.startTime);
      });
    });
  });

  return (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:overflow-x-auto sm:mx-auto">
      {DAY_ORDER.map((dayNum) => {
        const dayInfo = DAYS_MAP[dayNum];
        const day = Number(dayNum);
        const dayMap = scheduleMap.get(day) || new Map();
        const hasClass = dayMap.size > 0;

        return (
          <Card
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`border p-2 text-center transition-colors w-full sm:w-[160px] sm:shrink-0 cursor-pointer ${
              hasClass
                ? "bg-primary/10 border-primary/20 hover:bg-primary/15"
                : "bg-muted/30 hover:bg-muted/50"
            }`}
          >
            <div className="text-md font-bold text-muted-foreground mb-2">
              <span className="sm:hidden">{dayInfo.label}</span>
              <span className="hidden sm:inline">{dayInfo.short}</span>
            </div>
            {hasClass ? (
              <div className="space-y-2">
                {TIME_PERIOD_ORDER.map((period) => {
                  const periodTimes = dayMap.get(period);
                  if (!periodTimes || periodTimes.length === 0) return null;
                  return (
                    <div key={period} className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        {period}
                      </div>
                      {periodTimes.map(
                        (
                          item: { time: string; startTime: string },
                          idx: number
                        ) => (
                          <Badge
                            key={idx}
                            variant="default"
                            className="text-sm w-full justify-center py-0.5 leading-tight"
                          >
                            {item.time}
                          </Badge>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/50">-</div>
            )}
          </Card>
        );
      })}
      {selectedDay !== null && (
        <EditDayScheduleForm
          classData={classData}
          day={selectedDay!}
          open={selectedDay !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedDay(null);
          }}
        />
      )}
    </div>
  );
}
