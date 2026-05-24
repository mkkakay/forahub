-- Region directory for the "Explore by Region" homepage section.
-- Admin-editable via /admin → Regions panel.

CREATE TABLE IF NOT EXISTS regions (
  slug text PRIMARY KEY,
  name text NOT NULL,
  description text,
  banner_image_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regions_active_order ON regions(is_active, display_order);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of active regions"
  ON public.regions
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

INSERT INTO regions (slug, name, description, display_order, banner_image_url) VALUES
  ('africa',          'Africa',          'Events across the African continent',                  1, NULL),
  ('asia-pacific',    'Asia Pacific',    'Events across Asia and the Pacific',                   2, NULL),
  ('middle-east',     'Middle East',     'Events across the Middle East and North Africa',       3, NULL),
  ('americas',        'Americas',        'Events across North, Central, and South America',      4, NULL),
  ('europe',          'Europe',          'Events across Europe',                                 5, NULL),
  ('pacific-islands', 'Pacific Islands', 'Events across Pacific Island nations',                 6, NULL)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE regions IS 'Region directory for the homepage Explore-by-Region strip. Banner URLs populated by Pexels or admin upload.';
