CREATE TABLE public.semesters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  level text,
  term text,
  start_date date,
  weeks integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semesters TO authenticated;
GRANT ALL ON public.semesters TO service_role;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own semesters" ON public.semesters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.semester_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  title text NOT NULL,
  code text,
  credit_units integer NOT NULL DEFAULT 3,
  notebook_id uuid,
  material_ids uuid[] NOT NULL DEFAULT '{}',
  completed_weeks integer[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.semester_courses TO authenticated;
GRANT ALL ON public.semester_courses TO service_role;
ALTER TABLE public.semester_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own semester courses" ON public.semester_courses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX semester_courses_semester_idx ON public.semester_courses (semester_id);

CREATE TABLE public.course_roadmaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL UNIQUE REFERENCES public.semester_courses(id) ON DELETE CASCADE,
  overview text NOT NULL DEFAULT '',
  prerequisites jsonb NOT NULL DEFAULT '[]',
  weeks jsonb NOT NULL DEFAULT '[]',
  exam_tips jsonb NOT NULL DEFAULT '[]',
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_roadmaps TO authenticated;
GRANT ALL ON public.course_roadmaps TO service_role;
ALTER TABLE public.course_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own course roadmaps" ON public.course_roadmaps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER semesters_updated_at BEFORE UPDATE ON public.semesters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER semester_courses_updated_at BEFORE UPDATE ON public.semester_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();