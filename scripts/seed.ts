import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Supabase URL hoặc Service Role Key chưa được cấu hình trong .env.local"
  );
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function seedDatabase() {
  console.log("🚀 Bắt đầu quá trình seeding...");

  console.log("👑 Tạo admin...");
  await ensureAdminUser();

  console.log("✅ Hoàn tất. Đã đảm bảo tài khoản admin tồn tại.");
}

async function ensureAdminUser() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });

    if (error) {
      if (error.message?.includes("already registered")) {
        console.log("ℹ️ Tài khoản admin đã tồn tại, bỏ qua tạo mới.");
        return;
      }
      throw error;
    }

    console.log("✅ Admin đã được tạo thành công:", data.user?.email);
  } catch (error: unknown) {
    console.error("❌ Lỗi khi đảm bảo admin tồn tại:", error);
    process.exit(1);
  }
}

// Chạy hàm chính
seedDatabase().catch((error) => {
  console.error("❌ Đã xảy ra lỗi trong quá trình seeding:", error);
  process.exit(1);
});
