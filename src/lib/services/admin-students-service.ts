"use server";
import { createClient } from "@/lib/supabase/server";
import {
  EnrollmentStatus,
  Student,
  StudentAttendanceTodayStatus,
  StudentClassSummary,
  StudentLearningStatus,
  StudentTuitionStatus,
  StudentWithClassSummary,
} from "@/types";
import { revalidatePath } from "next/cache";
import {
  isNewStudent,
  normalizePhone,
  normalizeText,
  toArray,
} from "@/lib/utils";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type StudentLearningStatsSummary = {
  active: number;
  trial: number;
  inactive: number;
  noClass: number;
  recent: number;
};

/**
 * Extract last word from Vietnamese name for sorting
 * Example: "Nguyễn Văn An" -> "An"
 */
function getLastNameWord(fullName: string): string {
  if (!fullName || typeof fullName !== "string") return "";
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  return words[words.length - 1] || trimmed;
}

export async function getStudents(
  query: string = "",
  opts: {
    limit?: number;
    offset?: number;
    subject?: string;
    learningStatus?: StudentLearningStatus | string | null;
    recentOnly?: boolean;
    tuitionStatus?: "paid_or_partial" | "unpaid_or_not_created" | null;
    sortBy?: "name" | "created_at" | "enrollment_date" | "phone";
    sortOrder?: "asc" | "desc";
  } = {}
): Promise<StudentWithClassSummary[]> {
  const supabase = await createClient();
  const now = new Date();
  const todayDayOfWeek = now.getDay();
  const todayISO = now.toISOString().slice(0, 10);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const limit = opts.limit ?? 30;
  const offset = opts.offset ?? 0;
  const subjectFilter = (opts.subject || "").trim();
  const subjectFilterNormalized = normalizeText(subjectFilter);
  const hasSubjectFilter =
    subjectFilterNormalized.length > 0 && subjectFilterNormalized !== "all";
  const learningStatusFilter = (opts.learningStatus || "")
    .toString()
    .trim()
    .toLowerCase();
  const recentOnly = Boolean(opts.recentOnly);
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const selectColumns = `
    id,
    full_name,
    phone,
    parent_phone,
    notes,
    is_active,
    created_at,
    updated_at,
    student_class_enrollments:student_class_enrollments (
      id,
      status,
      leave_date,
      class_id,
      enrollment_date,
      classes (
        id,
        name,
        subject,
        is_active,
        days_of_week
      )
    )
  `;

  const filterIdGroups: string[][] = [];

  const subjectStudentIds =
    subjectFilterNormalized.length > 0 && subjectFilterNormalized !== "all"
      ? await getStudentIdsBySubject(supabase, subjectFilterNormalized)
      : null;
  if (subjectStudentIds) {
    filterIdGroups.push(subjectStudentIds);
  }

  const shouldFilterByLearningStatus =
    isValidLearningStatus(learningStatusFilter);
  const learningStatusIds = shouldFilterByLearningStatus
    ? await getStudentIdsByLearningStatus(
        supabase,
        learningStatusFilter as StudentLearningStatus
      )
    : null;
  if (learningStatusIds) {
    filterIdGroups.push(learningStatusIds);
  }

  const recentStudentIds = recentOnly
    ? await getRecentStudentIds(supabase)
    : null;
  if (recentStudentIds) {
    filterIdGroups.push(recentStudentIds);
  }

  const idsToFilter = mergeIdFilters(filterIdGroups);
  if (idsToFilter && idsToFilter.length === 0) {
    return [];
  }

  // If tuitionStatus filter is applied, we need to load all matching students first,
  // then filter by tuition_status, then apply pagination
  const hasTuitionStatusFilter = Boolean(opts.tuitionStatus);
  const effectiveLimit = hasTuitionStatusFilter ? 10000 : limit;
  const effectiveOffset = hasTuitionStatusFilter ? 0 : offset;

  // Determine sort column and order
  const sortBy = opts.sortBy || "name";
  const sortOrder = opts.sortOrder || "asc";

  let orderColumn: string;
  let orderAscending: boolean;
  let needsPostSort = false; // For fields that need sorting after data is loaded

  switch (sortBy) {
    case "name":
      // Sort by last word (tên) instead of full name
      // Need to sort after loading data to extract last word
      orderColumn = "full_name"; // fallback for initial query
      orderAscending = true;
      needsPostSort = true;
      break;
    case "created_at":
      orderColumn = "created_at";
      orderAscending = sortOrder === "asc";
      break;
    case "phone":
      orderColumn = "phone";
      orderAscending = sortOrder === "asc";
      break;
    case "enrollment_date":
      // Need to sort after loading data since enrollment_date is not in students table
      orderColumn = "full_name"; // fallback for initial query
      orderAscending = true;
      needsPostSort = true;
      break;
    default:
      orderColumn = "full_name";
      orderAscending = true;
  }

  let request = supabase
    .from("students")
    .select(selectColumns)
    .order(orderColumn, { ascending: orderAscending })
    .range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  if (idsToFilter) {
    request = request.in("id", idsToFilter);
  }

  if (hasQuery) {
    const sanitized = trimmed.replace(/[%_]/g, "\\$&");
    const pattern = `%${sanitized}%`;
    request = request.or(
      `full_name.ilike.${pattern},phone.ilike.${pattern},parent_phone.ilike.${pattern}`
    );
  }

  const { data, error } = await request;
  if (error) throw error;

  type RawEnrollment = {
    id: string;
    leave_reason: string | null;
    status: EnrollmentStatus;
    leave_date: string | null;
    class_id: string;
    enrollment_date: string | null;
    classes?:
      | {
          id?: string;
          name?: string;
          subject?: string | null;
          is_active?: boolean;
          days_of_week?: unknown;
        }
      | Array<{
          id?: string;
          name?: string;
          subject?: string | null;
          is_active?: boolean;
          days_of_week?: unknown;
        }>;
  };

  type RawStudent = Student & {
    student_class_enrollments?: RawEnrollment | RawEnrollment[];
  };

  let students = ((data as RawStudent[]) ?? []).map(
    ({ student_class_enrollments, ...rest }) => {
      const enrollmentsRaw = Array.isArray(student_class_enrollments)
        ? student_class_enrollments
        : student_class_enrollments
          ? [student_class_enrollments]
          : [];

      const class_summary: StudentClassSummary[] = [];
      let firstEnrollmentDate: string | null = null;
      let hasSessionToday = false;
      let hasActiveEnrollment = false;
      let hasTrialEnrollment = false;
      const hasAnyEnrollment = enrollmentsRaw.length > 0;
      let hasInactiveOrLeft = false;

      for (const enrollment of enrollmentsRaw) {
        const enrollmentDate = enrollment.enrollment_date;
        if (enrollmentDate) {
          if (!firstEnrollmentDate) {
            firstEnrollmentDate = enrollmentDate;
          } else {
            const currentFirst = new Date(firstEnrollmentDate);
            const candidate = new Date(enrollmentDate);
            if (
              !isNaN(candidate.getTime()) &&
              (isNaN(currentFirst.getTime()) ||
                candidate.getTime() < currentFirst.getTime())
            ) {
              firstEnrollmentDate = enrollmentDate;
            }
          }
        }

        const leaveDate = enrollment.leave_date;
        const status = enrollment.status;
        const isActiveEnrollment =
          !leaveDate && (status === "active" || status === "trial");
        const cls = Array.isArray(enrollment.classes)
          ? enrollment.classes[0]
          : enrollment.classes;

        if (!isActiveEnrollment) {
          if (leaveDate || status === "inactive") {
            hasInactiveOrLeft = true;
            // Luôn thêm vào class_summary để hiển thị trong cột "Lớp / trạng thái"
            class_summary.push({
              classId: cls?.id ?? enrollment.class_id,
              className: cls?.name ?? "Lớp chưa đặt tên",
              subject: cls?.subject ?? null,
              status: "inactive",
              leaveDate: leaveDate ?? null,
              leaveReason: enrollment.leave_reason ?? null,
            });
          }
          continue;
        }

        if (status === "active") {
          hasActiveEnrollment = true;
        }
        if (status === "trial") {
          hasTrialEnrollment = true;
        }

        if (!hasSessionToday && cls?.days_of_week) {
          const schedule = toArray<{ day?: number }>(cls.days_of_week);
          hasSessionToday = schedule.some(
            (item) => Number(item.day) === todayDayOfWeek
          );
        }

        const schedule = cls?.days_of_week
          ? toArray<{ day?: number; start_time?: string; end_time?: string }>(
              cls.days_of_week
            )
          : [];

        class_summary.push({
          classId: cls?.id ?? enrollment.class_id,
          className: cls?.name ?? "Lớp chưa đặt tên",
          subject: cls?.subject ?? null,
          status: enrollment.status,
          schedule,
        });
      }

      // Filter class_summary by subject if filter is active
      let filteredClassSummary = class_summary;
      if (hasSubjectFilter) {
        filteredClassSummary = class_summary.filter((cls) => {
          // Ưu tiên dùng subject field nếu có
          if (cls.subject) {
            const normalizedClassSubject = normalizeText(cls.subject);
            if (normalizedClassSubject === subjectFilterNormalized) {
              return true;
            }
          }
          // Fallback về name matching nếu subject chưa có
          const normalizedClassName = normalizeText(cls.className || "");
          return normalizedClassName.includes(subjectFilterNormalized);
        });
      }

      // Calculate learningStatus based on filtered classes if subject filter is active
      let learningStatus: StudentLearningStatus = "no_class";
      if (hasSubjectFilter) {
        // Only calculate based on classes in the subject
        const hasActiveInSubject = filteredClassSummary.some(
          (cls) => cls.status === "active"
        );
        const hasTrialInSubject = filteredClassSummary.some(
          (cls) => cls.status === "trial"
        );
        const hasInactiveInSubject = filteredClassSummary.some(
          (cls) => cls.status === "inactive"
        );

        if (hasActiveInSubject) {
          learningStatus = "active";
        } else if (hasTrialInSubject) {
          learningStatus = "trial";
        } else if (hasInactiveInSubject) {
          learningStatus = "inactive";
        } else {
          learningStatus = "no_class";
        }
      } else {
        // Original logic when no subject filter
        if (hasActiveEnrollment) {
          learningStatus = "active";
        } else if (hasTrialEnrollment) {
          learningStatus = "trial";
        } else if (hasAnyEnrollment || hasInactiveOrLeft) {
          learningStatus = "inactive";
        }
      }

      // Recalculate hasSessionToday based on filtered classes if subject filter is active
      let finalHasSessionToday = hasSessionToday;
      if (hasSubjectFilter) {
        finalHasSessionToday = filteredClassSummary.some((cls) => {
          if (!cls.schedule || cls.schedule.length === 0) return false;
          return cls.schedule.some(
            (item) => Number(item.day) === todayDayOfWeek
          );
        });
      }

      return {
        ...rest,
        class_summary: filteredClassSummary,
        first_enrollment_date: firstEnrollmentDate,
        has_session_today: finalHasSessionToday,
        learning_status: learningStatus,
      } as StudentWithClassSummary;
    }
  );

  // Filter out students with no classes in the subject when subject filter is active
  if (hasSubjectFilter) {
    students = students.filter(
      (student) => (student.class_summary?.length ?? 0) > 0
    );
  }

  if (students.length === 0) {
    return students;
  }

  const studentIds = students.map((s) => s.id);

  // Build map of subject class IDs for each student
  const subjectClassIdsByStudent = new Map<string, Set<string>>();
  if (hasSubjectFilter) {
    students.forEach((student) => {
      const matchingClassIds = new Set<string>();
      student.class_summary?.forEach((cls) => {
        const normalizedClassName = normalizeText(cls.className || "");
        if (normalizedClassName.includes(subjectFilterNormalized)) {
          matchingClassIds.add(cls.classId);
        }
      });
      if (matchingClassIds.size > 0) {
        subjectClassIdsByStudent.set(student.id, matchingClassIds);
      }
    });
  }

  const [
    { data: paymentData, error: paymentError },
    { data: attendanceData, error: attendanceError },
  ] = await Promise.all([
    supabase
      .from("payment_status")
      .select("student_id, class_id, is_paid")
      .eq("month", currentMonth)
      .eq("year", currentYear)
      .in("student_id", studentIds),
    supabase
      .from("attendance")
      .select("student_id, is_present")
      .eq("attendance_date", todayISO)
      .in("student_id", studentIds)
      .not("student_id", "is", null),
  ]);

  if (paymentError) throw paymentError;
  if (attendanceError) throw attendanceError;

  const paymentMap = new Map<
    string,
    Array<{
      class_id: string;
      is_paid: boolean;
    }>
  >();
  (
    (paymentData as Array<{
      student_id: string | null;
      class_id: string | null;
      is_paid: boolean;
    }> | null) ?? []
  ).forEach((row) => {
    if (!row.student_id || !row.class_id) return;
    if (!paymentMap.has(row.student_id)) {
      paymentMap.set(row.student_id, []);
    }
    paymentMap.get(row.student_id)!.push({
      class_id: row.class_id,
      is_paid: row.is_paid,
    });
  });

  const attendanceMap = new Map<
    string,
    Array<{
      is_present: boolean | null;
    }>
  >();
  (
    (attendanceData as Array<{
      student_id: string | null;
      is_present: boolean | null;
    }> | null) ?? []
  ).forEach((row) => {
    if (!row.student_id) return;
    if (!attendanceMap.has(row.student_id)) {
      attendanceMap.set(row.student_id, []);
    }
    attendanceMap.get(row.student_id)!.push({ is_present: row.is_present });
  });

  const resolveTuitionStatus = (
    payments: Array<{ class_id: string; is_paid: boolean }>,
    subjectClassIds?: Set<string>
  ): StudentTuitionStatus => {
    if (!payments || payments.length === 0) return "not_created";

    // Filter payments by subject class IDs if provided
    const relevantPayments = subjectClassIds
      ? payments.filter((p) => subjectClassIds.has(p.class_id))
      : payments;

    if (relevantPayments.length === 0) return "not_created";
    const paidCount = relevantPayments.filter((p) => p.is_paid).length;
    if (paidCount === relevantPayments.length) return "paid";
    if (paidCount === 0) return "unpaid";
    return "partial";
  };

  const resolveAttendanceStatus = (
    hasSessionToday: boolean | undefined,
    records: Array<{ is_present: boolean | null }>
  ): StudentAttendanceTodayStatus => {
    if (!hasSessionToday) return "no_session";
    if (!records || records.length === 0) return "pending";
    if (records.some((r) => r.is_present === true)) return "present";
    if (records.some((r) => r.is_present === false)) return "absent";
    return "pending";
  };

  students.forEach((student) => {
    const subjectClassIds = hasSubjectFilter
      ? subjectClassIdsByStudent.get(student.id)
      : undefined;
    const tuitionStatus = resolveTuitionStatus(
      paymentMap.get(student.id) ?? [],
      subjectClassIds
    );
    const attendanceStatus = resolveAttendanceStatus(
      student.has_session_today,
      attendanceMap.get(student.id) ?? []
    );
    student.tuition_status = tuitionStatus;
    student.attendance_today_status = attendanceStatus;
  });

  // Filter by tuition status if specified
  const tuitionStatusFilter = opts.tuitionStatus;
  let filteredStudents = students;
  if (tuitionStatusFilter === "paid_or_partial") {
    filteredStudents = students.filter(
      (s) => s.tuition_status === "paid" || s.tuition_status === "partial"
    );
  } else if (tuitionStatusFilter === "unpaid_or_not_created") {
    filteredStudents = students.filter(
      (s) => s.tuition_status === "unpaid" || s.tuition_status === "not_created"
    );
  }

  // Sort after loading data if needed
  if (needsPostSort) {
    if (sortBy === "enrollment_date") {
      filteredStudents.sort((a, b) => {
        const dateA = a.first_enrollment_date
          ? new Date(a.first_enrollment_date).getTime()
          : 0;
        const dateB = b.first_enrollment_date
          ? new Date(b.first_enrollment_date).getTime()
          : 0;
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
    } else if (sortBy === "name") {
      // Sort by last word (tên) instead of full name
      filteredStudents.sort((a, b) => {
        const lastNameA = getLastNameWord(a.full_name);
        const lastNameB = getLastNameWord(b.full_name);
        const compare = lastNameA.localeCompare(lastNameB, "vi", {
          sensitivity: "base",
        });
        return sortOrder === "asc" ? compare : -compare;
      });
    }
  }

  // Apply pagination after filtering if tuitionStatus filter was applied
  if (hasTuitionStatusFilter) {
    const start = offset;
    const end = offset + limit;
    return filteredStudents.slice(start, end);
  }

  return filteredStudents;
}

// Add function to get total count (for pagination)
export async function getStudentsCount(
  query: string = "",
  opts: {
    subject?: string;
    learningStatus?: StudentLearningStatus | string | null;
    recentOnly?: boolean;
    tuitionStatus?: "paid_or_partial" | "unpaid_or_not_created" | null;
  } = {}
): Promise<number> {
  const supabase = await createClient();

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const subjectFilter = (opts.subject || "").trim();
  const learningStatusFilter = (opts.learningStatus || "")
    .toString()
    .trim()
    .toLowerCase();
  const recentOnly = Boolean(opts.recentOnly);

  const filterIdGroups: string[][] = [];

  const subjectStudentIds =
    subjectFilter.length > 0 && subjectFilter.toLowerCase() !== "all"
      ? await getStudentIdsBySubject(supabase, subjectFilter)
      : null;
  if (subjectStudentIds) {
    filterIdGroups.push(subjectStudentIds);
  }

  const shouldFilterByLearningStatus =
    isValidLearningStatus(learningStatusFilter);
  const learningStatusIds = shouldFilterByLearningStatus
    ? await getStudentIdsByLearningStatus(
        supabase,
        learningStatusFilter as StudentLearningStatus
      )
    : null;
  if (learningStatusIds) {
    filterIdGroups.push(learningStatusIds);
  }

  const recentStudentIds = recentOnly
    ? await getRecentStudentIds(supabase)
    : null;
  if (recentStudentIds) {
    filterIdGroups.push(recentStudentIds);
  }

  const idsToFilter = mergeIdFilters(filterIdGroups);

  if (idsToFilter && idsToFilter.length === 0) {
    return 0;
  }

  const hasSubjectFilter =
    subjectFilter.length > 0 && subjectFilter.toLowerCase() !== "all";

  // If subject filter or tuitionStatus filter is applied, we need to load students
  // and filter correctly (subject filter removes students with no matching classes,
  // tuitionStatus filter needs to calculate tuition_status), so we use getStudents
  // with a large limit
  if (hasSubjectFilter || opts.tuitionStatus) {
    const allStudents = await getStudents(query, {
      ...opts,
      limit: 10000, // Large limit to get all matching students
      offset: 0,
    });
    return allStudents.length;
  }

  let request = supabase
    .from("students")
    .select("*", { count: "exact", head: true });

  if (idsToFilter) {
    request = request.in("id", idsToFilter);
  }

  if (hasQuery) {
    const sanitized = trimmed.replace(/[%_]/g, "\\$&");
    const pattern = `%${sanitized}%`;
    request = request.or(
      `full_name.ilike.${pattern},phone.ilike.${pattern},parent_phone.ilike.${pattern}`
    );
  }

  const { count, error } = await request;
  if (error) throw error;
  return count ?? 0;
}

export async function getStudentLearningStats(
  query: string = "",
  opts: {
    subject?: string;
    learningStatus?: StudentLearningStatus | string | null;
    recentOnly?: boolean;
    tuitionStatus?: "paid_or_partial" | "unpaid_or_not_created" | null;
  } = {}
): Promise<StudentLearningStatsSummary> {
  const supabase = await createClient();

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const subjectFilter = (opts.subject || "").trim();
  const learningStatusFilter = (opts.learningStatus || "")
    .toString()
    .trim()
    .toLowerCase();
  const recentOnly = Boolean(opts.recentOnly);

  const filterIdGroups: string[][] = [];

  const subjectStudentIds =
    subjectFilter.length > 0 && subjectFilter.toLowerCase() !== "all"
      ? await getStudentIdsBySubject(supabase, subjectFilter)
      : null;
  if (subjectStudentIds) {
    filterIdGroups.push(subjectStudentIds);
  }

  const shouldFilterByLearningStatus =
    isValidLearningStatus(learningStatusFilter);
  const learningStatusIds = shouldFilterByLearningStatus
    ? await getStudentIdsByLearningStatus(
        supabase,
        learningStatusFilter as StudentLearningStatus
      )
    : null;
  if (learningStatusIds) {
    filterIdGroups.push(learningStatusIds);
  }

  const recentStudentIds = recentOnly
    ? await getRecentStudentIds(supabase)
    : null;
  if (recentStudentIds) {
    filterIdGroups.push(recentStudentIds);
  }

  const idsToFilter = mergeIdFilters(filterIdGroups);

  if (idsToFilter && idsToFilter.length === 0) {
    return {
      active: 0,
      trial: 0,
      inactive: 0,
      noClass: 0,
      recent: 0,
    };
  }

  // If tuitionStatus filter is applied, we need to load students and calculate tuition_status
  // to filter correctly, so we use getStudents with a large limit
  if (opts.tuitionStatus) {
    const allStudents = await getStudents(query, {
      ...opts,
      limit: 10000, // Large limit to get all matching students
      offset: 0,
    });
    // Calculate stats from filtered students
    const stats: StudentLearningStatsSummary = {
      active: 0,
      trial: 0,
      inactive: 0,
      noClass: 0,
      recent: 0,
    };
    const now = new Date();
    allStudents.forEach((student) => {
      const learningStatus = student.learning_status;
      if (learningStatus) {
        switch (learningStatus) {
          case "active":
            stats.active += 1;
            break;
          case "trial":
            stats.trial += 1;
            break;
          case "inactive":
            stats.inactive += 1;
            break;
          default:
            stats.noClass += 1;
            break;
        }
      } else {
        stats.noClass += 1;
      }
      // Check if recent
      if (student.created_at && isNewStudent(student.created_at)) {
        stats.recent += 1;
      } else if (student.first_enrollment_date) {
        const enrollmentDate = new Date(student.first_enrollment_date);
        const diff = now.getTime() - enrollmentDate.getTime();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        if (
          !isNaN(enrollmentDate.getTime()) &&
          diff >= 0 &&
          diff <= THIRTY_DAYS_MS
        ) {
          stats.recent += 1;
        }
      }
    });
    return stats;
  }

  let studentQuery = supabase.from("students").select("id, created_at");

  if (idsToFilter) {
    studentQuery = studentQuery.in("id", idsToFilter);
  }

  if (hasQuery) {
    const sanitized = trimmed.replace(/[%_]/g, "\\$&");
    const pattern = `%${sanitized}%`;
    studentQuery = studentQuery.or(
      `full_name.ilike.${pattern},phone.ilike.${pattern},parent_phone.ilike.${pattern}`
    );
  }

  const { data: students, error: studentsError } = await studentQuery;
  if (studentsError) throw studentsError;

  const mappedStudents =
    (students as Array<{ id: string | null; created_at: string | null }>) ?? [];
  const studentIds = mappedStudents
    .map((s) => s.id)
    .filter((id): id is string => Boolean(id));

  if (studentIds.length === 0) {
    return {
      active: 0,
      trial: 0,
      inactive: 0,
      noClass: 0,
      recent: 0,
    };
  }

  const hasSubjectFilter =
    subjectFilter.length > 0 && subjectFilter.toLowerCase() !== "all";
  const normalizedSubjectFilter = hasSubjectFilter
    ? normalizeText(subjectFilter)
    : null;

  // Load enrollments với class data để có thể filter theo subject
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("student_class_enrollments")
    .select(
      "student_id,status,leave_date,enrollment_date,class_id,classes(subject,name)"
    )
    .in("student_id", studentIds);
  if (enrollmentError) throw enrollmentError;

  const enrollmentMap = new Map<
    string,
    Array<{
      status: EnrollmentStatus;
      leave_date: string | null;
      enrollment_date: string | null;
      classSubject?: string | null;
    }>
  >();

  (enrollments ?? []).forEach((row) => {
    const studentId = row.student_id as string | null;
    if (!studentId) return;

    // Get class data
    const classData = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    const classSubject =
      (classData as { subject?: string | null } | null)?.subject ?? null;

    // Nếu có subject filter, chỉ thêm enrollment của môn đó
    if (hasSubjectFilter && normalizedSubjectFilter) {
      if (classSubject) {
        const normalizedClassSubject = normalizeText(classSubject);
        if (normalizedClassSubject !== normalizedSubjectFilter) {
          return; // Skip enrollment không thuộc môn đang filter
        }
      } else {
        // Fallback: check class name nếu subject chưa có
        const className = (classData as { name?: string } | null)?.name ?? "";
        const normalizedClassName = normalizeText(className);
        if (!normalizedClassName.includes(normalizedSubjectFilter)) {
          return; // Skip enrollment không thuộc môn đang filter
        }
      }
    }

    if (!enrollmentMap.has(studentId)) {
      enrollmentMap.set(studentId, []);
    }
    enrollmentMap.get(studentId)!.push({
      status: row.status as EnrollmentStatus,
      leave_date: row.leave_date as string | null,
      enrollment_date: row.enrollment_date as string | null,
      classSubject,
    });
  });

  const stats: StudentLearningStatsSummary = {
    active: 0,
    trial: 0,
    inactive: 0,
    noClass: 0,
    recent: 0,
  };

  const now = new Date();

  mappedStudents.forEach((student) => {
    const studentId = student.id;
    if (!studentId) return;

    const enrollmentsForStudent = enrollmentMap.get(studentId) ?? [];
    let learningStatus: StudentLearningStatus = "no_class";
    let firstEnrollmentDate: string | null = null;
    let hasInactiveOrLeft = false;
    let hasActiveEnrollment = false;
    let hasTrialEnrollment = false;

    enrollmentsForStudent.forEach((enrollment) => {
      const enrollmentDate = enrollment.enrollment_date;
      if (enrollmentDate) {
        if (!firstEnrollmentDate) {
          firstEnrollmentDate = enrollmentDate;
        } else {
          const currentFirst = new Date(firstEnrollmentDate);
          const candidate = new Date(enrollmentDate);
          if (
            !isNaN(candidate.getTime()) &&
            (isNaN(currentFirst.getTime()) ||
              candidate.getTime() < currentFirst.getTime())
          ) {
            firstEnrollmentDate = enrollmentDate;
          }
        }
      }

      const leaveDate = enrollment.leave_date;
      const status = enrollment.status;
      const isActiveEnrollment =
        !leaveDate && (status === "active" || status === "trial");

      if (!isActiveEnrollment) {
        if (leaveDate || status === "inactive") {
          hasInactiveOrLeft = true;
        }
        return;
      }

      if (status === "active") {
        hasActiveEnrollment = true;
      }
      if (status === "trial") {
        hasTrialEnrollment = true;
      }
    });

    if (hasActiveEnrollment) {
      learningStatus = "active";
    } else if (hasTrialEnrollment) {
      learningStatus = "trial";
    } else if (hasInactiveOrLeft || enrollmentsForStudent.length > 0) {
      learningStatus = "inactive";
    }

    switch (learningStatus) {
      case "active":
        stats.active += 1;
        break;
      case "trial":
        stats.trial += 1;
        break;
      case "inactive":
        stats.inactive += 1;
        break;
      default:
        stats.noClass += 1;
        break;
    }

    if (student.created_at && isNewStudent(student.created_at)) {
      stats.recent += 1;
    } else if (firstEnrollmentDate) {
      const enrollmentDate = new Date(firstEnrollmentDate);
      const diff = now.getTime() - enrollmentDate.getTime();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      if (
        !isNaN(enrollmentDate.getTime()) &&
        diff >= 0 &&
        diff <= THIRTY_DAYS_MS
      ) {
        stats.recent += 1;
      }
    }
  });

  return stats;
}

async function getStudentIdsBySubject(
  supabase: SupabaseServerClient,
  subject: string
): Promise<string[]> {
  const normalizedSubject = normalizeText(subject);
  if (!normalizedSubject) return [];

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, subject, is_active");
  if (classesError) throw classesError;

  const matchingClassIds =
    (classes ?? [])
      .map((cls) => ({
        id: cls?.id as string | undefined,
        name: (cls as { name?: string }).name ?? "",
        subject: (cls as { subject?: string | null }).subject ?? null,
      }))
      .filter(
        (cls): cls is { id: string; name: string; subject: string | null } => {
          if (!cls.id) return false;

          // Ưu tiên dùng subject field nếu có
          if (cls.subject) {
            const normalizedClassSubject = normalizeText(cls.subject);
            if (normalizedClassSubject === normalizedSubject) {
              return true;
            }
          }

          // Fallback về name matching
          const normalizedClassName = normalizeText(cls.name || "");
          return normalizedClassName.includes(normalizedSubject);
        }
      )
      .map((cls) => cls.id) ?? [];

  if (matchingClassIds.length === 0) {
    return [];
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("student_class_enrollments")
    .select("student_id")
    .in("class_id", matchingClassIds)
    .not("student_id", "is", null);
  if (enrollmentsError) throw enrollmentsError;

  const ids = new Set<string>();
  (enrollments ?? []).forEach((row) => {
    if (row.student_id) {
      ids.add(row.student_id);
    }
  });

  return Array.from(ids);
}

const VALID_LEARNING_STATUSES: StudentLearningStatus[] = [
  "active",
  "trial",
  "inactive",
  "no_class",
];

function isValidLearningStatus(
  status: string
): status is StudentLearningStatus {
  return VALID_LEARNING_STATUSES.includes(status as StudentLearningStatus);
}

function mergeIdFilters(groups: string[][]): string[] | null {
  if (groups.length === 0) return null;
  if (groups.length === 1) {
    return Array.from(new Set(groups[0]));
  }
  let intersection = new Set(groups[0]);
  for (let i = 1; i < groups.length; i += 1) {
    const current = new Set(groups[i]);
    intersection = new Set([...intersection].filter((id) => current.has(id)));
    if (intersection.size === 0) {
      break;
    }
  }
  return Array.from(intersection);
}

async function getStudentIdsByLearningStatus(
  supabase: SupabaseServerClient,
  status: StudentLearningStatus
): Promise<string[]> {
  switch (status) {
    case "active":
    case "trial":
      return getStudentIdsByEnrollmentStatus(supabase, status);
    case "inactive":
      return getInactiveStudentIds(supabase);
    case "no_class":
      return getStudentsWithoutClass(supabase);
    default:
      return [];
  }
}

async function getStudentIdsByEnrollmentStatus(
  supabase: SupabaseServerClient,
  status: Extract<StudentLearningStatus, "active" | "trial">
): Promise<string[]> {
  const { data, error } = await supabase
    .from("student_class_enrollments")
    .select("student_id")
    .eq("status", status === "active" ? "active" : "trial")
    .is("leave_date", null)
    .not("student_id", "is", null);
  if (error) throw error;

  const ids = new Set<string>();
  (data ?? []).forEach((row) => {
    const studentId = row.student_id as string | null;
    if (studentId) {
      ids.add(studentId);
    }
  });
  return Array.from(ids);
}

async function getInactiveStudentIds(
  supabase: SupabaseServerClient
): Promise<string[]> {
  const [activeIds, trialIds, { data, error }] = await Promise.all([
    getStudentIdsByEnrollmentStatus(supabase, "active"),
    getStudentIdsByEnrollmentStatus(supabase, "trial"),
    supabase
      .from("student_class_enrollments")
      .select("student_id,status,leave_date")
      .not("student_id", "is", null),
  ]);

  if (error) throw error;

  const currentIds = new Set([...activeIds, ...trialIds]);
  const inactiveCandidates = new Set<string>();

  (data ?? []).forEach((row) => {
    const studentId = row.student_id as string | null;
    if (!studentId) return;
    if (currentIds.has(studentId)) {
      return;
    }
    if (row.leave_date || row.status === "inactive") {
      inactiveCandidates.add(studentId);
    }
  });

  return Array.from(inactiveCandidates);
}

async function getStudentsWithoutClass(
  supabase: SupabaseServerClient
): Promise<string[]> {
  const [
    { data: students, error: studentsError },
    { data: enrollmentData, error: enrollmentError },
  ] = await Promise.all([
    supabase.from("students").select("id"),
    supabase
      .from("student_class_enrollments")
      .select("student_id")
      .not("student_id", "is", null),
  ]);

  if (studentsError) throw studentsError;
  if (enrollmentError) throw enrollmentError;

  const enrolledIds = new Set(
    (enrollmentData ?? [])
      .map((row) => row.student_id as string | null)
      .filter((id): id is string => Boolean(id))
  );

  return (students ?? [])
    .map((student) => student.id as string | null)
    .filter((id): id is string => Boolean(id))
    .filter((id) => !enrolledIds.has(id));
}

async function getRecentStudentIds(
  supabase: SupabaseServerClient
): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("student_class_enrollments")
    .select("student_id, enrollment_date")
    .gte("enrollment_date", cutoffISO)
    .not("student_id", "is", null);

  if (error) throw error;

  const ids = new Set<string>();
  (data ?? []).forEach((row) => {
    const studentId = row.student_id as string | null;
    if (studentId) {
      ids.add(studentId);
    }
  });

  return Array.from(ids);
}

type CreateStudentData = Pick<
  Student,
  "full_name" | "phone" | "parent_phone" | "is_active" | "notes"
>;

/**
 * Check if a student with the same name and phone already exists
 * @param fullName Student's full name
 * @param phone Student's phone (can be null)
 * @returns Existing student if found, null otherwise
 */
export async function checkDuplicateStudent(
  fullName: string,
  phone: string | null
): Promise<Student | null> {
  const supabase = await createClient();

  // Normalize phone
  const normalizedPhone = phone
    ? phone.trim() === ""
      ? null
      : normalizePhone(phone)
    : null;

  // Build query: same name AND (same phone OR both phones are null)
  let query = supabase
    .from("students")
    .select("*")
    .eq("full_name", fullName.trim());

  if (normalizedPhone) {
    query = query.eq("phone", normalizedPhone);
  } else {
    query = query.is("phone", null);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error("Error checking duplicate student:", error);
    return null; // Don't block on error, let createStudent handle it
  }

  return data as Student | null;
}

export async function createStudent(
  data: Omit<CreateStudentData, "is_active" | "parent_phone"> & {
    is_active?: boolean;
    parent_phone?: string | null;
  },
  path?: string,
  options?: { skipDuplicateCheck?: boolean }
) {
  const supabase = await createClient();

  // Normalize phone: convert empty string to null, normalize if provided
  const normalizedPhone = data.phone
    ? data.phone.trim() === ""
      ? null
      : normalizePhone(data.phone)
    : null;

  // Normalize parent_phone: convert empty string to null, normalize if provided
  // If parent_phone is not provided, use phone as default
  const normalizedParentPhone = data.parent_phone
    ? data.parent_phone.trim() === ""
      ? null
      : normalizePhone(data.parent_phone)
    : normalizedPhone;

  const normalizedNotes =
    data.notes && data.notes.trim().length > 0 ? data.notes.trim() : null;

  // Check for duplicate: same name AND same phone (unless skipDuplicateCheck is true)
  if (!options?.skipDuplicateCheck) {
    const existingStudent = await checkDuplicateStudent(
      data.full_name,
      normalizedPhone
    );

    if (existingStudent) {
      const phoneDisplay = normalizedPhone || "không có";
      throw new Error(
        `Đã tồn tại học sinh với tên "${data.full_name.trim()}" và số điện thoại "${phoneDisplay}". Vui lòng kiểm tra lại.`
      );
    }
  }

  const payload = {
    full_name: data.full_name.trim(),
    phone: normalizedPhone,
    parent_phone: normalizedParentPhone,
    is_active: data.is_active ?? true,
    notes: normalizedNotes,
  };

  const { data: inserted, error } = await supabase
    .from("students")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  if (path) revalidatePath(path);

  return inserted as Student;
}

type UpdateStudentData = Partial<
  Pick<Student, "full_name" | "phone" | "parent_phone" | "is_active" | "notes">
>;

export async function updateStudent(
  id: string,
  data: UpdateStudentData,
  path?: string
) {
  const supabase = await createClient();

  // Prepare update payload with normalized values
  const updatePayload: UpdateStudentData = {};

  if (data.full_name !== undefined) {
    updatePayload.full_name = data.full_name.trim();
  }

  if (data.phone !== undefined) {
    // Convert empty string to null, normalize if provided
    updatePayload.phone = data.phone
      ? data.phone.trim() === ""
        ? null
        : normalizePhone(data.phone)
      : null;
  }

  if (data.parent_phone !== undefined) {
    // Convert empty string to null, normalize if provided
    updatePayload.parent_phone = data.parent_phone
      ? data.parent_phone.trim() === ""
        ? null
        : normalizePhone(data.parent_phone)
      : null;
  }

  if (data.is_active !== undefined) {
    updatePayload.is_active = data.is_active;
  }

  if (data.notes !== undefined) {
    updatePayload.notes =
      data.notes && data.notes.trim().length > 0 ? data.notes.trim() : null;
  }

  const { error } = await supabase
    .from("students")
    .update(updatePayload)
    .eq("id", id);
  if (error) throw error;
  if (path) revalidatePath(path);
}

export async function deleteStudent(id: string, path?: string) {
  const supabase = await createClient();

  const { data: activeEnrollments, error: enrollmentError } = await supabase
    .from("student_class_enrollments")
    .select(
      `
      id,
      status,
      classes ( name )
    `
    )
    .eq("student_id", id)
    .in("status", ["active", "trial"])
    .is("leave_date", null);

  if (enrollmentError) {
    throw new Error(
      `Không kiểm tra được tình trạng lớp của học sinh: ${enrollmentError.message}`
    );
  }

  if (activeEnrollments && activeEnrollments.length > 0) {
    const classNames = activeEnrollments
      .map((enrollment) => {
        const cls = Array.isArray(enrollment.classes)
          ? enrollment.classes[0]
          : enrollment.classes;
        return cls?.name;
      })
      .filter(Boolean)
      .join(", ");

    throw new Error(
      classNames && classNames.length > 0
        ? `Không thể xóa học sinh đang học lớp: ${classNames}`
        : "Không thể xóa học sinh đang được xếp lớp. Vui lòng cho học sinh nghỉ lớp trước."
    );
  }

  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error(`Lỗi khi xóa học sinh: ${error.message}`);
  if (path) revalidatePath(path);
}

export async function updateStudentFromForm(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const is_active_raw = String(formData.get("is_active") || "");
  const path = String(formData.get("path") || "/admin/students");

  if (!id) return;

  const payload: UpdateStudentData = {};
  if (full_name) payload.full_name = full_name;
  if (phone) payload.phone = phone;
  payload.notes = notes || null;
  if (is_active_raw) payload.is_active = is_active_raw === "true";

  await updateStudent(id, payload, path);
}

/**
 * Get a single student by ID with full enrollment and status information
 */
export async function getStudentById(
  studentId: string
): Promise<StudentWithClassSummary | null> {
  // Use getStudents with query by student ID (query by name won't work, so we query all and filter)
  // For efficiency, we can query directly by ID, but to reuse existing logic, we use getStudents
  const students = await getStudents("", {
    limit: 10000,
    offset: 0,
  });
  const student = students.find((s) => s.id === studentId);
  return student || null;
}

/**
 * Get all current classes a student is enrolled in (active or trial, not left)
 */
export async function getStudentCurrentClasses(studentId: string): Promise<
  Array<{
    enrollmentId: string;
    classId: string;
    className: string;
    daysOfWeek: Array<{
      day: number;
      start_time: string;
      end_time?: string;
    }>;
    durationMinutes: number;
    enrollmentDate: string;
    status: "trial" | "active" | "inactive";
  }>
> {
  const supabase = await createClient();

  const { data: enrollments, error } = await supabase
    .from("student_class_enrollments")
    .select(
      `
      id,
      class_id,
      enrollment_date,
      status,
      classes(id, name, days_of_week, duration_minutes, is_active)
    `
    )
    .eq("student_id", studentId)
    .in("status", ["active", "trial"])
    .is("leave_date", null);

  if (error) throw error;
  if (!enrollments || enrollments.length === 0) return [];

  return enrollments
    .filter((e) => {
      const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
      return classData?.is_active === true;
    })
    .map((e) => {
      const classData = Array.isArray(e.classes) ? e.classes[0] : e.classes;
      return {
        enrollmentId: e.id,
        classId: e.class_id,
        className: classData?.name || "",
        daysOfWeek: toArray<{
          day: number;
          start_time: string;
          end_time?: string;
        }>(classData?.days_of_week || []),
        durationMinutes: Number(classData?.duration_minutes || 0),
        enrollmentDate: e.enrollment_date,
        status: e.status as "trial" | "active" | "inactive",
      };
    });
}

/**
 * Import students from Excel file
 * @param students Array of student data to import
 * @param path Optional path to revalidate after import
 * @returns Result with success count and errors
 */
export async function importStudentsFromExcel(
  students: Array<{ full_name: string; phone: string; rowIndex?: number }>,
  path?: string,
  options?: { skipDuplicateCheck?: boolean }
): Promise<{
  success: number;
  errors: Array<{ row: number; errors: string[] }>;
  studentIds: Array<{ rowIndex: number; studentId: string }>;
  duplicates?: Array<{
    rowIndex: number;
    full_name: string;
    phone: string | null;
  }>;
}> {
  const supabase = await createClient();

  if (students.length === 0) {
    return { success: 0, errors: [], studentIds: [] };
  }

  // Normalize all phone numbers first to ensure consistency
  const normalizedStudents = students.map((s) => {
    const normalizedPhone = normalizePhone(s.phone);
    const phone =
      normalizedPhone && normalizedPhone.length > 0 ? normalizedPhone : null;

    return {
      ...s,
      phone,
    };
  });

  const duplicates: Array<{
    rowIndex: number;
    full_name: string;
    phone: string | null;
  }> = [];
  const toInsert: Array<{
    full_name: string;
    phone: string | null;
    parent_phone: string | null;
    is_active: boolean;
  }> = [];

  const errors: Array<{ row: number; errors: string[] }> = [];

  // Check duplicates if not skipping
  if (!options?.skipDuplicateCheck) {
    for (const student of normalizedStudents) {
      try {
        const existing = await checkDuplicateStudent(
          student.full_name.trim(),
          student.phone
        );
        if (existing) {
          duplicates.push({
            rowIndex: student.rowIndex ?? 0,
            full_name: student.full_name.trim(),
            phone: student.phone,
          });
        } else {
          toInsert.push({
            full_name: student.full_name.trim(),
            phone: student.phone,
            parent_phone: student.phone,
            is_active: true,
          });
        }
      } catch (error) {
        console.error(
          `Error checking duplicate for row ${student.rowIndex}:`,
          error
        );
        // If check fails, still add to insert list
        toInsert.push({
          full_name: student.full_name.trim(),
          phone: student.phone,
          parent_phone: student.phone,
          is_active: true,
        });
      }
    }
  } else {
    // Skip duplicate check, add all
    normalizedStudents.forEach((student) => {
      toInsert.push({
        full_name: student.full_name.trim(),
        phone: student.phone,
        parent_phone: student.phone,
        is_active: true,
      });
    });
  }

  if (toInsert.length === 0) {
    return {
      success: 0,
      errors,
      studentIds: [],
      duplicates: duplicates.length > 0 ? duplicates : undefined,
    };
  }

  // Bulk insert and return inserted rows with IDs
  const { data: inserted, error } = await supabase
    .from("students")
    .insert(toInsert)
    .select("id");

  if (error) {
    throw new Error(`Lỗi khi import học sinh: ${error.message}`);
  }

  // Map rowIndex to studentId
  // Need to map inserted students back to original rowIndex
  const studentIds: Array<{ rowIndex: number; studentId: string }> = [];
  if (inserted && inserted.length > 0) {
    // Create a map of students that were inserted (not duplicates)
    let insertIndex = 0;
    normalizedStudents.forEach((student) => {
      // Only map if this student was inserted (not duplicate)
      const isDuplicate = duplicates.some(
        (d) => d.rowIndex === (student.rowIndex ?? 0)
      );
      if (!isDuplicate && inserted[insertIndex]?.id) {
        studentIds.push({
          rowIndex: student.rowIndex ?? 0,
          studentId: inserted[insertIndex].id as string,
        });
        insertIndex++;
      }
    });
  }

  if (path) revalidatePath(path);

  return {
    success: toInsert.length,
    errors,
    studentIds,
    duplicates: duplicates.length > 0 ? duplicates : undefined,
  };
}
