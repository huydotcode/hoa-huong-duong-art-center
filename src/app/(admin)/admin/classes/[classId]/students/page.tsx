import { notFound } from "next/navigation";
import StudentsSection from "../_components/students";
import {
  getClassById,
  getClassStudents,
  getClasses,
  type ClassListItem,
} from "@/lib/services/admin-classes-service";

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { classId } = await params;
  const { q, status } = await searchParams;
  const cls = await getClassById(classId);
  if (!cls) return notFound();
  const statusValue = (status || "").trim();
  const validStatus = ["trial", "active", "inactive"].includes(statusValue)
    ? (statusValue as "trial" | "active" | "inactive")
    : undefined;
  const allStudents = await getClassStudents(
    classId,
    validStatus ? { status: validStatus } : undefined
  );
  const allClasses: ClassListItem[] = await getClasses("");
  const targetClasses = allClasses
    .filter((c) => c.id !== classId)
    .map((c) => ({ id: c.id, name: c.name }));

  // Filter students based on search query
  const query = (q || "").trim().toLowerCase();
  const students = query
    ? allStudents.filter(
        (s) =>
          s.student.full_name.toLowerCase().includes(query) ||
          s.student.phone.includes(query)
      )
    : allStudents;

  // Use all students for enrolledStudentIds (not filtered)
  const enrolledStudentIds = allStudents.map((s) => s.student.id);

  return (
    <StudentsSection
      classId={classId}
      students={students}
      query={q || ""}
      status={validStatus || "all"}
      targetClasses={targetClasses}
      enrolledStudentIds={enrolledStudentIds}
    />
  );
}
