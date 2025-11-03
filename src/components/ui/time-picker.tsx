"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * TimePicker component with 24-hour format
 * Displays two dropdowns for hour (0-23) and minute (0-59) selection
 */
export function TimePicker({ value, onChange }: TimePickerProps) {
  // Parse time string "HH:MM" to hours and minutes
  const [hours, minutes] = value ? value.split(":").map(Number) : [null, null];

  const handleHourChange = (hour: string) => {
    const newMinutes = minutes !== null ? minutes : 0;
    onChange(
      `${hour.padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`
    );
  };

  const handleMinuteChange = (minute: string) => {
    const newHours = hours !== null ? hours : 0;
    onChange(
      `${newHours.toString().padStart(2, "0")}:${minute.padStart(2, "0")}`
    );
  };

  // Generate options for hours (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  // Generate options for minutes (0-59, step 1)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="flex gap-1 sm:gap-2">
      <Select
        value={hours !== null ? hours.toString().padStart(2, "0") : undefined}
        onValueChange={handleHourChange}
      >
        <SelectTrigger className="flex-1 text-sm sm:text-base">
          <SelectValue placeholder="Giờ" />
        </SelectTrigger>
        <SelectContent>
          {hourOptions.map((hour) => (
            <SelectItem key={hour} value={hour.toString().padStart(2, "0")}>
              {hour.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="flex items-center text-muted-foreground shrink-0">
        :
      </span>
      <Select
        value={
          minutes !== null ? minutes.toString().padStart(2, "0") : undefined
        }
        onValueChange={handleMinuteChange}
      >
        <SelectTrigger className="flex-1 text-sm sm:text-base">
          <SelectValue placeholder="Phút" />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map((minute) => (
            <SelectItem key={minute} value={minute.toString().padStart(2, "0")}>
              {minute.toString().padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
