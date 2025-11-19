import type { StudentLearningStatus } from "@/types";

export const STUDENT_LEARNING_STATUS_FILTERS: Array<{
  value: StudentLearningStatus;
  label: string;
  description: string;
}> = [
  {
    value: "active",
    label: "Đang học",
    description: "Đang tham gia ít nhất một lớp hoạt động",
  },
  {
    value: "trial",
    label: "Học thử",
    description: "Đang trong giai đoạn học thử",
  },
  {
    value: "inactive",
    label: "Ngừng học",
    description: "Đã có lớp trước đây nhưng hiện không tham gia",
  },
  {
    value: "no_class",
    label: "Chưa có lớp",
    description: "Chưa được xếp vào lớp nào",
  },
];
