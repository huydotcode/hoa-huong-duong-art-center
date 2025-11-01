import { UpdateTeacherForm } from "@/components/forms/update-teacher-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { getTeachers } from "@/lib/services/admin-teachers-service";
import { Pencil } from "lucide-react";

interface SearchProps {
  searchParams?: Promise<{ q?: string }>;
}

export default async function TeachersPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const teachers = await getTeachers(q);
  return (
    <>
      {q && (
        <p className="px-3 pb-2 text-sm text-muted-foreground">
          Đang tìm danh sách giáo viên theo:{" "}
          <span className="font-medium text-foreground">&quot;{q}&quot;</span>
        </p>
      )}
      {/* Mobile: Card view */}
      <div className="grid gap-2 px-3 md:hidden">
        {teachers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Chưa có giáo viên nào
          </p>
        ) : (
          teachers.map((teacher) => (
            <UpdateTeacherForm key={teacher.id} teacher={teacher}>
              <Card role="button" className="cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{teacher.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {teacher.phone}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge
                        variant={teacher.is_active ? "default" : "destructive"}
                      >
                        {teacher.is_active ? "Hoạt động" : "Ngừng hoạt động"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lương/buổi:</span>
                      <span className="font-medium">
                        {teacher.salary_per_session.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    {teacher.notes && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ghi chú:</span>
                        <span>{teacher.notes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </UpdateTeacherForm>
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
              <TableHead className="text-right">Lương/buổi</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Chưa có giáo viên nào
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">
                    {teacher.full_name}
                  </TableCell>
                  <TableCell>{teacher.phone}</TableCell>
                  <TableCell className="text-right">
                    {teacher.salary_per_session.toLocaleString("vi-VN")}đ
                  </TableCell>
                  <TableCell>{teacher.notes || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={teacher.is_active ? "default" : "destructive"}
                    >
                      {teacher.is_active ? "Hoạt động" : "Ngừng hoạt động"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <UpdateTeacherForm teacher={teacher}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </UpdateTeacherForm>
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
