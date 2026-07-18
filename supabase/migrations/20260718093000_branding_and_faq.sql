-- =============================================================================
-- BRANDING: admin-only theme + logo (Plan A: white-label per deployment)
-- =============================================================================
-- Stores the applied brand in a dedicated site_content row id='branding'.
-- The shape includes theme_id + optional primary/accent overrides that can
-- later gain a school_id column without rewriting the UI (Plan B hook).
-- Storage bucket site-images already has admin-only write policies; we add
-- a 'branding/' prefix convention by relying on those same policies.

-- Seed the branding row with the existing MoE green defaults. The admin
-- editor can change every field. Theme presets are defined in code
-- (src/lib/themes.ts) and only theme_id is stored here.
INSERT INTO public.site_content (id, content)
VALUES ('branding', '{
  "logo_url": "",
  "brand_name": "منصة تفوّق",
  "theme_id": "moe-green",
  "primary": null,
  "accent": null
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed FAQ table for Phase 3 (admin-editable FAQ entries)
CREATE TABLE IF NOT EXISTS public.faq_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_active_sort ON public.faq_entries (is_active, sort_order);

ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can read active entries (used by the floating chatbot on /
-- public site). Inactive entries are admin-only.
CREATE POLICY "Anyone can read active FAQs"
  ON public.faq_entries FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins read all FAQs"
  ON public.faq_entries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage FAQs"
  ON public.faq_entries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER faq_entries_touch_updated_at
  BEFORE UPDATE ON public.faq_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- updated_at trigger must exist before we reference it (it does, defined in
-- the original migration), but we re-CREATE OR REPLACE defensively to handle
-- partial replay from earlier migrations.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'faq_entries_touch_updated_at'
  ) THEN
    CREATE TRIGGER faq_entries_touch_updated_at
      BEFORE UPDATE ON public.faq_entries
      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;

-- Seed a couple of starter FAQs so the chatbot isn't empty on first run.
INSERT INTO public.faq_entries (question, answer, sort_order, is_active) VALUES
  ('ما هي منصة تفوّق؟', 'منصة تعليمية تفاعلية لطالبات الثانوية تساعد على التحضير لاختباري التحصيلي والقدرات عبر عجلة أسئلة، اختبارات محاكية، وألعاب تعليمية.', 1, true),
  ('كيف أبدأ في المنصة؟', 'أنشئي حساباً جديداً من صفحة تسجيل الدخول، ثم اختاري دورك (طالبة / معلمة / وليّة أمر)، وبعدها يمكنك بدء عجلة الاختبارات أو تصفح الاختبارات المحاكية.', 2, true),
  ('هل استخدام المنصة مجاني؟', 'نعم، المنصة مجانية لجميع طالبات الثانوية في حدود الاستخدام العادل.', 3, true)
ON CONFLICT DO NOTHING;
