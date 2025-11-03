import { notFound } from "next/navigation";
import TeachersSection from "../_components/teachers";
import {
  getClassById,
  getClassTeachers,
} from "@/lib/services/admin-classes-service";

export default async function TeachersPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { classId } = await params;
  const { q } = await searchParams;
  const cls = await getClassById(classId);
  if (!cls) return notFound();
  const allTeachers = await getClassTeachers(classId);

  // Filter teachers based on search query
  const query = (q || "").trim().toLowerCase();
  const teachers = query
    ? allTeachers.filter(
        (t) =>
          t.teacher.full_name.toLowerCase().includes(query) ||
          t.teacher.phone.includes(query)
      )
    : allTeachers;

  // Use all teachers for assignedTeacherIds (not filtered)
  const assignedTeacherIds = allTeachers.map((t) => t.teacher.id);

  return (
    <TeachersSection
      classId={classId}
      teachers={teachers}
      query={q || ""}
      assignedTeacherIds={assignedTeacherIds}
    />
  );
}
