-- =============================================================================
-- PLAN 2: Single RPC for scoring + allow trigger-nested points updates
-- =============================================================================
-- Goals:
--   1) submit_quiz_attempt now also returns correct_option so the Quiz UI
--      can render the right/wrong highlight from a single round-trip
--      (no follow-up `check_answer` call).
--   2) profiles_self_update_guard previously blocked any self-update of
--      total_points. Since W_DOUBLE local load uses W_DOUBLE path that
--      triggered nested profile updates blocked by this guard, we let
--      nested-trigger updates through (depth > 1 means some other
--      trigger is updating profiles; we trust those).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Reworked submit_quiz_attempt: returns correct_option too.
--    On idempotent hit (same client_id seen before) we re-select
--    correct_option from the original question so the UI always has
--    the full payload.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_question_id  UUID,
  p_selected     CHAR(1),
  p_client_id    TEXT
)
RETURNS TABLE (
  attempt_id     UUID,
  is_correct     BOOLEAN,
  points_earned  INTEGER,
  correct_option CHAR(1)
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
  SELECT a.id, a.is_correct, a.points_earned, q.correct_option
    INTO v_attempt_id, v_is_correct, v_earned, v_correct
    FROM public.quiz_attempts a
    JOIN public.questions q ON q.id = a.question_id
   WHERE a.client_id = p_client_id;

  IF v_attempt_id IS NOT NULL THEN
    RETURN QUERY SELECT v_attempt_id, v_is_correct, v_earned, upper(v_correct)::char(1);
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

  v_is_correct := (upper(p_selected) = upper(v_correct));
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
    SELECT a.id, a.is_correct, a.points_earned, q.correct_option
      INTO v_attempt_id, v_is_correct, v_earned, v_correct
      FROM public.quiz_attempts a
      JOIN public.questions q ON q.id = a.question_id
     WHERE a.client_id = p_client_id;
  END;

  RETURN QUERY SELECT v_attempt_id, v_is_correct, v_earned, upper(v_correct)::char(1);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(UUID, CHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(UUID, CHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(UUID, CHAR, TEXT) TO service_role;

-- App clients must score via submit_quiz_attempt (SECURITY DEFINER), not
-- direct INSERT (which could set is_correct / points_earned arbitrarily).
-- Dashboards keep SELECT; the RPC owner still inserts.
REVOKE INSERT ON public.quiz_attempts FROM authenticated;
GRANT SELECT ON public.quiz_attempts TO authenticated;

-- -----------------------------------------------------------------------------
-- 2) profiles_self_update_guard: allow nested-trigger updates to change
--    total_points. Depth > 1 means some OTHER trigger is updating the
--    profile row (server-side scoring pipeline); we trust those callers.
--    Direct client updates (depth = 1, auth.uid() = NEW.id) still have
--    total_points / is_active / email reverted to OLD values.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_self_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Let nested trigger cascades through (server-side scoring, bulk loads).
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.id THEN
    -- self-update from the authenticated user: enforce that protected
    -- columns stay equal to OLD.
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
