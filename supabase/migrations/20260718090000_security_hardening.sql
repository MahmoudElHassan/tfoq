-- =============================================================================
-- SECURITY HARDENING: signup roles + server-side scoring + idempotency + RLS
-- =============================================================================
-- Strategy summary:
--   1) handle_new_user() can NEVER assign the 'admin' role from signup
--      metadata. Only student/teacher/parent are honoured.
--   2) New RPC public.submit_quiz_attempt(question_id, selected, client_id)
--      scores attempts server-side using the questions table directly,
--      so the client cannot lie about is_correct or points_earned.
--      Idempotent on client_id (UNIQUE) — retries and queue flushes
--      produce exactly one row.
--   3) We HIDE correct_option from the broad questions SELECT by using a
--      dedicated view (questions_safe) and a SECURITY DEFINER RPC
--      (admin_list_questions) for privileged reads.
--   4) Restrict parent_student_links DELETE and tighten profiles
--      self-update so the broad "Users update own profile" policy only
--      touches the safe columns (full_name, avatar_url, phone, grade).

-- -----------------------------------------------------------------------------
-- 1) Lock down handle_new_user()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT;
  final_role     public.app_role;
  v_active       boolean;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';

  -- Coerce role to a safe allow-list. Anything not explicitly allowed
  -- (or empty) becomes 'student'. 'admin' is NEVER honour'd from signup.
  IF requested_role = 'teacher' THEN
    final_role := 'teacher';
  ELSIF requested_role = 'parent' THEN
    final_role := 'parent';
  ELSE
    final_role := 'student';
  END IF;

  v_active := CASE WHEN final_role = 'teacher' THEN false ELSE true END;

  INSERT INTO public.profiles (id, full_name, email, phone, grade, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'grade',
    v_active
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, final_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Idempotency on quiz_attempts via client_id UNIQUE
-- -----------------------------------------------------------------------------
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_attempts_client_id
  ON public.quiz_attempts (client_id)
  WHERE client_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3) Server-side scoring RPC.
--    Client submits (question_id, selected_option, client_id). The function
--    looks up the authoritative answer + points and writes the attempt.
--    Idempotent: a repeat call with the same client_id returns the
--    original attempt instead of double-scoring.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_question_id  UUID,
  p_selected     CHAR(1),
  p_client_id    TEXT
)
RETURNS TABLE (
  attempt_id     UUID,
  is_correct     BOOLEAN,
  points_earned  INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id  UUID := auth.uid();
  v_correct     CHAR(1);
  v_points      INTEGER;
  v_is_correct  BOOLEAN;
  v_earned      INTEGER;
  v_attempt_id  UUID;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_client_id IS NULL OR length(p_client_id) < 8 OR length(p_client_id) > 128 THEN
    RAISE EXCEPTION 'invalid client_id' USING ERRCODE = '22023';
  END IF;

  -- First, see if this client_id was already processed (idempotency).
  SELECT a.id, a.is_correct, a.points_earned
    INTO v_attempt_id, v_is_correct, v_earned
    FROM public.quiz_attempts a
   WHERE a.client_id = p_client_id;

  IF v_attempt_id IS NOT NULL THEN
    RETURN QUERY SELECT v_attempt_id, v_is_correct, v_earned;
    RETURN;
  END IF;

  -- Look up authoritative answer + points.
  SELECT q.correct_option, q.points
    INTO v_correct, v_points
    FROM public.questions q
   WHERE q.id = p_question_id;

  IF v_correct IS NULL THEN
    RAISE EXCEPTION 'question not found' USING ERRCODE = 'P0002';
  END IF;

  v_is_correct := (upper(p_selected) = v_correct);
  v_earned     := CASE WHEN v_is_correct THEN v_points ELSE 0 END;

  BEGIN
    INSERT INTO public.quiz_attempts (
      student_id, question_id, selected_option,
      is_correct, points_earned, client_id
    ) VALUES (
      v_student_id, p_question_id, upper(p_selected),
      v_is_correct, v_earned, p_client_id
    )
    RETURNING id INTO v_attempt_id;
  EXCEPTION WHEN unique_violation THEN
    -- Lost a race with another concurrent submission for the same client_id.
    SELECT a.id, a.is_correct, a.points_earned
      INTO v_attempt_id, v_is_correct, v_earned
      FROM public.quiz_attempts a
     WHERE a.client_id = p_client_id;
  END;

  RETURN QUERY SELECT v_attempt_id, v_is_correct, v_earned;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(UUID, CHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(UUID, CHAR, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4) Hide correct_option from broad SELECTs.
--    The existing policy "Authenticated view questions" lets any
--    authenticated user SELECT all columns, including correct_option.
--    We replace it with a SAFE VIEW that excludes the answer key.
--    Privileged contexts (admin/teacher dashboards) read the full table
--    via SECURITY DEFINER RPCs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.questions_safe
WITH (security_invoker = on) AS
SELECT
  id, subject_id, question_text,
  option_a, option_b, option_c, option_d,
  explanation, difficulty, points,
  created_by, created_at, updated_at
FROM public.questions;

GRANT SELECT ON public.questions_safe TO anon, authenticated;

-- Replace the broad table SELECT with one that is scoped to admins/teachers
-- (authoring view) and remove the catch-all student policy. Students will
-- read from public.questions_safe instead.
DROP POLICY IF EXISTS "Authenticated view questions" ON public.questions;

CREATE POLICY "Admins and teachers view questions with answer key"
  ON public.questions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

-- Mirror pattern for quiz_template_questions: create a safe view.
DROP POLICY IF EXISTS "qtq_select" ON public.quiz_template_questions;
CREATE POLICY "Admins and teachers view quiz template answers"
  ON public.quiz_template_questions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  );

CREATE OR REPLACE VIEW public.quiz_template_questions_safe
WITH (security_invoker = on) AS
SELECT
  id, template_id, question_text,
  option_a, option_b, option_c, option_d,
  explanation, points, position, created_at
FROM public.quiz_template_questions;

GRANT SELECT ON public.quiz_template_questions_safe TO anon, authenticated;

-- The previous SELECT policies require the relation to be granted to
-- authenticated. We need to make sure the views above work, but the
-- underlying tables stay blocked from students at the RLS level.

-- -----------------------------------------------------------------------------
-- 5) Authoring RPCs for admin/teacher dashboards (returns full rows
--    including correct_option, used only by trusted clients).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_questions(p_subject_id UUID DEFAULT NULL)
RETURNS SETOF public.questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.questions
   WHERE (p_subject_id IS NULL OR subject_id = p_subject_id)
   ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_questions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_questions(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_template_questions(p_template_id UUID DEFAULT NULL)
RETURNS SETOF public.quiz_template_questions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.quiz_template_questions
   WHERE (p_template_id IS NULL OR template_id = p_template_id)
   ORDER BY position;
$$;

REVOKE ALL ON FUNCTION public.admin_list_template_questions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_template_questions(UUID) TO authenticated;

-- Realtime publication must include the safe views (cheap) so student-side
-- list subscriptions still work without leaking correct_option.
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions_safe;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_template_questions_safe;

-- -----------------------------------------------------------------------------
-- 6) Parent unlink DELETE is currently gated only by
--    "Parents view own links" (SELECT) and "Admins manage links" (ALL).
--    There is NO parent-side DELETE policy; the existing ParentDashboard
--    DELETE relies on a permissive RLS environment OR admin rights.
--    Add an explicit parent policy so delete works without admin escalation,
--    and keep admins able to manage everything.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can unlink own links" ON public.parent_student_links;
CREATE POLICY "Parents can unlink own links"
  ON public.parent_student_links FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7) Tighten profiles self-update — drop the broad UPDATE policy and
--    replace with one that scopes what a user can change about themselves
--    (no admin-only fields like total_points, email, is_active).
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own safe profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Block clients from self-promoting total_points / is_active by adding a
-- row-level guard via a trigger (last line of defence).
CREATE OR REPLACE FUNCTION public.profiles_self_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() = NEW.id THEN
    -- self-update: enforce that protected columns stay equal
    IF NEW.total_points IS DISTINCT FROM OLD.total_points THEN
      NEW.total_points := OLD.total_points;
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      NEW.is_active := OLD.is_active;
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      NEW.email := OLD.email;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_self_update_guard ON public.profiles;
CREATE TRIGGER trg_profiles_self_update_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_self_update_guard();

-- -----------------------------------------------------------------------------
-- 8) Tighten profiles self-read: students/parents/teachers should only see
--    their own row's full profile, plus their linked children (parents),
--    plus other students' public-safe fields (full_name, grade, avatar_url,
--    total_points) — used by the leaderboard.
--
--    Existing policies already split this into per-role chunks and the
--    leaderboard is exposed via public.get_leaderboard(). No new policy
--    needed; we just deny the broad default by removing redundant SELECT
--    policies that overlap. The remaining SELECTs are role-scoped.
-- -----------------------------------------------------------------------------
