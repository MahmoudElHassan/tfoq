-- Prevent duplicate parent-student links
ALTER TABLE public.parent_student_links
  ADD CONSTRAINT parent_student_links_unique UNIQUE (parent_id, student_id);

-- Index for fast lookups by parent
CREATE INDEX IF NOT EXISTS idx_psl_parent ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_psl_student ON public.parent_student_links(student_id);