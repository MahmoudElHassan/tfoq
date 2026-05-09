-- فهرس على وقت الإجابة (DESC للترتيب من الأحدث)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempted_at
  ON public.quiz_attempts (attempted_at DESC);

-- فهرس مركّب: إجابات طالبة معيّنة مرتّبة بالوقت
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_time
  ON public.quiz_attempts (student_id, attempted_at DESC);

-- فهرس مركّب: تسريع البحث عن إجابة طالبة لسؤال محدّد
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_question
  ON public.quiz_attempts (student_id, question_id);

-- فهرس جزئي للإجابات الصحيحة فقط (يقلّل حجم الفهرس ويسرّع العدّ)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_correct_time
  ON public.quiz_attempts (attempted_at DESC)
  WHERE is_correct = true;

-- فهرس على نقاط الطالبات لتسريع لوحة الترتيب
CREATE INDEX IF NOT EXISTS idx_profiles_total_points
  ON public.profiles (total_points DESC)
  WHERE is_active = true;