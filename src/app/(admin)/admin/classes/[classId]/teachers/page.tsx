import { notFound } from "next/navigation";
import TeachersSection from "../_components/teachers";
import {
  getClassById,
  getClassTeachers,
} from "@/lib/services/admin-classes-service";

export default async function TeachersPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const cls = await getClassById(classId);
  if (!cls) return notFound();
  const teachers = await getClassTeachers(classId);
  return <TeachersSection teachers={teachers} />;
}
