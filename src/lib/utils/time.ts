/**
 * Utility functions for time-related operations
 */

/**
 * Calculate end time from start time and duration in minutes
 * @param startTime - Start time in HH:MM format (e.g., "08:00")
 * @param durationMinutes - Duration in minutes
 * @returns End time in HH:MM format (e.g., "09:00")
 */
export function calculateEndTime(
  startTime: string,
  durationMinutes: number
): string {
  try {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    startDate.setMinutes(startDate.getMinutes() + durationMinutes);
    const endHours = startDate.getHours().toString().padStart(2, "0");
    const endMinutes = startDate.getMinutes().toString().padStart(2, "0");
    return `${endHours}:${endMinutes}`;
  } catch {
    return "";
  }
}

/**
 * Get time period label (Sáng, Chiều, Tối) based on start time
 * @param startTime - Start time in HH:MM format (e.g., "08:00")
 * @returns Time period: "Sáng" (0-11h), "Chiều" (12-17h), or "Tối" (18-23h)
 */
export function getTimePeriod(startTime: string): "Sáng" | "Chiều" | "Tối" {
  try {
    const [hours] = startTime.split(":").map(Number);
    if (hours >= 0 && hours < 12) {
      return "Sáng";
    } else if (hours >= 12 && hours < 18) {
      return "Chiều";
    } else {
      return "Tối";
    }
  } catch {
    return "Sáng";
  }
}

/**
 * Format time range from start and end times
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format (optional)
 * @returns Formatted time range string (e.g., "08:00 - 09:00")
 */
export function formatTimeRange(startTime: string, endTime?: string): string {
  if (!endTime) return startTime;
  return `${startTime} - ${endTime}`;
}
