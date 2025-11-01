import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableHeaderRow,
  TableRow,
} from "@/components/ui/table";
import { EnrollStudentForm } from "@/components/forms/enroll-student-form";
import { ClassStudentItem } from "@/lib/services/admin-classes-service";

export default function StudentsSection({
  classId,
  students,
}: {
  classId: string;
  students: ClassStudentItem[];
}) {
  const enrolledStudentIds = students.map((s) => s.student.id);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2 justify-end">
        <EnrollStudentForm
          classId={classId}
          enrolledStudentIds={enrolledStudentIds}
        >
          <Button size="sm">Thêm học sinh</Button>
        </EnrollStudentForm>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Họ và tên</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.enrollment_id}>
                <TableCell className="font-medium">
                  {s.student.full_name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={s.status === "active" ? "default" : "secondary"}
                  >
                    {s.status === "active" ? "Đang học" : "Ngừng học"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
