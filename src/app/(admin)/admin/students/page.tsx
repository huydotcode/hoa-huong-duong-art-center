import StudentsList from "./_components/students-list";

export const STUDENTS_PAGE_SIZE = 15; // Reduced initial load for better TBT

interface SearchProps {
  searchParams?: Promise<{
    q?: string;
    subject?: string;
    learningStatus?: string;
    recent?: string;
    tuitionStatus?: string;
    sortBy?: string;
    sortOrder?: string;
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
  const sortBy =
    (searchParams?.sortBy as
      | "name"
      | "created_at"
      | "enrollment_date"
      | "phone") || "name";
  const sortOrder = (searchParams?.sortOrder as "asc" | "desc") || "asc";

  // Note: All data fetching has been moved to client-side (StudentsList)
  // via React Query to improve interactivity and simplify state management.

  return (
    <StudentsList
      key={`${q}-${subject}-${learningStatus}-${recent}-${tuitionStatus || ""}-${sortBy}-${sortOrder}`}
      query={q}
      subject={subject}
      learningStatus={learningStatus}
      recentOnly={recent}
      tuitionStatus={tuitionStatus}
      sortBy={sortBy}
      sortOrder={sortOrder}
      defaultLimit={STUDENTS_PAGE_SIZE}
    />
  );
}
