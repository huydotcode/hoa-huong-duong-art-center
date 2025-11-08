/**
 * Database types for the Piano Management System
 * Based on PostgreSQL schema in Supabase
 */

// ========== AUTH.USERS (Supabase Auth) ==========
export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  encrypted_password: string;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
  raw_app_meta_data: {
    role: "admin" | "teacher";
  };
  created_at: string;
  updated_at: string;
}

// ========== TEACHERS ==========
export interface Teacher {
  id: string;
  full_name: string;
  phone: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTeacherData {
  full_name: string;
  phone: string;
  password: string;
  notes?: string | null;
}

export interface UpdateTeacherData {
  full_name?: string;
  phone?: string;
  notes?: string | null;
  is_active?: boolean;
}

// ========== STUDENTS ==========
export interface Student {
  id: string;
  full_name: string;
  phone: string;
  parent_phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentData {
  full_name: string;
  phone: string;
  parent_phone: string;
}

export interface UpdateStudentData {
  full_name?: string;
  phone?: string;
  parent_phone?: string;
  is_active?: boolean;
}

// ========== CLASSES ==========
export interface ClassSchedule {
  day: number; // 0 = CN, 1 = T2, ..., 6 = T7
  start_time: string; // "08:00"
  end_time?: string; // "09:00" - optional, nếu không có thì tính từ duration_minutes
}

export interface Class {
  id: string;
  name: string;
  days_of_week: ClassSchedule[];
  duration_minutes: number;
  current_student_count: number;
  max_student_count: number;
  monthly_fee: number;
  salary_per_session: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClassData {
  name: string;
  days_of_week: ClassSchedule[];
  duration_minutes: number;
  max_student_count?: number;
  monthly_fee: number;
  salary_per_session: number;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface UpdateClassData {
  name?: string;
  days_of_week?: ClassSchedule[];
  duration_minutes?: number;
  max_student_count?: number;
  monthly_fee?: number;
  salary_per_session?: number;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

// ========== CLASS_TEACHERS ==========
export interface ClassTeacher {
  id: string;
  class_id: string;
  teacher_id: string;
  created_at: string;
}

export interface CreateClassTeacherData {
  class_id: string;
  teacher_id: string;
}

// ========== STUDENT_CLASS_ENROLLMENTS ==========
export type EnrollmentStatus = "trial" | "active" | "inactive";

export interface StudentClassEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  enrollment_date: string;
  leave_date: string | null;
  status: EnrollmentStatus;
  leave_reason: string | null;
  teacher_notes: string | null;
  score_1: number | null;
  score_2: number | null;
  score_3: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEnrollmentData {
  student_id: string;
  class_id: string;
  enrollment_date: string;
  status?: EnrollmentStatus;
}

export interface UpdateEnrollmentData {
  leave_date?: string;
  status?: EnrollmentStatus;
  leave_reason?: string;
  teacher_notes?: string;
  score_1?: number;
  score_2?: number;
  score_3?: number;
}

// ========== ATTENDANCE ==========
export type AttendanceMarkedBy = "teacher" | "admin";

export interface Attendance {
  id: string;
  class_id: string;
  student_id: string | null;
  teacher_id: string | null;
  attendance_date: string;
  is_present: boolean;
  marked_by: AttendanceMarkedBy;
  created_at: string;
}

export interface CreateAttendanceData {
  class_id: string;
  student_id?: string | null;
  teacher_id?: string | null;
  attendance_date: string;
  is_present: boolean;
  marked_by: AttendanceMarkedBy;
}

export interface UpdateAttendanceData {
  is_present?: boolean;
}

// ========== PAYMENT_STATUS ==========
export interface PaymentStatus {
  id: string;
  student_id: string;
  class_id: string;
  month: number;
  year: number;
  is_paid: boolean;
  amount: number | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentStatusData {
  student_id: string;
  class_id: string;
  month: number;
  year: number;
  amount?: number | null;
}

export interface UpdatePaymentStatusData {
  is_paid?: boolean;
  amount?: number | null;
  paid_at?: string;
}

// ========== EXPENSES ==========
export interface Expense {
  id: string;
  amount: number;
  reason: string;
  expense_date: string;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  amount: number;
  reason: string;
  expense_date: string;
  month: number;
  year: number;
}

export interface UpdateExpenseData {
  amount?: number;
  reason?: string;
  expense_date?: string;
  month?: number;
  year?: number;
}

// ========== RELATIONSHIP TYPES (JOIN RESULTS) ==========

export interface ClassListItem extends Class {
  teachers_count: number;
  students_count: number;
}

export interface ClassTeacherItem {
  assignment_id: string;
  start_date: string; // created_at của class_teachers, dùng làm ngày vào dạy
  teacher: Teacher;
}

export interface ClassStudentItem {
  enrollment_id: string;
  status: EnrollmentStatus;
  enrollment_date: string;
  student: Student;
}

export interface TeacherWithClasses extends Teacher {
  classes?: Class[];
  class_teachers?: ClassTeacher[];
}

export interface ClassWithTeachers extends Class {
  teachers?: Teacher[];
  class_teachers?: ClassTeacher[];
}

export interface ClassWithEnrollments extends Class {
  enrollments?: StudentClassEnrollment[];
  students?: Student[];
}

export interface StudentWithClasses extends Student {
  enrollments?: StudentClassEnrollment[];
  classes?: Class[];
}

export interface StudentClassEnrollmentWithDetails
  extends StudentClassEnrollment {
  student?: Student;
  class?: Class;
}

export interface AttendanceWithDetails extends Attendance {
  student?: Student;
  teacher?: Teacher;
  class?: Class;
}

// ========== STATISTICS & REPORTS ==========

export interface MonthlyStats {
  month: string; // Format: "MM/YYYY"
  newStudents: number;
  leftStudents: number;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface TeacherStats {
  teacher_id: string;
  teacher_name: string;
  total_sessions: number;
  total_salary: number;
  attendance_rate: number;
}

export interface ClassStats {
  class_id: string;
  class_name: string;
  total_students: number;
  active_students: number;
  total_revenue: number;
  attendance_rate: number;
}

export interface DashboardStats {
  teachers: number;
  students: number;
  classes: number;
}

// ========== TEACHER SALARY ==========

export interface TeacherSalaryDetail {
  classId: string;
  className: string;
  sessions: number; // Số buổi có mặt
  salaryPerSession: number;
  totalSalary: number; // sessions × salaryPerSession
}

export interface TeacherSalarySummary {
  teacherId: string;
  teacherName: string;
  phone: string;
  totalSessions: number; // Tổng số buổi dạy
  totalSalary: number; // Tổng lương
  details: TeacherSalaryDetail[]; // Chi tiết theo từng lớp
}
