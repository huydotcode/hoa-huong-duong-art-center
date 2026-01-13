import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import * as XLSX from "xlsx";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Types ---
interface RawStudentRow {
  STT: any;
  "Họ Tên": string;
  SĐT: string;
  Môn: string;
  "Thời gian": string;
  Thứ: string;
  "Đóng học phí": string;
  "Ghi chú học thử": string | number;
}

interface StudentRecord {
  id?: string;
  full_name: string;
  phone: string | null;
}

// --- Helpers from import-students.ts logic ---

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 0) return null;

  // Simple validation: must be at least 9-10 digits?
  // Logic just says "remove separators" in import-students.ts, but `validateStudentRow` checks for 10 digits/starts with 0.
  // For migration, we might want to be permissive or fix?
  // Let's just clean it.
  return cleaned;
}

function normalizeName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Parse enrollment status
 */
function parseEnrollmentStatus(
  paymentStatus?: string,
  trialNote?: string | number
): "trial" | "active" | "inactive" {
  const pStr = String(paymentStatus || "")
    .trim()
    .toLowerCase();
  const tStr = String(trialNote || "").trim();

  if (!pStr) {
    if (tStr.length > 0) return "trial";
    return "trial";
  }

  if (
    pStr.includes("nghỉ") ||
    pStr.includes("ngừng") ||
    pStr.includes("ngưng")
  ) {
    return "inactive";
  }
  if (pStr.includes("đã đóng") || pStr.includes("đóng")) {
    return "active";
  }

  if (tStr.length > 0) return "trial";

  return "trial"; // Default
}

/**
 * Parse Excel Serial Date
 */
function convertExcelSerialToDate(serial: number): string | null {
  try {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + (serial - 1) * 86400000);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  } catch {
    return null;
  }
}

function parseEnrollmentDate(trialNote?: string | number): string {
  if (!trialNote) return new Date().toISOString().split("T")[0];

  // If number
  if (typeof trialNote === "number") {
    const d = convertExcelSerialToDate(trialNote);
    if (d) return d;
  }

  const tStr = String(trialNote).trim();

  // "05/10" -> year-10-05
  const match = tStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = new Date().getFullYear(); // Assume current year per logic
    // But if we are importing historical data? Maybe 2024?
    // Logic says "new Date().getFullYear()".
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return new Date().toISOString().split("T")[0];
}

// --- Main ---

async function main() {
  const filePath = path.join(process.cwd(), "excel", "data_v1.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error("File not found");
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawStudentRow>(sheet);

  console.log(`Processing ${rows.length} rows...`);

  // 1. Load Classes
  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, name");

  if (classError || !classes) {
    console.error("Error loading classes:", classError?.message);
    return;
  }

  // Map Normalized Name -> Class ID
  const classMap = new Map<string, string>();
  classes.forEach((c) => {
    classMap.set(normalizeName(c.name), c.id);
  });

  // 2. Load Existing Students (to avoid duplicates if re-running or logic check)
  // Actually, we can just UPSERT based on phone?
  // "students" table has ID. full_name, phone.
  // If we use phone as unique key? The table schema DOES NOT enforce unique phone.
  // But logically, we should check.

  // Let's cache existing students
  const { data: studentsDB, error: stError } = await supabase
    .from("students")
    .select("id, full_name, phone");

  if (stError) throw stError;

  const phoneMap = new Map<string, string>(); // Phone -> ID
  const nameMap = new Map<string, string>(); // NormName -> ID (fallback)

  studentsDB?.forEach((s) => {
    if (s.phone) phoneMap.set(s.phone, s.id);
    nameMap.set(normalizeName(s.full_name), s.id);
  });

  let newStudentsCount = 0;
  let enrollmentsCount = 0;

  // 3. Process Rows
  for (const row of rows) {
    const rawName = row["Họ Tên"];
    const rawPhone = row["SĐT"];
    const rawClass = row["Môn"];

    if (!rawName && !rawPhone) continue;

    const normName = normalizeName(rawName);
    const normPhone = normalizePhone(rawPhone);

    // Find Class
    const normClass = normalizeName(rawClass);
    const classId = classMap.get(normClass);

    if (!classId) {
      console.warn(`Class not found for: "${rawClass}" (Student: ${rawName})`);
      continue;
    }

    // Find/Create Student
    let studentId: string | undefined;

    if (normPhone && phoneMap.has(normPhone)) {
      studentId = phoneMap.get(normPhone);
    } else if (nameMap.has(normName)) {
      // Only match by name if phone is missing?
      // Or prioritize phone match?
      // If phone exists in row but DIFFERENT from DB?
      // "If phone is missing, match by full_name. If phone exists, match by phone."
      if (!normPhone) {
        studentId = nameMap.get(normName);
      }
    }

    if (!studentId) {
      // Create New
      const { data: newSt, error: createError } = await supabase
        .from("students")
        .insert({
          full_name: rawName || "Unknown",
          phone: normPhone || null,
          is_active: true,
        })
        .select("id")
        .single();

      if (createError) {
        console.error(
          `Error creating student ${rawName}:`,
          createError.message
        );
        continue;
      }
      studentId = newSt.id;

      // Update Maps
      if (normPhone) phoneMap.set(normPhone, studentId);
      nameMap.set(normName, studentId);
      newStudentsCount++;
    }

    // Create Enrollment
    const status = parseEnrollmentStatus(
      row["Đóng học phí"],
      row["Ghi chú học thử"]
    );
    const enrollDate = parseEnrollmentDate(row["Ghi chú học thử"]);

    // Check existing enrollment to prevent dupes (if running multiple times)?
    // Table `student_class_enrollments` doesn't have unique constraint on (student, class).
    // BUT logic implies one active status?
    // Let's just Insert.
    // Wait, if we re-run, we might duplicate.
    // Let's check uniqueness via SELECT or use upsert?
    // Table has id (PK).
    // Let's check first.

    const { data: existEnroll } = await supabase
      .from("student_class_enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .limit(1);

    if (existEnroll && existEnroll.length > 0) {
      // Already enrolled
      continue;
    }

    const { error: enrollError } = await supabase
      .from("student_class_enrollments")
      .insert({
        student_id: studentId,
        class_id: classId,
        status: status,
        enrollment_date: enrollDate,
        // leave_date? Only if inactive?
        // Logic currently keeps leave_date null unless specified.
        // But logic above says: "If status is 'inactive'..."
        // Schema: leave_date date.
        leave_date: status === "inactive" ? enrollDate : null, // Assuming leave same day or we don't know
      });

    if (enrollError) {
      console.error(`Error enrolling ${rawName}:`, enrollError.message);
    } else {
      enrollmentsCount++;
    }
  }

  console.log(`Migration Complete.`);
  console.log(`New Students Created: ${newStudentsCount}`);
  console.log(`Enrollments Created: ${enrollmentsCount}`);
}

main().catch(console.error);
