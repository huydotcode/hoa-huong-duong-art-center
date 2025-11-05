"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";

export function AttendanceDateToolbarClient(props: {
  basePath: string;
  date: string;
}) {
  const { basePath, date } = props;
  const router = useRouter();
  const sp = useSearchParams();

  const apply = (next: { date?: string }) => {
    const q = new URLSearchParams(sp?.toString() || "");
    if (next.date !== undefined) q.set("date", next.date);
    // Remove session param if any, since page shows all sessions
    q.delete("session");
    router.push(`${basePath}?${q.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="hidden md:inline-block text-xs text-muted-foreground">
        Ngày
      </span>
      <DatePicker
        contentClassName="w-full sm:w-auto"
        triggerClassName="w-full sm:w-auto"
        value={date}
        onChange={(v) => apply({ date: v })}
        quickPreset="yd"
      />
    </div>
  );
}
