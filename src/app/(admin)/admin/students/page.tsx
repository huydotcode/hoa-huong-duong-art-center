import {
  getStudents,
  getStudentsCount,
} from "@/lib/services/admin-students-service";
import StudentsList from "./_components/students-list";

export const STUDENTS_PAGE_SIZE = 15; // Reduced initial load for better TBT

interface SearchProps {
  searchParams?: Promise<{
    q?: string;
    subject?: string;
    learningStatus?: string;
  }>;
}

export default async function StudentsPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const subject = searchParams?.subject?.trim() || "";
  const learningStatus = searchParams?.learningStatus?.trim() || "";

  const [initialData, totalCount] = await Promise.all([
    getStudents(q, {
      limit: STUDENTS_PAGE_SIZE,
      offset: 0,
      subject,
      learningStatus,
    }),
    getStudentsCount(q, { subject, learningStatus }),
  ]);

  return (
    <StudentsList
      key={`${q}-${subject}-${learningStatus}`}
      initialData={initialData}
      query={q}
      subject={subject}
      learningStatus={learningStatus}
      totalCount={totalCount}
      pageSize={STUDENTS_PAGE_SIZE}
    />
  );
}
