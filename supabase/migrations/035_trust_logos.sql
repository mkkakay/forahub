-- Admin-managed trust-strip logos.
-- Mirrors the hero_images pattern (table + RLS + storage bucket + explicit
-- storage policies). Unlike hero-images, this migration ALSO creates the
-- storage bucket and policies so the configuration is reproducible.

-- ── Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trust_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                       -- org name, used as alt/title text
  image_url text NOT NULL,                  -- public URL (Storage public URL OR external)
  storage_path text,                        -- non-null only when the file was uploaded
                                            --   to our bucket; used for orphan cleanup
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_logos_active_order
  ON trust_logos(is_active, display_order);

COMMENT ON TABLE trust_logos IS 'Admin-managed trust-strip logos shown on the homepage. Reads via anon key (RLS) where is_active=true.';
COMMENT ON COLUMN trust_logos.image_url IS 'Public URL. Either a Supabase Storage public URL (when storage_path is set) or an external URL.';
COMMENT ON COLUMN trust_logos.storage_path IS 'Path inside the "logos" bucket. Non-null = our upload — delete here triggers storage delete to avoid orphans.';

-- ── RLS on the table ────────────────────────────────────────────────────
ALTER TABLE public.trust_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read of active trust logos" ON public.trust_logos;
CREATE POLICY "Public read of active trust logos"
  ON public.trust_logos
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Writes go through service-role (which bypasses RLS), so no INSERT/UPDATE/
-- DELETE policy is needed here.

-- ── Storage bucket ──────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ── Storage policies on storage.objects ─────────────────────────────────
-- Explicit, scoped to bucket_id='logos'. The "hero-images" bucket relies on
-- bucket.public bypassing RLS; for this bucket we declare both the public
-- read path AND an authenticated-write path so the configuration is
-- reproducible and auditable.

DROP POLICY IF EXISTS "logos public read" ON storage.objects;
CREATE POLICY "logos public read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos authenticated insert" ON storage.objects;
CREATE POLICY "logos authenticated insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos authenticated update" ON storage.objects;
CREATE POLICY "logos authenticated update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos')
  WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos authenticated delete" ON storage.objects;
CREATE POLICY "logos authenticated delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos');
