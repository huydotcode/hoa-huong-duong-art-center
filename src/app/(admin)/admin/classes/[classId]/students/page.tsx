import { notFound } from "next/navigation";
import StudentsSection from "../_components/students";
import {
  getClassById,
  getClassStudents,
} from "@/lib/services/admin-classes-service";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const cls = await getClassById(classId);
  if (!cls) return notFound();
  const students = await getClassStudents(classId);
  return <StudentsSection classId={classId} students={students} />;
}
