import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function Welcome() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const getUserDisplayName = () => {
    // Lấy tên từ email (ví dụ: ngonhuthuy@gmail.com -> ngonhuthuy)
    if (user.email) {
      const emailParts = user.email.split("@");
      return emailParts[0];
    }

    // Hoặc lấy từ phone
    if (user.phone) {
      // Bỏ số 0 đầu và +84
      const cleaned = user.phone.replace(/^\+84/, "").replace(/^0/, "");
      return cleaned;
    }

    return "Người dùng";
  };

  const displayName = getUserDisplayName();

  return (
    <div className="hidden items-center text-sm text-muted-foreground lg:flex">
      Xin chào,{" "}
      <span className="ml-1 font-semibold text-foreground">{displayName}</span>
    </div>
  );
}
