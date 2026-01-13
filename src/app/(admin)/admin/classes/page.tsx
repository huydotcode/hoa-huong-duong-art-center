import ClassesList from "./_components/classes-list";

const PAGE_SIZE = 12;

export default async function ClassesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; subject?: string }>;
}) {
  const { q, subject } = (await searchParams) ?? {};
  const query = q ?? "";
  const subjectFilter = subject ?? "";

  return (
    <ClassesList
      query={query}
      subject={subjectFilter}
      defaultLimit={PAGE_SIZE}
    />
  );
}
