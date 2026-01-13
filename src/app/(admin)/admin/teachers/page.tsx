import { CardHeader, CardTitle } from "@/components/ui/card";
import { TeachersSearchBar } from "./_components";
import TeachersList from "./_components/teachers-list";

interface SearchProps {
  searchParams?: Promise<{ q?: string }>;
}

export default async function TeachersPage(props: SearchProps) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";

  return (
    <>
      <CardHeader className="px-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Danh sách giáo viên</CardTitle>
          <TeachersSearchBar />
        </div>
      </CardHeader>

      <TeachersList query={q} />
    </>
  );
}
