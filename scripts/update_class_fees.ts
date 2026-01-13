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

const FEE_MAP: Record<string, number> = {
  Vẽ: 500000,
  Nhảy: 500000,
  Múa: 500000,
  Piano: 800000,
  Guitar: 600000,
  Trống: 1100000,
};

async function main() {
  console.log("Updating class fees...");

  // Iterate through map
  for (const [subject, fee] of Object.entries(FEE_MAP)) {
    console.log(`Setting fee for ${subject} to ${fee}`);

    // Update where subject equals key
    // Need to check if subject matches EXACTLY or loosely?
    // In previous steps we populated `subject` column with these exact keys (Múa, Vẽ, etc) from `check_schema_subject`.
    // So we can check exact match on `subject` column.

    const { error, count } = await supabase
      .from("classes")
      .update({ monthly_fee: fee })
      .eq("subject", subject)
      .select("id", { count: "exact" });

    if (error) {
      console.error(`Error updating ${subject}:`, error.message);
    } else {
      console.log(`  -> Updated ${count} classes.`);
    }
  }

  // Check if any classes missed?
  // Usually Trống, Ballet are in subjects list but user didn't specify fee here.
  // They might remain 0.
}

main();
