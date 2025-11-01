import {
  getClassById,
  getClassStudents,
  getClassTeachers,
} from "@/lib/services/admin-classes-service";
import { notFound } from "next/navigation";
import OverviewSection from "../_components/overview";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const cls = await getClassById(classId);
  if (!cls) return notFound();
  const [teachers, students] = await Promise.all([
    getClassTeachers(classId),
    getClassStudents(classId),
  ]);
  return <OverviewSection cls={cls} teachers={teachers} students={students} />;
}
