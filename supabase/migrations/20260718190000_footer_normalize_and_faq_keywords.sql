-- =============================================================================
-- Normalize the `footer` CMS row + add FAQ keywords
-- =============================================================================
-- 1. footer.brand_name is removed in favor of branding.brand_name (single
--    source of truth; SiteFooter reads both via useSiteContent). Existing
--    brand_name values are dropped because admin rewrites already ship.
-- 2. footer.copyright → footer.copyright_template: a string that supports
--    a `{brand}` placeholder. The renderer (SiteFooter) substitutes the
--    current branding.brand_name so the visible copyright always matches
--    the nav/heading — no more hardcoded "منصة تفوّق".
-- 3. faq_entries.keywords text[]: per-FAQ synonyms, weighted heavily
--    during chatbot matching. Admins add 3–5 aliases per question so
--    paraphrased queries land on the right answer.

-- Drop brand_name, rename copyright → copyright_template. We rewrite the
-- whole JSON content so the shape is exact (avoids stale fields).
DO $$
DECLARE
  v_brand_name text;
BEGIN
  SELECT (content->>'brand_name') INTO v_brand_name
    FROM public.site_content WHERE id = 'footer';
  IF v_brand_name IS NOT NULL THEN
    UPDATE public.site_content
       SET content = content - 'brand_name'
     WHERE id = 'footer';
  END IF;
END $$;

-- Move any existing copyright text into copyright_template.
DO $$
DECLARE
  v_copyright text;
  v_template  text;
BEGIN
  SELECT content->>'copyright' INTO v_copyright
    FROM public.site_content WHERE id = 'footer';

  -- Default template if the row never had copyright.
  v_template := COALESCE(v_copyright,
    '{brand} - جميع الحقوق محفوظة | بدعم من وزارة التعليم');

  UPDATE public.site_content
     SET content = jsonb_set(
           content - 'copyright',
           '{copyright_template}',
           to_jsonb(v_template)
         )
   WHERE id = 'footer';
END $$;

-- -----------------------------------------------------------------------------
-- FAQ keywords
-- -----------------------------------------------------------------------------
ALTER TABLE public.faq_entries
  ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- GIN index for array containment checks (used by the chatbot matcher as
-- a tiebreaker when token-overlap is weak).
CREATE INDEX IF NOT EXISTS idx_faq_keywords_gin
  ON public.faq_entries
  USING GIN (keywords);

-- Seed starter keywords on the original FAQs so the matcher has something
-- to work with on day one.
UPDATE public.faq_entries
   SET keywords = ARRAY['تعريف', 'ما', 'هي', 'منصة', 'تعليمية', 'تحصيلي', 'قدرات']
 WHERE question = 'ما هي منصة تفوّق؟'
   AND (keywords IS NULL OR cardinality(keywords) = 0);

UPDATE public.faq_entries
   SET keywords = ARRAY['تسجيل', 'بدء', 'بدء', 'انشاء', 'حساب', 'اشتراك', 'دخول', 'جديد']
 WHERE question = 'كيف أبدأ في المنصة؟'
   AND (keywords IS NULL OR cardinality(keywords) = 0);

UPDATE public.faq_entries
   SET keywords = ARRAY['مجاني', 'سعر', 'اشتراك', 'رسوم', 'تكلفة', 'مجانا']
 WHERE question = 'هل استخدام المنصة مجاني؟'
   AND (keywords IS NULL OR cardinality(keywords) = 0);
