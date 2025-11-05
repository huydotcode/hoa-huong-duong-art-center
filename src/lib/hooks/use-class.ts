"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getClassById,
  getClassStudents,
} from "@/lib/services/admin-classes-service";
import { type Class, type ClassStudentItem } from "@/types";

export function useClassQuery(classId: string) {
  return useQuery<Class | null>({
    queryKey: ["class", classId],
    queryFn: () => getClassById(classId),
    enabled: !!classId,
  });
}

export function useClassStudentsQuery(classId: string) {
  return useQuery<ClassStudentItem[]>({
    queryKey: ["class-students", classId],
    queryFn: () => getClassStudents(classId),
    enabled: !!classId,
  });
}
