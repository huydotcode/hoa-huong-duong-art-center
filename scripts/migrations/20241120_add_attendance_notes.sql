-- Add notes column to attendance table
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.attendance.notes IS 'Ghi chú cho từng lần điểm danh';

