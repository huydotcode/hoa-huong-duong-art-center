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

interface RawStudentRow {
  "Họ Tên": string;
  SĐT: string;
  Môn: string;
  "Đóng học phí": string;
}

function normalizeName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 0) return null;
  return cleaned;
}

async function main() {
  const filePath = path.join(process.cwd(), "excel", "data_v1.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error("File not found");
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawStudentRow>(sheet);

  console.log(`Processing ${rows.length} rows for Payment Import...`);

  // 1. Fetch Class Map (Normalized -> ID)
  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, name, monthly_fee");
  if (classError || !classes) throw new Error("Could not load classes");

  const classMap = new Map<string, { id: string; fee: number }>();
  classes.forEach((c) =>
    classMap.set(normalizeName(c.name), {
      id: c.id,
      fee: Number(c.monthly_fee) || 0,
    })
  );

  // 2. Fetch Student Map (Phone -> ID, Name -> ID)
  const { data: students, error: stError } = await supabase
    .from("students")
    .select("id, full_name, phone");
  if (stError || !students) throw new Error("Could not load students");

  const phoneMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  students.forEach((s) => {
    if (s.phone) phoneMap.set(s.phone, s.id);
    nameMap.set(normalizeName(s.full_name), s.id);
  });

  let paidCount = 0;

  for (const row of rows) {
    const statusRaw = String(row["Đóng học phí"] || "")
      .trim()
      .toLowerCase();

    // Only process "Đã đóng" (or "đã đóng", "đóng")
    if (!statusRaw.includes("đã đóng") && !statusRaw.includes("đóng")) {
      continue;
    }

    const rawName = row["Họ Tên"];
    const rawPhone = row["SĐT"];
    const rawClass = row["Môn"];

    if (!rawName && !rawPhone) continue;

    // Resolve IDs
    const normClass = normalizeName(rawClass);
    const classData = classMap.get(normClass);
    if (!classData) {
      console.warn(`Class not found for payment: ${rawClass}`);
      continue;
    }

    const normPhone = normalizePhone(rawPhone);
    const normName = normalizeName(rawName);
    let studentId: string | undefined;

    if (normPhone && phoneMap.has(normPhone)) {
      studentId = phoneMap.get(normPhone);
    } else if (nameMap.has(normName)) {
      studentId = nameMap.get(normName);
    }

    if (!studentId) {
      console.warn(`Student not found for payment: ${rawName}`);
      continue;
    }

    // Insert Payment Status
    // Month: 1, Year: 2026
    // is_paid: true
    // amount: ? Default to 0? Or do we have a fee?
    // User said "create record fees based on class and student".
    // Table `payment_status` has `amount` column.
    // We set monthly_fee to 0 in previous step for *all* classes.
    // So amount is 0? Or should we look up the class fee?
    // Since we set class fee to 0, if we look it up, it is 0.
    // I will set amount to 0 or null? Let's check schema. `amount numeric`.
    // Let's set it to 0 as that's consistent with "default fees to 0".

    // Preventing Dupes? Schema has UNIQUE INDEX on (student, class, month, year).
    // Upsert is best.

    const { error: upsertError } = await supabase.from("payment_status").upsert(
      {
        student_id: studentId,
        class_id: classData.id,
        month: 1,
        year: 2026,
        is_paid: true,
        paid_at: new Date().toISOString(),
        amount: classData.fee,
      },
      {
        onConflict: "student_id, class_id, month, year",
      }
    );

    if (upsertError) {
      console.error(
        `Error inserting payment for ${rawName}:`,
        upsertError.message
      );
    } else {
      paidCount++;
    }
  }

  console.log(
    `Payment Import Complete. Created/Updated ${paidCount} payment records.`
  );
}

main().catch(console.error);
