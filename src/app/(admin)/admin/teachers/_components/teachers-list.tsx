"use client";

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
import {
  getTeachers,
  type TeacherWithClasses,
} from "@/lib/services/admin-teachers-service";
import { Loader2, Pencil } from "lucide-react";
import { AssignTeacherToClassDialog, DeleteTeacherButton } from "./index";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

interface TeachersListProps {
  query: string;
}

export default function TeachersList({ query }: TeachersListProps) {
  const queryClient = useQueryClient();

  // Data fetching
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["admin-teachers", { query }],
    queryFn: async () => {
      const result = await getTeachers(query, { includeClasses: true });
      return result as TeacherWithClasses[];
    },
  });

  // Event listeners for real-time updates
  useEffect(() => {
    const handleInvalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
    };

    window.addEventListener("teacher-created", handleInvalidate);
    window.addEventListener("teacher-updated", handleInvalidate);
    window.addEventListener("teacher-deleted", handleInvalidate);

    return () => {
      window.removeEventListener("teacher-created", handleInvalidate);
      window.removeEventListener("teacher-updated", handleInvalidate);
      window.removeEventListener("teacher-deleted", handleInvalidate);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {query && (
        <p className="px-3 pb-2 text-sm text-muted-foreground">
          Đang tìm danh sách giáo viên theo:{" "}
          <span className="font-medium text-foreground">
            &quot;{query}&quot;
          </span>
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
            <Card key={teacher.id}>
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
                <div className="mt-3 flex gap-2 justify-end">
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
              </CardContent>
            </Card>
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
