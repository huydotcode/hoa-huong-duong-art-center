-- Add subject column to classes table
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_classes_subject ON public.classes(subject);

-- Add comment
COMMENT ON COLUMN public.classes.subject IS 'Môn học của lớp (Piano, Trống, Vẽ, Múa, Guitar, Nhảy, Ballet)';

