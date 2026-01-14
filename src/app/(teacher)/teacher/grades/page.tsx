import GradesClient from "./_components/grades-client";

export default function TeacherGradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chấm điểm</h1>
        <p className="text-muted-foreground mt-1">
          Chọn lớp và cập nhật điểm cho học sinh của bạn.
        </p>
      </div>

      <GradesClient />
    </div>
  );
}
