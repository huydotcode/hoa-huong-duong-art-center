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
  // Try to select 'subject' from a single row
  const { data, error } = await supabase
    .from("classes")
    .select("subject")
    .limit(1);

  if (error) {
    console.error("Error/Column missing:", error.message);
  } else {
    console.log("Column 'subject' exists.");
  }
}

main();
