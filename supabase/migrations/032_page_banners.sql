CREATE TABLE IF NOT EXISTS page_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  image_url text,
  overlay_level text DEFAULT 'medium' CHECK (overlay_level IN ('light', 'medium', 'dark')),
  is_active boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Seed one row per existing top-level page so the admin panel has something
-- to show on first open. is_active is false everywhere — pages keep their
-- existing navy header until the admin opts each one in.
INSERT INTO page_banners (page_key)
VALUES ('events'), ('map'), ('saved'), ('pricing'), ('about')
ON CONFLICT (page_key) DO NOTHING;
