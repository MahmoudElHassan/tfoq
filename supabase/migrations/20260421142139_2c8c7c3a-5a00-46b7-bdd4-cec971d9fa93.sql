
-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'parent', 'student');
CREATE TYPE public.subject_type AS ENUM ('tahseeli', 'qudurat');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- ===== profiles =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  grade TEXT,
  avatar_url TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== user_roles =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== subjects =====
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type subject_type NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- ===== questions =====
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  explanation TEXT,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  points INTEGER NOT NULL DEFAULT 10,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- ===== quiz_attempts =====
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option CHAR(1) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attempts_student ON public.quiz_attempts(student_id);

-- ===== parent_student_links =====
CREATE TABLE public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- ===== Trigger: auto-create profile + default role on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, grade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'grade'
  );

  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, user_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Trigger: update points on attempt =====
CREATE OR REPLACE FUNCTION public.update_student_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE public.profiles SET total_points = total_points + NEW.points_earned, updated_at = now()
    WHERE id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_attempt_created
AFTER INSERT ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_student_points();

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER questions_touch BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users view leaderboard" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(id, 'student'));
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Parents view linked students" ON public.profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = profiles.id)
);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- subjects (public read for authenticated)
CREATE POLICY "Anyone authenticated views subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- questions
CREATE POLICY "Authenticated view questions" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers insert questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Teachers update own questions" ON public.questions FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Teachers delete own questions" ON public.questions FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- quiz_attempts
CREATE POLICY "Students view own attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students insert own attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Parents view child attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parent_student_links WHERE parent_id = auth.uid() AND student_id = quiz_attempts.student_id)
);
CREATE POLICY "Admins view all attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers view all attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- parent_student_links
CREATE POLICY "Parents view own links" ON public.parent_student_links FOR SELECT TO authenticated USING (parent_id = auth.uid());
CREATE POLICY "Students view own links" ON public.parent_student_links FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Admins manage links" ON public.parent_student_links FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parents create own links" ON public.parent_student_links FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid());

-- ===== Seed subjects =====
INSERT INTO public.subjects (name, type, description, icon) VALUES
  ('فيزياء', 'tahseeli', 'تحصيلي - فيزياء', 'Atom'),
  ('كيمياء', 'tahseeli', 'تحصيلي - كيمياء', 'FlaskConical'),
  ('أحياء', 'tahseeli', 'تحصيلي - أحياء', 'Dna'),
  ('رياضيات', 'tahseeli', 'تحصيلي - رياضيات', 'Sigma'),
  ('قدرات كمي', 'qudurat', 'القدرات - الجزء الكمي', 'Calculator'),
  ('قدرات لفظي', 'qudurat', 'القدرات - الجزء اللفظي', 'Languages');
