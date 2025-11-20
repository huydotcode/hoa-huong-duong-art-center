import {
  getClasses,
  getClassesCount,
} from "@/lib/services/admin-classes-service";
import ClassesList from "../_components/classes-list";

const PAGE_SIZE = 12;

export default async function ClassesPage({
  searchParams,
}: {
  searchParams?: { q?: string; subject?: string };
}) {
  const query = searchParams?.q ?? "";
  const subjectFilter = searchParams?.subject ?? "";

  const [data, totalCount] = await Promise.all([
    getClasses(query, {
      subject: subjectFilter || undefined,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    getClassesCount(query, { subject: subjectFilter || undefined }),
  ]);

  return (
    <ClassesList
      initialData={data}
      query={query}
      subject={subjectFilter}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
    />
  );
}
