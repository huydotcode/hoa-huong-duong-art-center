import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // Check for monthly_fee = 0 or NULL
  const { data: classes, error } = await supabase
    .from("classes")
    .select("name, subject, monthly_fee")
    .or("monthly_fee.eq.0,monthly_fee.is.null");

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Classes with 0 (or null) fee: ${classes.length}`);
  if (classes.length > 0) {
    classes.forEach((c) => {
      console.log(
        `- ${c.name} [Subject: ${c.subject}] (Fee: ${c.monthly_fee})`
      );
    });
  }
}
main();
