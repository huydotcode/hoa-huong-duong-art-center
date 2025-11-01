import { Header } from "@/components/layout/header";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="p-6">{children}</main>
    </div>
  );
}
