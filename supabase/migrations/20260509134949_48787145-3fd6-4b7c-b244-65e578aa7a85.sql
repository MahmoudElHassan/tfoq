ALTER TABLE public.quiz_attempts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_attempts;