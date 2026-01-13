import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // 1. Get all students
  const { data: students, error: stError } = await supabase
    .from("students")
    .select("id, full_name, phone");

  if (stError) {
    console.error("Error fetching students:", stError.message);
    return;
  }

  // 2. Get all enrollments
  const { data: enrollments, error: enError } = await supabase
    .from("student_class_enrollments")
    .select("student_id");

  if (enError) {
    console.error("Error fetching enrollments:", enError.message);
    return;
  }

  const enrolledStudentIds = new Set(enrollments.map((e) => e.student_id));
  const unenrolled = students.filter((s) => !enrolledStudentIds.has(s.id));

  console.log(`Total Students: ${students.length}`);
  console.log(`Total Enrollments: ${enrollments.length}`);
  console.log(`Unenrolled Students: ${unenrolled.length}`);

  if (unenrolled.length > 0) {
    console.log("\n--- List of Unenrolled Students ---");
    unenrolled.forEach((s) => {
      console.log(`- ${s.full_name} (${s.phone || "No Phone"})`);
    });
  }
}

main();
