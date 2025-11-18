import {
  getClassById,
  getClassStudents,
  getClassesIdAndName,
} from "@/lib/services/admin-classes-service";
import { notFound } from "next/navigation";
import StudentsSection from "../_components/students";
import { normalizeText, normalizePhone } from "@/lib/utils";

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
  const [allStudents, targetClasses] = await Promise.all([
    getClassStudents(
      classId,
      validStatus ? { status: validStatus } : undefined
    ),
    getClassesIdAndName(classId), // Only fetch id and name, exclude current class
  ]);

  // Filter students based on search query (diacritic-insensitive)
  const query = (q || "").trim();
  const students = query
    ? (() => {
        const normalizedQuery = normalizeText(query);
        const normalizedQueryForPhone = normalizePhone(query);

        return allStudents.filter((s) => {
          // Search by full_name (diacritic-insensitive)
          const nameMatch = s.student.full_name
            ? normalizeText(s.student.full_name).includes(normalizedQuery)
            : false;

          // Search by phone (remove separators)
          const phoneMatch = s.student.phone
            ? normalizePhone(s.student.phone).includes(normalizedQueryForPhone)
            : false;

          return nameMatch || phoneMatch;
        });
      })()
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
