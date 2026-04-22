-- Storage bucket for site images (hero image, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-images', 'site-images', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- Public read
DROP POLICY IF EXISTS "Site images public read" ON storage.objects;
CREATE POLICY "Site images public read" ON storage.objects FOR SELECT
USING (bucket_id = 'site-images');

-- Admins manage
DROP POLICY IF EXISTS "Admins upload site images" ON storage.objects;
CREATE POLICY "Admins upload site images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins update site images" ON storage.objects;
CREATE POLICY "Admins update site images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'site-images' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins delete site images" ON storage.objects;
CREATE POLICY "Admins delete site images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'site-images' AND public.has_role(auth.uid(),'admin'));