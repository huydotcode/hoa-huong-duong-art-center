import {
  getClasses,
  getClassesCount,
} from "@/lib/services/admin-classes-service";
import ClassesList from "../_components/classes-list";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string }>;
}) {
  const { q, subject } = await searchParams;
  const query = q || "";
  const subjectFilter = subject || "";
  const hasQuery = query.trim().length > 0;
  const hasSubjectFilter = subjectFilter.trim().length > 0;
  const hasAnyFilter = hasQuery || hasSubjectFilter;

  const opts = hasAnyFilter
    ? { subject: subjectFilter || undefined }
    : { limit: 5 };

  const [data, totalCount] = await Promise.all([
    getClasses(query, opts),
    hasAnyFilter ? Promise.resolve(0) : getClassesCount(query, opts),
  ]);

  return <ClassesList data={data} query={query} totalCount={totalCount} />;
}
