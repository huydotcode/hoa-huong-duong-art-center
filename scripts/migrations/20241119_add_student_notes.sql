-- Add notes column to students table
ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS notes text;

