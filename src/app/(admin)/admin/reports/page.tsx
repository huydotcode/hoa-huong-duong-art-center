import ReportsClient from "./_components/reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Báo cáo - Thống kê</h1>
      </div>
      <ReportsClient initialMonth={month} initialYear={year} />
    </div>
  );
}
