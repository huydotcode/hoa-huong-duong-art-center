import { CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { getStudents } from "@/lib/services/admin-students-service";
import { StudentCard } from "./_components/student-card";
import { StudentTableRow } from "./_components/student-table-row";

interface SearchProps {
  searchParams?: Promise<{ q?: string }>;
}

export default async function StudentsPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const students = await getStudents(q);

  return (
    <>
      {q && (
        <p className="px-3 pb-2 text-sm text-muted-foreground">
          Đang tìm danh sách học sinh theo:{" "}
          <span className="font-medium text-foreground">&quot;{q}&quot;</span>
        </p>
      )}

      {/* Mobile: Card view */}
      <div className="grid gap-2 px-3 md:hidden">
        {students.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Chưa có học sinh nào
          </p>
        ) : (
          students.map((s) => <StudentCard key={s.id} student={s} />)
        )}
      </div>

      {/* Desktop: Table view */}
      <CardContent className="hidden p-0 md:block">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Số điện thoại</TableHead>
              {/* Cột phụ huynh tạm ẩn */}
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Chưa có học sinh nào
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => <StudentTableRow key={s.id} student={s} />)
            )}
          </TableBody>
        </Table>
      </CardContent>
    </>
  );
}
