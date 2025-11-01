import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClassNotFound() {
  return (
    <div className="px-3 py-8 text-center">
      <h2 className="text-2xl font-semibold">Không tìm thấy lớp học</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Lớp học bạn tìm có thể đã bị xóa hoặc không tồn tại.
      </p>
      <div className="mt-4">
        <Link href="/admin/classes">
          <Button>Quay về danh sách lớp</Button>
        </Link>
      </div>
    </div>
  );
}
