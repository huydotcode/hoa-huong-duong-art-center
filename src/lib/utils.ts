import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DAYS_MAP, type DayOfWeek } from "@/lib/constants/schedule";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentSessionLabel(now = new Date()): string {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
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
  const arr = toArray<{ day: number; start_time: string }>(days);
  if (arr.length === 0) return "-";
  return arr
    .map((d) => {
      const dayInfo = DAYS_MAP[d.day as DayOfWeek];
      return dayInfo
        ? `${dayInfo.short} ${d.start_time}`
        : `${d.day} ${d.start_time}`;
    })
    .join(", ");
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

// Format enrollment status: "active" -> "Đang học", "trial" -> "Học thử", "inactive" -> "Ngừng học"
export function formatEnrollmentStatus(
  status: "active" | "trial" | "inactive" | string
): string {
  const map: Record<string, string> = {
    active: "Đang học",
    trial: "Học thử",
    inactive: "Ngừng học",
  };
  return map[status] || status;
}

// Format duration from minutes to hours: 90 -> "1.5 giờ", 120 -> "2 giờ"
export function formatDurationHours(minutes: number): string {
  if (minutes <= 0) return "0 giờ";
  const hours = minutes / 60;
  // If it's a whole number, show as integer, otherwise show one decimal
  if (hours % 1 === 0) {
    return `${hours} giờ`;
  }
  return `${hours.toFixed(1)} giờ`;
}

// Format currency with dots: 1500000 -> "1.500.000vnđ"
export function formatCurrencyVNDots(value: number): string {
  try {
    return value
      .toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\s/g, "");
  } catch {
    return String(value) + "vnđ";
  }
}

// Convenience alias
export const formatVND = formatCurrencyVN;

// Normalize Vietnamese text: remove diacritics, handle đ/Đ, normalize spaces, and convert to lowercase
// Example: "Diệu" -> "dieu", "Nguyễn" -> "nguyen", "Đặng" -> "dang"
export function normalizeText(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .replace(/đ/g, "d") // Replace đ with d
    .replace(/Đ/g, "d") // Replace Đ with d
    .normalize("NFD") // Decompose characters (á -> a + ́)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/\s+/g, " ") // Normalize multiple spaces to single space
    .trim() // Remove leading/trailing spaces
    .toLowerCase();
}

// Normalize phone number: remove all spaces, dashes, dots, and other non-digit characters
// Example: "033 499 3813" -> "0334993813", "0123-456-789" -> "0123456789", "0123.456.789" -> "0123456789"
export function normalizePhone(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  // First, remove all whitespace characters (spaces, tabs, newlines, non-breaking spaces, etc.)
  // Then remove all non-digit characters (dashes, dots, parentheses, etc.)
  return value
    .replace(/\s+/g, "") // Remove all whitespace characters (more comprehensive than [\s])
    .replace(/[^\d]/g, "") // Remove all non-digit characters (defensive approach)
    .trim();
}

/**
 * Check if student was created in the current month
 * @param createdAt ISO date string from database
 * @returns true if student was created in the current month
 */
export function isNewStudent(createdAt: string): boolean {
  if (!createdAt) return false;

  try {
    const createdDate = new Date(createdAt);
    const now = new Date();

    // Compare year and month (ignore time and day)
    return (
      createdDate.getFullYear() === now.getFullYear() &&
      createdDate.getMonth() === now.getMonth()
    );
  } catch {
    return false;
  }
}
