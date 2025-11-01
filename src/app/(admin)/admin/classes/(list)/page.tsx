import {
  getClasses,
  type ClassListItem,
} from "@/lib/services/admin-classes-service";
import ClassesList from "../_components/classes-list";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q || "";
  const data: ClassListItem[] = await getClasses(query);
  return <ClassesList data={data} query={query} />;
}
