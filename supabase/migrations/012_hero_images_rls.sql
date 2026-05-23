-- RLS for hero_images. Homepage reads via anon key; admin writes via service role.
-- Service role bypasses RLS, so we only need a SELECT policy on active rows.

ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of active hero images"
  ON public.hero_images
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
