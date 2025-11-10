import { getTeacherClassesForGrades } from "@/lib/services/teacher-grades-service";
import GradesClient from "./_components/grades-client";

export default async function TeacherGradesPage() {
  const classes = await getTeacherClassesForGrades();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chấm điểm</h1>
        <p className="text-muted-foreground mt-1">
          Chọn lớp và cập nhật điểm cho học sinh của bạn.
        </p>
      </div>

      <GradesClient classes={classes} />
    </div>
  );
}

