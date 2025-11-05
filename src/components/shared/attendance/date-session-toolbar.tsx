"use client";

import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DateSessionToolbar(props: {
  date: string;
  onDateChange: (date: string) => void;
  sessions: string[]; // list HH:MM
  session: string;
  onSessionChange: (session: string) => void;
  quickPreset?: "month" | "yd";
}) {
  const {
    date,
    onDateChange,
    sessions,
    session,
    onSessionChange,
    quickPreset,
  } = props;
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="hidden md:inline-block text-xs text-muted-foreground">
            Ngày
          </span>
          <DatePicker
            contentClassName="w-full sm:w-auto"
            triggerClassName="w-full sm:w-auto"
            value={date}
            onChange={onDateChange}
            quickPreset={quickPreset}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="hidden md:inline-block text-xs text-muted-foreground">
            Ca
          </span>
          <Select value={session} onValueChange={onSessionChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Chọn ca" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
