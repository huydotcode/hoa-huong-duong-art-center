import * as XLSX from "xlsx";
import { normalizePhone } from "@/lib/utils";

export interface StudentRow {
  full_name: string;
  phone: string;
  rowIndex: number; // Dòng trong Excel (1-indexed, tính cả header)
}

export interface StudentRowWithStatus extends StudentRow {
  isValid: boolean;
  errors: string[];
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

          // Map columns - assume first column is name, second is phone
          const full_name = String(row[0] || "").trim();
          const phone = String(row[1] || "").trim();

          if (!full_name && !phone) continue; // Skip completely empty rows

          rows.push({
            full_name,
            phone: normalizePhone(phone), // Remove separators
            rowIndex: i + 1, // 1-indexed, +1 for header
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
