-- =============================================================================
-- تفعيل حصص المساعد الذكي — انسخ هذا الملف كاملاً والصقه في Supabase SQL Editor
-- آمن للتشغيل أكثر من مرة (يستخدم IF NOT EXISTS / CREATE OR REPLACE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.chatbot_ai_usage (
  usage_day date NOT NULL,
  subject_key text NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('guest', 'user')),
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  last_request_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usage_day, subject_key)
);

CREATE INDEX IF NOT EXISTS idx_chatbot_ai_usage_updated_at
  ON public.chatbot_ai_usage (updated_at);

ALTER TABLE public.chatbot_ai_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_chatbot_ai_quota(
  p_subject_key text,
  p_subject_type text,
  p_daily_limit integer,
  p_cooldown_seconds integer DEFAULT 4
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  remaining integer,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (timezone('utc', now()))::date;
  v_row public.chatbot_ai_usage%ROWTYPE;
  v_now timestamptz := timezone('utc', now());
  v_elapsed numeric;
BEGIN
  IF p_subject_key IS NULL OR length(trim(p_subject_key)) = 0 THEN
    RAISE EXCEPTION 'subject_key required';
  END IF;
  IF p_subject_type IS NULL OR p_subject_type NOT IN ('guest', 'user') THEN
    RAISE EXCEPTION 'invalid subject_type';
  END IF;
  IF p_daily_limit IS NULL OR p_daily_limit < 1 OR p_daily_limit > 100 THEN
    RAISE EXCEPTION 'daily_limit must be between 1 and 100';
  END IF;
  IF p_cooldown_seconds IS NULL OR p_cooldown_seconds < 0 OR p_cooldown_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid cooldown';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_subject_key || v_day::text, 0));

  SELECT * INTO v_row
  FROM public.chatbot_ai_usage
  WHERE usage_day = v_day AND subject_key = p_subject_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.chatbot_ai_usage (
      usage_day, subject_key, subject_type, message_count, total_tokens, last_request_at, updated_at
    ) VALUES (
      v_day, p_subject_key, p_subject_type, 1, 0, v_now, v_now
    );
    allowed := true;
    reason := 'ok';
    remaining := greatest(p_daily_limit - 1, 0);
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_row.last_request_at IS NOT NULL THEN
    v_elapsed := extract(epoch FROM (v_now - v_row.last_request_at));
    IF v_elapsed < p_cooldown_seconds THEN
      allowed := false;
      reason := 'rate_limit';
      remaining := greatest(p_daily_limit - v_row.message_count, 0);
      retry_after_seconds := ceil(p_cooldown_seconds - v_elapsed)::integer;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  IF v_row.message_count >= p_daily_limit THEN
    allowed := false;
    reason := 'daily_limit';
    remaining := 0;
    retry_after_seconds := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.chatbot_ai_usage
  SET
    message_count = message_count + 1,
    last_request_at = v_now,
    updated_at = v_now,
    subject_type = p_subject_type
  WHERE usage_day = v_day AND subject_key = p_subject_key;

  allowed := true;
  reason := 'ok';
  remaining := greatest(p_daily_limit - (v_row.message_count + 1), 0);
  retry_after_seconds := 0;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_chatbot_ai_tokens(
  p_subject_key text,
  p_tokens integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (timezone('utc', now()))::date;
BEGIN
  IF p_subject_key IS NULL OR length(trim(p_subject_key)) = 0 THEN
    RETURN;
  END IF;
  IF p_tokens IS NULL OR p_tokens <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.chatbot_ai_usage
  SET
    total_tokens = total_tokens + p_tokens,
    updated_at = timezone('utc', now())
  WHERE usage_day = v_day AND subject_key = p_subject_key;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_chatbot_ai_quota(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_chatbot_ai_tokens(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_chatbot_ai_quota(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_chatbot_ai_tokens(text, integer) TO service_role;
