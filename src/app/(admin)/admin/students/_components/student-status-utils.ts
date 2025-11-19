import type {
  StudentAttendanceTodayStatus,
  StudentLearningStatus,
  StudentTuitionStatus,
} from "@/types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const TUITION_STATUS_MAP: Record<
  StudentTuitionStatus,
  { label: string; variant: BadgeVariant }
> = {
  paid: { label: "Đã đóng", variant: "default" },
  partial: { label: "Đóng một phần", variant: "secondary" },
  unpaid: { label: "Chưa đóng", variant: "destructive" },
  not_created: { label: "Chưa tạo", variant: "outline" },
};

const ATTENDANCE_STATUS_MAP: Record<
  StudentAttendanceTodayStatus,
  { label: string; variant: BadgeVariant }
> = {
  present: { label: "Có mặt", variant: "default" },
  absent: { label: "Vắng", variant: "destructive" },
  pending: { label: "Chưa điểm danh", variant: "secondary" },
  no_session: { label: "Không có lớp", variant: "outline" },
};

const DEFAULT_TUITION = TUITION_STATUS_MAP.not_created;
const DEFAULT_ATTENDANCE = ATTENDANCE_STATUS_MAP.no_session;
const DEFAULT_LEARNING_STATUS = {
  label: "Chưa có lớp",
  variant: "outline" as BadgeVariant,
};

const LEARNING_STATUS_MAP: Record<
  StudentLearningStatus,
  { label: string; variant: BadgeVariant }
> = {
  active: { label: "Đang học", variant: "default" },
  trial: { label: "Học thử", variant: "secondary" },
  inactive: { label: "Ngừng học", variant: "destructive" },
  no_class: DEFAULT_LEARNING_STATUS,
};

export function getTuitionStatusBadge(status?: StudentTuitionStatus): {
  label: string;
  variant: BadgeVariant;
} {
  if (!status) return DEFAULT_TUITION;
  return TUITION_STATUS_MAP[status] ?? DEFAULT_TUITION;
}

export function getAttendanceStatusBadge(
  status?: StudentAttendanceTodayStatus
): { label: string; variant: BadgeVariant } {
  if (!status) return DEFAULT_ATTENDANCE;
  return ATTENDANCE_STATUS_MAP[status] ?? DEFAULT_ATTENDANCE;
}

export function getLearningStatusBadge(status?: StudentLearningStatus): {
  label: string;
  variant: BadgeVariant;
} {
  if (!status) return DEFAULT_LEARNING_STATUS;
  return LEARNING_STATUS_MAP[status] ?? DEFAULT_LEARNING_STATUS;
}
