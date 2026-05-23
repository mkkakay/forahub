-- Admin-managed hero slideshow images, stored in the "hero-images" Storage bucket.
-- Falls back to Pexels in HeroSection when no rows are active.

CREATE TABLE IF NOT EXISTS hero_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  title text,
  subtitle text,
  cta_text text,
  cta_url text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hero_images_active_order
  ON hero_images(is_active, display_order);

COMMENT ON TABLE hero_images IS 'Admin-uploaded hero slideshow images. When at least one row is active, HeroSection uses these instead of Pexels.';
COMMENT ON COLUMN hero_images.storage_path IS 'Path inside the "hero-images" Supabase Storage bucket. Used for deletes.';
COMMENT ON COLUMN hero_images.public_url IS 'Public URL of the image. Used directly by HeroSection.';
