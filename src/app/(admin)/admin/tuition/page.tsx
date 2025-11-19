import {
  getTuitionData,
  getTuitionSummary,
} from "@/lib/services/admin-payment-service";
import { getClasses } from "@/lib/services/admin-classes-service";
import TuitionClient from "./_components/tuition-client";

export const dynamic = "force-dynamic";

interface SearchProps {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    classId?: string;
    q?: string;
    status?: string;
    subject?: string;
    learningStatus?: string;
  }>;
}

export default async function TuitionPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const monthParam = searchParams?.month;
  const yearParam = searchParams?.year;
  const classId = searchParams?.classId;
  const query = searchParams?.q || "";
  const status =
    (searchParams?.status as "all" | "paid" | "unpaid" | "not_created") ||
    "all";
  const subject = searchParams?.subject || "all";
  const learningStatus =
    (searchParams?.learningStatus as
      | "all"
      | "enrolled"
      | "active"
      | "trial"
      | "inactive") || "enrolled";

  // Default to current month/year if not provided
  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  // Validate month and year
  const validMonth = month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const validYear = year >= 2020 && year <= 2100 ? year : now.getFullYear();

  // Fetch data
  const [tuitionData, summary, classes] = await Promise.all([
    getTuitionData(
      validMonth,
      validYear,
      classId,
      query,
      status,
      subject,
      learningStatus
    ),
    getTuitionSummary(validMonth, validYear),
    getClasses(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Quản lý học phí tháng {month}/{year}
        </h1>
      </div>
      <TuitionClient
        initialTuitionData={tuitionData}
        initialMonth={validMonth}
        initialYear={validYear}
        initialClassId={classId}
        initialQuery={query}
        initialStatus={status}
        initialSubject={subject}
        initialLearningStatus={learningStatus}
        initialSummary={summary}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
