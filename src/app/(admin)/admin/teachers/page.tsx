import { UpdateTeacherForm } from "@/components/forms/update-teacher-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import {
  getTeachers,
  type TeacherWithClasses,
} from "@/lib/services/admin-teachers-service";
import { Pencil } from "lucide-react";
import {
  TeachersSearchBar,
  AssignTeacherToClassDialog,
  DeleteTeacherButton,
} from "./_components";

interface SearchProps {
  searchParams?: Promise<{ q?: string }>;
}

export default async function TeachersPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const teachers = (await getTeachers(q, {
    includeClasses: true,
  })) as TeacherWithClasses[];
  return (
    <>
      <CardHeader className="px-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Danh sách giáo viên</CardTitle>
          <TeachersSearchBar />
        </div>
      </CardHeader>

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
                    <Badge
                      variant={teacher.is_active ? "default" : "destructive"}
                    >
                      {teacher.is_active ? "Hoạt động" : "Ngừng hoạt động"}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    {teacher.notes && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ghi chú:</span>
                        <span>{teacher.notes}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">
                        Đang dạy (
                        {teacher.class_names?.length
                          ? teacher.class_names.length
                          : 0}{" "}
                        lớp):
                      </span>
                      {teacher.class_names && teacher.class_names.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {teacher.class_names.map((className) => (
                            <Badge key={className} variant="secondary">
                              {className}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Chưa được gán lớp nào
                        </span>
                      )}
                    </div>
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
              <TableHead>Ghi chú</TableHead>
              <TableHead>Lớp đang dạy</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
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
                  <TableCell>{teacher.notes || "-"}</TableCell>
                  <TableCell>
                    {teacher.class_names && teacher.class_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {teacher.class_names.map((className) => (
                          <Badge key={className} variant="secondary">
                            {className}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Chưa có lớp
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={teacher.is_active ? "default" : "destructive"}
                    >
                      {teacher.is_active ? "Hoạt động" : "Ngừng hoạt động"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <UpdateTeacherForm teacher={teacher}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </UpdateTeacherForm>
                      <AssignTeacherToClassDialog
                        teacherId={teacher.id}
                        teacherName={teacher.full_name}
                        currentClasses={teacher.class_names ?? []}
                        buttonVariant="ghost"
                        buttonSize="icon"
                        hideLabel={true}
                        showIcon={true}
                        ariaLabel="Thêm vào lớp"
                      />
                      <DeleteTeacherButton
                        teacherId={teacher.id}
                        teacherName={teacher.full_name}
                        classNames={teacher.class_names ?? []}
                        variant="icon"
                      />
                    </div>
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
