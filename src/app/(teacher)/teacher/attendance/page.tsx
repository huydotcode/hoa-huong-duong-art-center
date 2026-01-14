import TeacherAttendanceClient from "./_components/teacher-attendance-client";

export default function TeacherAttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Điểm danh</h1>
      </div>
      <TeacherAttendanceClient />
    </div>
  );
}
