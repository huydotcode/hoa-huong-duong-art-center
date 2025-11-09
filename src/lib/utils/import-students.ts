import * as XLSX from "xlsx";
import { normalizePhone } from "@/lib/utils";

export interface StudentRow {
  full_name: string;
  phone: string;
  rowIndex: number; // Dòng trong Excel (1-indexed, tính cả header)
  // Thông tin lớp từ Excel
  subject?: string; // Môn: "Piano", "Guitar", etc.
  time_slot?: string; // Thời gian: "18h-19h", "17h30-18h30"
  days?: string; // Thứ: "Thứ 7 - CN", "Thứ 2 -4"
  payment_status?: string; // "Nghỉ Luôn", "Đã đóng"
  trial_note?: string; // "CN", "05/10", etc.
}

export interface StudentRowWithStatus extends StudentRow {
  isValid: boolean;
  errors: string[];
  // Sau khi import học sinh
  studentId?: string; // ID học sinh đã tạo
}

export interface ImportResult {
  success: number;
  errors: Array<{
    row: number;
    errors: string[];
  }>;
  skipped: number;
}

/**
 * Parse days string from Excel format like "Thứ 7 - CN" → [6, 0]
 */
export function parseDaysString(daysStr: string): number[] {
  const days: number[] = [];
  const normalized = daysStr.trim();

  // Map Vietnamese day names to day numbers
  // 0 = Chủ nhật (Sunday), 1-6 = Thứ 2-7 (Monday-Saturday)
  const dayMap: Record<string, number> = {
    "chủ nhật": 0,
    cn: 0,
    "thứ 2": 1,
    t2: 1,
    "thứ 3": 2,
    t3: 2,
    "thứ 4": 3,
    t4: 3,
    "thứ 5": 4,
    t5: 4,
    "thứ 6": 5,
    t6: 5,
    "thứ 7": 6,
    t7: 6,
  };

  // Split by " - " or "," or "-"
  const parts = normalized
    .split(/[-,]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);

  for (const part of parts) {
    for (const [key, value] of Object.entries(dayMap)) {
      if (part.includes(key)) {
        days.push(value);
        break;
      }
    }
  }

  return [...new Set(days)].sort((a, b) => a - b);
}

/**
 * Parse time slot from Excel format like "18h-19h" → { start_time: "18:00", end_time: "19:00", duration_minutes: 60 }
 */
export function parseTimeSlot(timeStr: string): {
  start_time: string;
  end_time: string;
  duration_minutes: number;
} | null {
  const normalized = timeStr.trim().replace(/\s+/g, "");

  // Match patterns like "18h-19h", "17h30-18h30", "9h-10h", "17h30-18h30"
  const match = normalized.match(/(\d+)h(\d*)\s*-\s*(\d+)h(\d*)/);
  if (!match) return null;

  const startHour = parseInt(match[1], 10);
  const startMin = match[2] ? parseInt(match[2], 10) : 0;
  const endHour = parseInt(match[3], 10);
  const endMin = match[4] ? parseInt(match[4], 10) : 0;

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const duration = endMinutes - startMinutes;

  if (duration <= 0) return null;

  return {
    start_time: `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`,
    end_time: `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`,
    duration_minutes: duration,
  };
}

/**
 * Parse payment status → enrollment status
 */
export function parseEnrollmentStatus(
  paymentStatus?: string,
  trialNote?: string
): "trial" | "active" | "inactive" {
  if (!paymentStatus) {
    // Nếu có ghi chú học thử → trial
    if (trialNote && trialNote.trim().length > 0) {
      return "trial";
    }
    return "trial";
  }

  const normalized = paymentStatus.trim().toLowerCase();
  if (normalized.includes("nghỉ") || normalized.includes("ngừng")) {
    return "inactive";
  }
  if (normalized.includes("đã đóng") || normalized.includes("đóng")) {
    return "active";
  }
  // Nếu có ghi chú học thử → trial
  if (trialNote && trialNote.trim().length > 0) {
    return "trial";
  }
  return "trial";
}

/**
 * Parse enrollment date from trial_note (ví dụ: "05/10" → "2024-10-05")
 * Returns today's date if no valid date found
 */
export function parseEnrollmentDate(trialNote?: string): string {
  if (!trialNote) {
    return new Date().toISOString().split("T")[0];
  }

  // Try to parse "05/10" → "2024-10-05" (assuming current year)
  const dateMatch = trialNote.match(/(\d{1,2})\/(\d{1,2})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const year = new Date().getFullYear();

    // Validate day and month
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      try {
        const date = new Date(year, month - 1, day);
        if (
          !isNaN(date.getTime()) &&
          date.getDate() === day &&
          date.getMonth() === month - 1
        ) {
          return date.toISOString().split("T")[0];
        }
      } catch {
        // Invalid date, use today
      }
    }
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * Parse Excel file to StudentRow array
 */
export async function parseExcelFile(file: File): Promise<StudentRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header row (index 0)
        const rows: StudentRow[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[];
          if (!row || row.length === 0) continue; // Skip empty rows

          // Map columns based on Excel format:
          // Column 0: STT (ignore)
          // Column 1: Họ Tên
          // Column 2: SĐT
          // Column 3: Môn
          // Column 4: Thời gian
          // Column 5: Thứ
          // Column 6: Đóng học phí
          // Column 7: Ghi chú học thử
          const stt = String(row[0] || "").trim(); // Column 0: STT (ignore)
          const full_name = String(row[1] || "").trim(); // Column 1: Họ Tên
          const phone = String(row[2] || "").trim(); // Column 2: SĐT
          const subject = String(row[3] || "").trim(); // Column 3: Môn
          const time_slot = String(row[4] || "").trim(); // Column 4: Thời gian
          const days = String(row[5] || "").trim(); // Column 5: Thứ
          const payment_status = String(row[6] || "").trim(); // Column 6: Đóng học phí
          const trial_note = String(row[7] || "").trim(); // Column 7: Ghi chú học thử

          if (!full_name && !phone) continue; // Skip completely empty rows

          rows.push({
            full_name,
            phone: normalizePhone(phone), // Remove separators
            rowIndex: i + 1, // 1-indexed, +1 for header
            subject: subject || undefined,
            time_slot: time_slot || undefined,
            days: days || undefined,
            payment_status: payment_status || undefined,
            trial_note: trial_note || undefined,
          });
        }

        resolve(rows);
      } catch (error) {
        reject(
          new Error(
            "Không thể đọc file Excel: " +
              (error instanceof Error ? error.message : String(error))
          )
        );
      }
    };

    reader.onerror = () => reject(new Error("Không thể đọc file"));
    reader.readAsBinaryString(file);
  });
}

/**
 * Validate a single student row
 */
export function validateStudentRow(row: StudentRow): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate full_name
  if (!row.full_name || row.full_name.trim().length === 0) {
    errors.push("Họ và tên không được để trống");
  }

  // Validate phone - normalize again to ensure no spaces or special characters
  // Phone is optional - only validate if provided
  const normalizedPhone = normalizePhone(row.phone);

  if (normalizedPhone && normalizedPhone.length > 0) {
    // Only validate phone format if it's provided
    if (normalizedPhone.length !== 10) {
      errors.push("Số điện thoại phải có 10 số");
    } else if (!normalizedPhone.startsWith("0")) {
      errors.push("Số điện thoại phải bắt đầu bằng 0");
    } else if (!/^\d+$/.test(normalizedPhone)) {
      errors.push("Số điện thoại chỉ được chứa số");
    }
  }
  // If phone is empty, that's okay - it will be stored as null
  // Duplicate phones are allowed

  return {
    valid: errors.length === 0,
    errors,
  };
}
