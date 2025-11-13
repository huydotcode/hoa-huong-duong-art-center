-- Schema bootstrap script for the Supabase project.
-- Run each section sequentially in the Supabase SQL editor when provisioning a fresh database.

-- =====================
-- Table definitions
-- =====================

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name character varying NOT NULL,
  phone character varying,
  parent_phone character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  days_of_week jsonb NOT NULL,
  duration_minutes integer NOT NULL,
  monthly_fee numeric NOT NULL,
  salary_per_session numeric NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  current_student_count integer NOT NULL DEFAULT 0 CHECK (current_student_count >= 0),
  max_student_count integer NOT NULL DEFAULT 20 CHECK (max_student_count >= 0),
  CHECK (current_student_count <= max_student_count)
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY,
  full_name character varying NOT NULL,
  phone character varying NOT NULL UNIQUE,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teachers_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.student_class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  enrollment_date date NOT NULL,
  leave_date date,
  status character varying NOT NULL DEFAULT 'trial'::character varying,
  leave_reason text,
  teacher_notes text,
  score_1 numeric,
  score_2 numeric,
  score_3 numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_class_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
  CONSTRAINT student_class_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.class_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT class_teachers_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes (id) ON DELETE CASCADE,
  CONSTRAINT class_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  student_id uuid,
  teacher_id uuid,
  attendance_date date NOT NULL,
  is_present boolean NOT NULL,
  marked_by character varying NOT NULL DEFAULT 'teacher'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  session_time character varying NOT NULL CHECK (session_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'::text),
  CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes (id) ON DELETE CASCADE,
  CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
  CONSTRAINT attendance_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.payment_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  amount numeric,
  CONSTRAINT payment_status_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE CASCADE,
  CONSTRAINT payment_status_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  reason text NOT NULL,
  expense_date date NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================
-- Row Level Security
-- =====================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_status DISABLE ROW LEVEL SECURITY;

-- Helper to read the current user's role from auth metadata
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  role text;
BEGIN
  SELECT raw_app_meta_data->>'role'
    INTO role
  FROM auth.users
  WHERE id = auth.uid();

  RETURN COALESCE(role, '');
END;
$$;

-- Replace existing policies to keep the script idempotent
DROP POLICY IF EXISTS "Allow full access for admin and teacher" ON public.teachers;
CREATE POLICY "Allow full access for admin and teacher"
ON public.teachers
FOR ALL
USING (public.get_user_role() IN ('admin', 'teacher'))
WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS "Allow full access for admin and teacher" ON public.class_teachers;
CREATE POLICY "Allow full access for admin and teacher"
ON public.class_teachers
FOR ALL
USING (public.get_user_role() IN ('admin', 'teacher'))
WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

DROP POLICY IF EXISTS "Allow full access for admin and teacher" ON public.expenses;
CREATE POLICY "Allow full access for admin and teacher"
ON public.expenses
FOR ALL
USING (public.get_user_role() IN ('admin', 'teacher'))
WITH CHECK (public.get_user_role() IN ('admin', 'teacher'));

-- =====================
-- Utility functions & triggers
-- =====================

CREATE OR REPLACE FUNCTION public.update_class_student_count(p_class_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.classes c
  SET current_student_count = (
        SELECT COUNT(*)
        FROM public.student_class_enrollments e
        WHERE e.class_id = p_class_id
          AND COALESCE(e.status, 'trial') <> 'inactive'
          AND e.leave_date IS NULL
      ),
      updated_at = now()
  WHERE c.id = p_class_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalc_class_student_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_class_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    affected_class_id := NEW.class_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.class_id IS DISTINCT FROM OLD.class_id THEN
      PERFORM public.update_class_student_count(OLD.class_id);
    END IF;
    affected_class_id := NEW.class_id;
  ELSIF TG_OP = 'DELETE' THEN
    affected_class_id := OLD.class_id;
  END IF;

  PERFORM public.update_class_student_count(affected_class_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_class_student_count ON public.student_class_enrollments;
CREATE TRIGGER trg_recalc_class_student_count
AFTER INSERT OR UPDATE OR DELETE ON public.student_class_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalc_class_student_count();

CREATE OR REPLACE FUNCTION public.enforce_class_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  capacity integer;
  current integer;
  target_class uuid;
  becomes_active boolean;
  was_active boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target_class := NEW.class_id;
    becomes_active := (COALESCE(NEW.status, 'trial') <> 'inactive') AND NEW.leave_date IS NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    target_class := NEW.class_id;
    becomes_active := (COALESCE(NEW.status, 'trial') <> 'inactive') AND NEW.leave_date IS NULL;
    was_active := (COALESCE(OLD.status, 'trial') <> 'inactive')
      AND OLD.leave_date IS NULL
      AND OLD.class_id = NEW.class_id;

    IF was_active AND becomes_active THEN
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  IF becomes_active THEN
    SELECT max_student_count, current_student_count
      INTO capacity, current
    FROM public.classes
    WHERE id = target_class;

    IF capacity IS NOT NULL AND current >= capacity THEN
      RAISE EXCEPTION 'Class % is full (%/%).', target_class, current, capacity
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_class_capacity ON public.student_class_enrollments;
CREATE TRIGGER trg_enforce_class_capacity
BEFORE INSERT OR UPDATE ON public.student_class_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_class_capacity();

-- =====================
-- Additional indexes
-- =====================

CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_class_student_date_session
  ON public.attendance (class_id, student_id, attendance_date, session_time)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_status_student_id_class_id_month_year_key
  ON public.payment_status (student_id, class_id, month, year);