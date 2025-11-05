"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAttendanceByClassDate,
  listTeacherAttendanceByClassDate,
  upsertStudentAttendance,
  removeStudentAttendance,
  upsertTeacherAttendance,
  type AttendanceMap,
  type TeacherAttendanceMap,
  getStudentAttendanceCell,
  getTeacherAttendanceCell,
} from "@/lib/services/attendance-service";

export function useAttendanceQuery(classId: string, date: string) {
  return useQuery<AttendanceMap>({
    queryKey: ["attendance", classId, date],
    queryFn: () => listAttendanceByClassDate(classId, date),
  });
}

export function useTeacherAttendanceQuery(classId: string, date: string) {
  return useQuery<TeacherAttendanceMap>({
    queryKey: ["teacher-attendance", classId, date],
    queryFn: () => listTeacherAttendanceByClassDate(classId, date),
  });
}

export function useAttendanceMutation(
  classId: string,
  date: string,
  sessionTime: string
) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async ({
      studentId,
      isPresent,
    }: {
      studentId: string;
      isPresent: boolean;
    }) => {
      // Store both present and absent explicitly to avoid delete-fail cases
      await upsertStudentAttendance({
        classId,
        studentId,
        date,
        session_time: sessionTime,
        is_present: isPresent,
        marked_by: "admin",
      });
    },
    onMutate: async ({ studentId, isPresent }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["attendance", classId, date],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AttendanceMap>([
        "attendance",
        classId,
        date,
      ]);

      // Optimistically update
      queryClient.setQueryData<AttendanceMap>(
        ["attendance", classId, date],
        (old) => {
          if (!old) return old;
          const newData = { ...old };
          if (!newData[sessionTime]) {
            newData[sessionTime] = {};
          }
          if (isPresent) {
            newData[sessionTime][studentId] = true;
          } else {
            newData[sessionTime][studentId] = false;
          }
          return newData;
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["attendance", classId, date],
          context.previousData
        );
      }
    },
    onSuccess: async (_data, { studentId }) => {
      // fetch only the single cell and merge
      const sessionsToRefresh = [sessionTime];
      for (const s of sessionsToRefresh) {
        const fresh = await getStudentAttendanceCell({
          classId,
          studentId,
          date,
          session_time: s,
        });
        queryClient.setQueryData<AttendanceMap>(
          ["attendance", classId, date],
          (old) => {
            const next = { ...(old || {}) } as AttendanceMap;
            if (!next[s]) next[s] = {};
            if (fresh === null) {
              delete next[s][studentId];
            } else {
              next[s][studentId] = fresh;
            }
            return next;
          }
        );
      }
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      await Promise.all(
        studentIds.map((studentId) =>
          upsertStudentAttendance({
            classId,
            studentId,
            date,
            session_time: sessionTime,
            is_present: true,
            marked_by: "admin",
          })
        )
      );
    },
    onMutate: async (studentIds: string[]) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["attendance", classId, date],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AttendanceMap>([
        "attendance",
        classId,
        date,
      ]);

      // Optimistically update - mark all students as present
      queryClient.setQueryData<AttendanceMap>(
        ["attendance", classId, date],
        (old) => {
          const newData = { ...(old || {}) };
          if (!newData[sessionTime]) {
            newData[sessionTime] = {};
          }
          studentIds.forEach((studentId) => {
            newData[sessionTime][studentId] = true;
          });
          return newData;
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["attendance", classId, date],
          context.previousData
        );
      }
    },
    onSuccess: async () => {
      // no global refetch
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      await Promise.all(
        studentIds.map((studentId) =>
          removeStudentAttendance({
            classId,
            studentId,
            date,
            session_time: sessionTime,
          })
        )
      );
    },
    onMutate: async (studentIds: string[]) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["attendance", classId, date],
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<AttendanceMap>([
        "attendance",
        classId,
        date,
      ]);

      // Optimistically update - mark all as absent (store false)
      queryClient.setQueryData<AttendanceMap>(
        ["attendance", classId, date],
        (old) => {
          const newData = { ...(old || {}) };
          if (!newData[sessionTime])
            newData[sessionTime] = {} as Record<string, boolean>;
          studentIds.forEach((studentId) => {
            newData[sessionTime][studentId] = false;
          });
          return newData as AttendanceMap;
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["attendance", classId, date],
          context.previousData
        );
      }
    },
    onSuccess: async () => {
      // no global refetch
    },
  });

  return {
    toggle: toggleMutation,
    markAll: markAllMutation,
    clearAll: clearAllMutation,
  };
}

export function useAttendanceToggleAnySession(classId: string, date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionTime,
      studentId,
      isPresent,
    }: {
      sessionTime: string;
      studentId: string;
      isPresent: boolean;
    }) => {
      await upsertStudentAttendance({
        classId,
        studentId,
        date,
        session_time: sessionTime,
        is_present: isPresent,
        marked_by: "admin",
      });
    },
    onMutate: async ({ sessionTime, studentId, isPresent }) => {
      await queryClient.cancelQueries({
        queryKey: ["attendance", classId, date],
      });

      const previousData = queryClient.getQueryData<AttendanceMap>([
        "attendance",
        classId,
        date,
      ]);

      queryClient.setQueryData<AttendanceMap>(
        ["attendance", classId, date],
        (old) => {
          const newData = { ...(old || {}) } as AttendanceMap;
          if (!newData[sessionTime]) newData[sessionTime] = {};
          newData[sessionTime][studentId] = isPresent;
          return newData as AttendanceMap;
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousData) {
        queryClient.setQueryData(
          ["attendance", classId, date],
          ctx.previousData
        );
      }
    },
    onSuccess: async (_data, { sessionTime, studentId }) => {
      const fresh = await getStudentAttendanceCell({
        classId,
        studentId,
        date,
        session_time: sessionTime,
      });
      queryClient.setQueryData<AttendanceMap>(
        ["attendance", classId, date],
        (old) => {
          const next = { ...(old || {}) } as AttendanceMap;
          if (!next[sessionTime]) next[sessionTime] = {};
          if (fresh === null) delete next[sessionTime][studentId];
          else next[sessionTime][studentId] = fresh;
          return next;
        }
      );
    },
  });
}

export function useTeacherAttendanceMutation(
  classId: string,
  date: string,
  sessionTime: string
) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async ({
      teacherId,
      isPresent,
    }: {
      teacherId: string;
      isPresent: boolean;
    }) => {
      await upsertTeacherAttendance({
        classId,
        teacherId,
        date,
        session_time: sessionTime,
        is_present: isPresent,
        marked_by: "admin",
      });
    },
    onMutate: async ({ teacherId, isPresent }) => {
      await queryClient.cancelQueries({
        queryKey: ["teacher-attendance", classId, date],
      });

      const previousData = queryClient.getQueryData<TeacherAttendanceMap>([
        "teacher-attendance",
        classId,
        date,
      ]);

      queryClient.setQueryData<TeacherAttendanceMap>(
        ["teacher-attendance", classId, date],
        (old) => {
          const newData = { ...(old || {}) } as TeacherAttendanceMap;
          if (!newData[sessionTime]) {
            newData[sessionTime] = {};
          }
          newData[sessionTime][teacherId] = isPresent;
          return newData;
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["teacher-attendance", classId, date],
          context.previousData
        );
      }
    },
    onSuccess: async (_d, { teacherId }) => {
      const fresh = await getTeacherAttendanceCell({
        classId,
        teacherId,
        date,
        session_time: sessionTime,
      });
      queryClient.setQueryData<TeacherAttendanceMap>(
        ["teacher-attendance", classId, date],
        (old) => {
          const next = { ...(old || {}) } as TeacherAttendanceMap;
          if (!next[sessionTime]) next[sessionTime] = {};
          if (fresh === null) delete next[sessionTime][teacherId];
          else next[sessionTime][teacherId] = fresh;
          return next;
        }
      );
    },
  });

  return {
    toggle: toggleMutation,
  };
}

export function useTeacherAttendanceToggleAnySession(
  classId: string,
  date: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionTime,
      teacherId,
      isPresent,
    }: {
      sessionTime: string;
      teacherId: string;
      isPresent: boolean;
    }) => {
      await upsertTeacherAttendance({
        classId,
        teacherId,
        date,
        session_time: sessionTime,
        is_present: isPresent,
        marked_by: "admin",
      });
    },
    onMutate: async ({ sessionTime, teacherId, isPresent }) => {
      await queryClient.cancelQueries({
        queryKey: ["teacher-attendance", classId, date],
      });

      const previousData = queryClient.getQueryData<TeacherAttendanceMap>([
        "teacher-attendance",
        classId,
        date,
      ]);

      queryClient.setQueryData<TeacherAttendanceMap>(
        ["teacher-attendance", classId, date],
        (old) => {
          const newData = { ...(old || {}) } as TeacherAttendanceMap;
          if (!newData[sessionTime]) newData[sessionTime] = {};
          newData[sessionTime][teacherId] = isPresent;
          return newData;
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousData) {
        queryClient.setQueryData(
          ["teacher-attendance", classId, date],
          ctx.previousData
        );
      }
    },
    onSuccess: async (_d, { sessionTime, teacherId }) => {
      const fresh = await getTeacherAttendanceCell({
        classId,
        teacherId,
        date,
        session_time: sessionTime,
      });
      queryClient.setQueryData<TeacherAttendanceMap>(
        ["teacher-attendance", classId, date],
        (old) => {
          const next = { ...(old || {}) } as TeacherAttendanceMap;
          if (!next[sessionTime]) next[sessionTime] = {};
          if (fresh === null) delete next[sessionTime][teacherId];
          else next[sessionTime][teacherId] = fresh;
          return next;
        }
      );
    },
  });
}
