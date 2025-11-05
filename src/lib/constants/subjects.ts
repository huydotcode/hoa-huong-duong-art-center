/**
 * Constants for subjects/courses
 */

export const SUBJECTS = [
  "Piano",
  "Trống",
  "Vẽ",
  "Múa",
  "Guitar",
  "Nhảy",
  "Ballet",
] as const;

export type Subject = (typeof SUBJECTS)[number];
