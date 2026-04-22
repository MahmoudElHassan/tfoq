
-- ============================================
-- LEARNING MANAGEMENT MIGRATION
-- ============================================

-- Visibility enum: private to teacher, shared with subject teachers, or public to all teachers
DO $$ BEGIN
  CREATE TYPE public.content_visibility AS ENUM ('private', 'subject', 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.game_type AS ENUM ('wheel', 'memory');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.game_content_kind AS ENUM ('mcq', 'concept');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 1) QUIZ TEMPLATES (Mock Tests Library)
-- ============================================
CREATE TABLE IF NOT EXISTS public.quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  visibility public.content_visibility NOT NULL DEFAULT 'private',
  duration_minutes integer DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quiz_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.quiz_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option char(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  explanation text,
  points integer NOT NULL DEFAULT 10,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qt_subject ON public.quiz_templates(subject_id);
CREATE INDEX IF NOT EXISTS idx_qt_creator ON public.quiz_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_qtq_template ON public.quiz_template_questions(template_id);

ALTER TABLE public.quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_template_questions ENABLE ROW LEVEL SECURITY;

-- Helper: can the user access this content (own/admin/shared)
CREATE OR REPLACE FUNCTION public.can_access_content(
  _user_id uuid, _owner_id uuid, _subject_id uuid, _visibility public.content_visibility
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR _owner_id = _user_id
    OR (_visibility = 'public' AND public.has_role(_user_id, 'teacher'::app_role))
    OR (_visibility = 'subject' AND public.has_role(_user_id, 'teacher'::app_role)
         AND public.teacher_has_subject(_user_id, _subject_id))
$$;

-- quiz_templates policies
CREATE POLICY "qt_select" ON public.quiz_templates FOR SELECT TO authenticated
USING (public.can_access_content(auth.uid(), created_by, subject_id, visibility));

CREATE POLICY "qt_insert" ON public.quiz_templates FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'teacher'::app_role) AND public.teacher_has_subject(auth.uid(), subject_id))
  )
);

CREATE POLICY "qt_update" ON public.quiz_templates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "qt_delete" ON public.quiz_templates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- quiz_template_questions policies (delegate to parent template)
CREATE POLICY "qtq_select" ON public.quiz_template_questions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quiz_templates t
  WHERE t.id = template_id
    AND public.can_access_content(auth.uid(), t.created_by, t.subject_id, t.visibility)
));

CREATE POLICY "qtq_modify" ON public.quiz_template_questions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quiz_templates t
  WHERE t.id = template_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR t.created_by = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quiz_templates t
  WHERE t.id = template_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR t.created_by = auth.uid())
));

-- ============================================
-- 2) GAMES (Wheel + Memory)
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  game_type public.game_type NOT NULL,
  content_kind public.game_content_kind NOT NULL DEFAULT 'mcq',
  visibility public.content_visibility NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- For 'mcq': use question_text/options/correct_option (front=question, back=correct option text)
-- For 'concept': use front_text (term) + back_text (definition); options nullable
CREATE TABLE IF NOT EXISTS public.learning_game_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.learning_games(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  -- MCQ fields
  question_text text,
  option_a text, option_b text, option_c text, option_d text,
  correct_option char(1),
  -- Concept fields
  front_text text,
  back_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lg_subject ON public.learning_games(subject_id);
CREATE INDEX IF NOT EXISTS idx_lg_creator ON public.learning_games(created_by);
CREATE INDEX IF NOT EXISTS idx_lgi_game ON public.learning_game_items(game_id);

ALTER TABLE public.learning_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_game_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lg_select" ON public.learning_games FOR SELECT TO authenticated
USING (public.can_access_content(auth.uid(), created_by, subject_id, visibility));

CREATE POLICY "lg_insert" ON public.learning_games FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'teacher'::app_role) AND public.teacher_has_subject(auth.uid(), subject_id))
  )
);

CREATE POLICY "lg_update" ON public.learning_games FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "lg_delete" ON public.learning_games FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "lgi_select" ON public.learning_game_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.learning_games g
  WHERE g.id = game_id
    AND public.can_access_content(auth.uid(), g.created_by, g.subject_id, g.visibility)
));

CREATE POLICY "lgi_modify" ON public.learning_game_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.learning_games g
  WHERE g.id = game_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR g.created_by = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.learning_games g
  WHERE g.id = game_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR g.created_by = auth.uid())
));

-- ============================================
-- 3) VIDEOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  youtube_id text NOT NULL,
  duration_seconds integer DEFAULT 0,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  visibility public.content_visibility NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.learning_videos(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  watched_seconds integer NOT NULL DEFAULT 0,
  completed_half boolean NOT NULL DEFAULT false,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lv_subject ON public.learning_videos(subject_id);
CREATE INDEX IF NOT EXISTS idx_lv_creator ON public.learning_videos(created_by);
CREATE INDEX IF NOT EXISTS idx_vv_video ON public.video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_vv_student ON public.video_views(student_id);

ALTER TABLE public.learning_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Students can also view videos (any authenticated can see videos accessible to teachers OR they are students viewing public/subject content)
-- Simplest: any authenticated can view videos (UI restricts), but mutations restricted.
CREATE POLICY "lv_select_teachers_admins" ON public.learning_videos FOR SELECT TO authenticated
USING (
  public.can_access_content(auth.uid(), created_by, subject_id, visibility)
  OR public.has_role(auth.uid(), 'student'::app_role)
);

CREATE POLICY "lv_insert" ON public.learning_videos FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (public.has_role(auth.uid(), 'teacher'::app_role) AND public.teacher_has_subject(auth.uid(), subject_id))
  )
);

CREATE POLICY "lv_update" ON public.learning_videos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "lv_delete" ON public.learning_videos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- video_views policies
CREATE POLICY "vv_student_insert" ON public.video_views FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "vv_student_update" ON public.video_views FOR UPDATE TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "vv_student_select" ON public.video_views FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "vv_admin_select" ON public.video_views FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "vv_teacher_select" ON public.video_views FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.learning_videos v
  WHERE v.id = video_id
    AND (v.created_by = auth.uid()
         OR public.teacher_has_subject(auth.uid(), v.subject_id))
));

CREATE POLICY "vv_parent_select" ON public.video_views FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.parent_student_links l
  WHERE l.parent_id = auth.uid() AND l.student_id = video_views.student_id
));

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_qt_updated ON public.quiz_templates;
CREATE TRIGGER trg_qt_updated BEFORE UPDATE ON public.quiz_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_lg_updated ON public.learning_games;
CREATE TRIGGER trg_lg_updated BEFORE UPDATE ON public.learning_games
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_lv_updated ON public.learning_videos;
CREATE TRIGGER trg_lv_updated BEFORE UPDATE ON public.learning_videos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
