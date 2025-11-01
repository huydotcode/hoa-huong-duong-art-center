import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { getStudents } from "@/lib/services/admin-students-service";
import { UpdateStudentForm } from "@/components/forms";

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
          students.map((s) => (
            <UpdateStudentForm key={s.id} student={s}>
              <Card role="button" className="cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{s.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{s.phone}</p>
                    </div>
                    <Badge variant={s.is_active ? "default" : "destructive"}>
                      {s.is_active ? "Hoạt động" : "Ngừng hoạt động"}
                    </Badge>
                  </div>
                  {/* Thông tin phụ huynh tạm ẩn */}
                </CardContent>
              </Card>
            </UpdateStudentForm>
          ))
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
              students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.phone}</TableCell>
                  {/* Cột phụ huynh tạm ẩn */}
                  <TableCell className="text-center">
                    <Badge variant={s.is_active ? "default" : "destructive"}>
                      {s.is_active ? "Hoạt động" : "Ngừng hoạt động"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <UpdateStudentForm student={s}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </UpdateStudentForm>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </>
  );
}
