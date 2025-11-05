import { Header } from "@/components/layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <Header />

      <div className="px-3 py-8 h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="max-w-[1500px] mx-auto text-center">
          <h2 className="text-2xl font-semibold">Không tìm thấy trang</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trang bạn tìm có thể đã bị xóa hoặc không tồn tại.
          </p>
          <div className="mt-4">
            <Link href="/">
              <Button>Quay về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
