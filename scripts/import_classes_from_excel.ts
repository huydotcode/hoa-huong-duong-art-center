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

// Constants from src/lib/constants/subjects.ts
const SUBJECTS = [
  "Piano",
  "Trống",
  "Vẽ",
  "Múa",
  "Guitar",
  "Nhảy",
  "Ballet",
] as const;

const FEE_MAP: Record<string, number> = {
  Vẽ: 500000,
  Nhảy: 500000,
  Múa: 500000,
  Piano: 800000,
  Guitar: 600000,
  Trống: 1100000,
};

interface RawStudent {
  Môn: string;
  "Thời gian": string;
  Thứ: string;
  // Other fields exist but we focus on these
}

interface ClassSchedule {
  day: number;
  start_time: string;
  end_time: string;
}

interface ClassDefinition {
  name: string;
  subject: string | null;
  days_of_week: ClassSchedule[];
  duration_minutes: number;
  original_days: string;
  original_time: string;
}

function parseDayToken(token: string): number | null {
  const t = token.toLowerCase().trim();
  if (t.includes("cn") || t.includes("chúa nhật") || t.includes("chủ nhật"))
    return 0;
  const match = t.match(/\d/);
  if (match) {
    const d = parseInt(match[0]);
    if (d >= 2 && d <= 7) return d - 1;
  }
  return null;
}

function parseDays(dayStr: string): number[] {
  if (!dayStr) return [];
  const lower = String(dayStr)
    .toLowerCase()
    .trim()
    .replace(/thứ/g, "")
    .replace(/thú/g, "")
    .replace(/chúa nhật/g, "0")
    .replace(/chủ nhật/g, "0")
    .replace(/cn/g, "0");

  const days = new Set<number>();
  const parts = lower.split(/[^0-9]+/).filter((p) => p.length > 0);

  for (const p of parts) {
    const val = parseInt(p);
    if (!isNaN(val)) {
      if (val === 0) days.add(0);
      else if (val >= 2 && val <= 7) days.add(val - 1);
    }
  }
  return Array.from(days).sort();
}

function parseTimeRange(
  timeStr: string
): { duration: number; start: string; end: string } | null {
  if (!timeStr) return null;
  const cleaned = String(timeStr).toLowerCase().replace(/\s/g, "");
  const match = cleaned.match(/(\d+)h(\d*)-(\d+)h(\d*)/);

  if (match) {
    const h1 = parseInt(match[1]);
    const m1 = match[2] ? parseInt(match[2]) : 0;
    const h2 = parseInt(match[3]);
    const m2 = match[4] ? parseInt(match[4]) : 0;

    const startMin = h1 * 60 + m1;
    const endMin = h2 * 60 + m2;

    return {
      duration: endMin - startMin,
      start: `${h1.toString().padStart(2, "0")}:${m1.toString().padStart(2, "0")}`,
      end: `${h2.toString().padStart(2, "0")}:${m2.toString().padStart(2, "0")}`,
    };
  }
  return null;
}

function normalizeName(name: string): string {
  return String(name).trim().toLowerCase().replace(/\s+/g, " ");
}

function determineSubject(name: string): string | null {
  const norm = normalizeName(name);
  for (const sub of SUBJECTS) {
    if (norm.includes(sub.toLowerCase())) {
      return sub;
    }
  }
  return null; // Or default?
}

// Advanced Schedule Parsing
function parseValues(
  daysOriginal: string,
  timeOriginal: string
): ClassSchedule[] {
  const schedules: ClassSchedule[] = [];
  const timeOrigStr = String(timeOriginal || "");
  const daysOrigStr = String(daysOriginal || "");

  // Strategy 1: Explicit "Day: Time" mapping in time string
  const explicitRegex =
    /(thứ\s*\d|t\d|cn|chúa nhật|chủ nhật)\s*:?\s*(\d+h\d*-\d+h\d*)/gi;
  let explicitMatch;
  let foundExplicit = false;

  while ((explicitMatch = explicitRegex.exec(timeOrigStr)) !== null) {
    foundExplicit = true;
    const dayPart = explicitMatch[1];
    const timePart = explicitMatch[2];

    const day = parseDayToken(dayPart);
    const timeObj = parseTimeRange(timePart);

    if (day !== null && timeObj) {
      schedules.push({
        day: day,
        start_time: timeObj.start,
        end_time: timeObj.end,
      });
    }
  }

  if (foundExplicit) {
    return schedules;
  }

  // Strategy 2: Implicit mapping (Order based) or Broadcast
  const daysParsed = parseDays(daysOrigStr);

  const timeRanges: Array<{ start: string; end: string }> = [];
  const rangeRegex = /(\d+)h(\d*)-(\d+)h(\d*)/gi;
  let rangeMatch;
  while ((rangeMatch = rangeRegex.exec(timeOrigStr)) !== null) {
    const t = parseTimeRange(rangeMatch[0]);
    if (t) timeRanges.push(t);
  }

  if (timeRanges.length === 0) {
    return daysParsed.map((d) => ({
      day: d,
      start_time: "18:00",
      end_time: "19:30",
    }));
  }

  if (daysParsed.length > 0) {
    if (timeRanges.length > 1 && timeRanges.length === daysParsed.length) {
      // map 1-to-1
      daysParsed.forEach((d, idx) => {
        schedules.push({
          day: d,
          start_time: timeRanges[idx].start,
          end_time: timeRanges[idx].end,
        });
      });
    } else {
      // Apply all times to all days
      daysParsed.forEach((d) => {
        timeRanges.forEach((t) => {
          schedules.push({
            day: d,
            start_time: t.start,
            end_time: t.end,
          });
        });
      });
    }
  }

  return schedules;
}

async function main() {
  const filePath = path.join(process.cwd(), "excel", "data_v1.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  // Read Excel
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const students = XLSX.utils.sheet_to_json<RawStudent>(worksheet);

  console.log(`Read ${students.length} records from Excel.`);

  // Map by NORMALIZED Name
  const classMap = new Map<string, ClassDefinition>();

  for (const s of students) {
    if (!s.Môn || !s.Môn.trim()) continue;

    const rawSubject = s.Môn.trim();
    const normSubject = normalizeName(rawSubject);

    const time = s["Thời gian"] ? s["Thời gian"].trim() : "";
    const daysStr = s.Thứ ? s.Thứ.trim() : "";

    // Skip if basically empty
    if (!daysStr && !time) continue;

    // Determine Subject
    const subject = determineSubject(rawSubject);

    // Use new Logic
    const schedules = parseValues(daysStr, time);

    const duration =
      schedules.length > 0
        ? parseInt(schedules[0].end_time.split(":")[0]) * 60 +
          parseInt(schedules[0].end_time.split(":")[1]) -
          (parseInt(schedules[0].start_time.split(":")[0]) * 60 +
            parseInt(schedules[0].start_time.split(":")[1]))
        : 90;

    if (classMap.has(normSubject)) {
      const existing = classMap.get(normSubject)!;
      // Merge
      for (const newSched of schedules) {
        const exists = existing.days_of_week.some(
          (es) =>
            es.day === newSched.day && es.start_time === newSched.start_time
        );
        if (!exists) {
          existing.days_of_week.push(newSched);
        }
      }
    } else {
      classMap.set(normSubject, {
        name: rawSubject,
        subject: subject,
        days_of_week: schedules,
        duration_minutes: duration > 0 ? duration : 90,
        original_days: daysStr,
        original_time: time,
      });
    }
  }

  const uniqueClasses = Array.from(classMap.values());
  console.log(`Found ${uniqueClasses.length} unique classes.`);

  // Truncate
  console.log("Truncating 'classes' table...");
  const { error: deleteError } = await supabase
    .from("classes")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) console.error("Error truncating:", deleteError.message);

  // Insert
  for (const cls of uniqueClasses) {
    if (cls.days_of_week.length === 0) {
      console.warn(`Skipping ${cls.name} due to no schedule`);
      continue;
    }

    console.log(
      `Inserting: ${cls.name} [Subject: ${cls.subject}] (${cls.days_of_week.length} slots)`
    );

    const { error } = await supabase.from("classes").insert({
      name: cls.name,
      subject: cls.subject,
      days_of_week: cls.days_of_week,
      duration_minutes: cls.duration_minutes,
      monthly_fee: cls.subject ? FEE_MAP[cls.subject] || 0 : 0,
      salary_per_session: 0,
      start_date: new Date().toISOString(),
      end_date: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      ).toISOString(),
      max_student_count: 20,
    });

    if (error) console.error(`  -> Error inserting:`, error.message);
  }

  const exportPath = path.join(process.cwd(), "merged_classes_excel.json");
  fs.writeFileSync(exportPath, JSON.stringify(uniqueClasses, null, 2));
}

main().catch(console.error);
