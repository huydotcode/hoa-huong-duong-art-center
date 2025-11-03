/**
 * Constants for schedule-related functionality
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DayInfo {
  label: string;
  short: string;
}

/**
 * Map of day numbers to Vietnamese day labels
 * 0 = Chủ nhật (Sunday), 1-6 = Thứ 2-7 (Monday-Saturday)
 */
export const DAYS_MAP: Record<DayOfWeek, DayInfo> = {
  0: { label: "Chủ nhật", short: "CN" },
  1: { label: "Thứ 2", short: "T2" },
  2: { label: "Thứ 3", short: "T3" },
  3: { label: "Thứ 4", short: "T4" },
  4: { label: "Thứ 5", short: "T5" },
  5: { label: "Thứ 6", short: "T6" },
  6: { label: "Thứ 7", short: "T7" },
};

/**
 * Order of days starting from Monday (T2) instead of Sunday (CN)
 */
export const DAY_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]; // T2, T3, T4, T5, T6, T7, CN

/**
 * Order of time periods
 */
export const TIME_PERIOD_ORDER = ["Sáng", "Chiều", "Tối"] as const;

export type TimePeriod = (typeof TIME_PERIOD_ORDER)[number];
