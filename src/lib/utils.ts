import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyVN(value: number) {
  try {
    return value.toLocaleString("vi-VN") + "đ";
  } catch {
    return String(value);
  }
}

// Compact currency for axes ticks: 1.2k, 3.4M (vi-VN friendly)
export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}k`;
  }
  return `${value}`;
}

// Generic safe array parser (accepts array or JSON stringified array)
export function toArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Format days_of_week like: T2 08:00, T5 08:00
export function formatScheduleDays(days: unknown): string {
  const map: Record<number, string> = {
    0: "CN",
    1: "T2",
    2: "T3",
    3: "T4",
    4: "T5",
    5: "T6",
    6: "T7",
    7: "T7",
  } as Record<number, string>;
  const arr = toArray<{ day: number; start_time: string }>(days);
  if (arr.length === 0) return "-";
  return arr.map((d) => `${map[d.day] || d.day} ${d.start_time}`).join(", ");
}

// Format date range like: 15/01/2024 → 15/06/2024
export function formatDateRange(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startDate} → ${endDate}`;
    }

    const formatDate = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return `${formatDate(start)} → ${formatDate(end)}`;
  } catch {
    return `${startDate} → ${endDate}`;
  }
}

// Format enrollment status: "active" -> "Đang học", "trial" -> "Thử học", "inactive" -> "Ngừng học"
export function formatEnrollmentStatus(
  status: "active" | "trial" | "inactive" | string
): string {
  const map: Record<string, string> = {
    active: "Đang học",
    trial: "Thử học",
    inactive: "Ngừng học",
  };
  return map[status] || status;
}

// Convenience alias
export const formatVND = formatCurrencyVN;
