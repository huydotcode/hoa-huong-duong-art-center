"use client";

import * as React from "react";
import { format, startOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  quickPreset?: "month" | "yd"; // month: current + next 2 months (default), yd: yesterday/today
  contentClassName?: string;
  triggerClassName?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày",
  disabled = false,
  contentClassName = "w-full sm:w-auto",
  triggerClassName = "w-full sm:w-auto",
  quickPreset = "month",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date | undefined>(undefined);
  const date = value ? new Date(value) : undefined;

  // Reset month when popover opens or value changes
  React.useEffect(() => {
    if (open) {
      if (value) {
        const dateFromValue = new Date(value);
        setMonth(dateFromValue);
      } else {
        setMonth(new Date());
      }
    }
  }, [open, value]);

  const handleQuickSelect = (selectedDate: Date, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetDate = selectedDate;
    const year = targetDate.getFullYear();
    const monthNum = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${monthNum}-${day}`;

    // Set month so calendar shows the correct month
    setMonth(startOfMonth(targetDate));
    onChange?.(formattedDate);
    setOpen(false); // Close popover after selection
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            triggerClassName,
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "dd/MM/yyyy", { locale: vi })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto p-0", contentClassName)}
        align="start"
      >
        <div className="p-3 border-b">
          <div className="text-xs text-muted-foreground mb-2">Chọn nhanh:</div>
          <div className="flex flex-wrap gap-2">
            {quickPreset === "month" &&
              (() => {
                const today = new Date();
                const months: Date[] = [];
                for (let i = 0; i < 3; i++) {
                  months.push(
                    new Date(today.getFullYear(), today.getMonth() + i, 1)
                  );
                }
                return months.map((monthDate, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={(e) =>
                      handleQuickSelect(startOfMonth(monthDate), e)
                    }
                  >
                    {format(monthDate, "MM/yyyy", { locale: vi })}
                  </Button>
                ));
              })()}
            {quickPreset === "yd" &&
              (() => {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                return (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={(e) => handleQuickSelect(yesterday, e)}
                    >
                      Hôm qua
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={(e) => handleQuickSelect(today, e)}
                    >
                      Hôm nay
                    </Button>
                  </>
                );
              })()}
          </div>
        </div>
        <Calendar
          mode="single"
          selected={date}
          month={month}
          onMonthChange={setMonth}
          onSelect={(selectedDate) => {
            if (selectedDate && onChange) {
              // Format as YYYY-MM-DD
              const year = selectedDate.getFullYear();
              const monthNum = String(selectedDate.getMonth() + 1).padStart(
                2,
                "0"
              );
              const day = String(selectedDate.getDate()).padStart(2, "0");
              onChange(`${year}-${monthNum}-${day}`);
              setOpen(false); // Close popover after selection
            }
          }}
          locale={vi}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
