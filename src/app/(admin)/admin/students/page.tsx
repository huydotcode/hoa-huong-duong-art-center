import {
  getStudents,
  getStudentsCount,
} from "@/lib/services/admin-students-service";
import StudentsList from "./_components/students-list";

export const STUDENTS_PAGE_SIZE = 30;

interface SearchProps {
  searchParams?: Promise<{ q?: string }>;
}

export default async function StudentsPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";

  const [initialData, totalCount] = await Promise.all([
    getStudents(q, { limit: STUDENTS_PAGE_SIZE, offset: 0 }),
    getStudentsCount(q),
  ]);

  return (
    <StudentsList
      key={q}
      initialData={initialData}
      query={q}
      totalCount={totalCount}
      pageSize={STUDENTS_PAGE_SIZE}
    />
  );
}
