ALTER TABLE public.questions ALTER COLUMN points SET DEFAULT 2;
ALTER TABLE public.quiz_template_questions ALTER COLUMN points SET DEFAULT 2;
UPDATE public.questions SET points = 2;
UPDATE public.quiz_template_questions SET points = 2;