import {
  getStudents,
  getStudentsCount,
} from "@/lib/services/admin-students-service";
import StudentsList from "./_components/students-list";

interface SearchProps {
  searchParams?: Promise<{ q?: string }>;
}

export default async function StudentsPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";

  // Initial load: fetch 30 students by default for smoother browsing
  const [initialData, totalCount] = await Promise.all([
    getStudents(q, { limit: 30, offset: 0 }),
    getStudentsCount(q),
  ]);

  return (
    <StudentsList
      key={q}
      initialData={initialData}
      query={q}
      totalCount={totalCount}
    />
  );
}
