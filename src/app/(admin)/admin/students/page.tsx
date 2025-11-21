import {
  getStudentLearningStats,
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
    recent?: string;
    tuitionStatus?: string;
  }>;
}

export default async function StudentsPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const subject = searchParams?.subject?.trim() || "";
  const learningStatus = searchParams?.learningStatus?.trim() || "";
  const recent = searchParams?.recent === "true";
  const tuitionStatus =
    (searchParams?.tuitionStatus?.trim() as
      | "paid_or_partial"
      | "unpaid_or_not_created"
      | undefined) || undefined;

  const [initialData, totalCount, learningStats] = await Promise.all([
    getStudents(q, {
      limit: STUDENTS_PAGE_SIZE,
      offset: 0,
      subject,
      learningStatus,
      recentOnly: recent,
      tuitionStatus,
    }),
    getStudentsCount(q, {
      subject,
      learningStatus,
      recentOnly: recent,
      tuitionStatus,
    }),
    getStudentLearningStats(q, {
      subject,
      learningStatus,
      recentOnly: recent,
      tuitionStatus,
    }),
  ]);

  return (
    <StudentsList
      key={`${q}-${subject}-${learningStatus}-${recent}-${tuitionStatus || ""}`}
      initialData={initialData}
      query={q}
      subject={subject}
      learningStatus={learningStatus}
      recentOnly={recent}
      tuitionStatus={tuitionStatus}
      totalCount={totalCount}
      pageSize={STUDENTS_PAGE_SIZE}
      learningStats={learningStats}
    />
  );
}
