import { notFound } from "next/navigation";
import TeachersSection from "../_components/teachers";
import {
  getClassById,
  getClassTeachers,
} from "@/lib/services/admin-classes-service";
import { normalizeText, normalizePhone } from "@/lib/utils";

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

  // Filter teachers based on search query (diacritic-insensitive)
  const query = (q || "").trim();
  const teachers = query
    ? (() => {
        const normalizedQuery = normalizeText(query);
        const normalizedQueryForPhone = normalizePhone(query);

        return allTeachers.filter((t) => {
          // Search by full_name (diacritic-insensitive)
          const nameMatch = t.teacher.full_name
            ? normalizeText(t.teacher.full_name).includes(normalizedQuery)
            : false;

          // Search by phone (remove separators)
          const phoneMatch = t.teacher.phone
            ? normalizePhone(t.teacher.phone).includes(normalizedQueryForPhone)
            : false;

          return nameMatch || phoneMatch;
        });
      })()
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
