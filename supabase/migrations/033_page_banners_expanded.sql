-- Add per-page variant ('standard' | 'slim') and seed a row for every public
-- top-level page (admin/dynamic/onboarding pages excluded). All new rows start
-- with is_active=false so nothing renders an image until the admin opts in.

ALTER TABLE page_banners ADD COLUMN IF NOT EXISTS variant text DEFAULT 'standard'
  CHECK (variant IN ('standard', 'slim'));

INSERT INTO page_banners (page_key, variant)
VALUES
  ('about', 'standard'),
  ('abstracts', 'standard'),
  ('alerts', 'standard'),
  ('assistant', 'standard'),
  ('claim', 'standard'),
  ('contact', 'standard'),
  ('dashboard', 'standard'),
  ('data-sources', 'standard'),
  ('events', 'standard'),
  ('help', 'standard'),
  ('map', 'slim'),
  ('notifications', 'standard'),
  ('offline', 'standard'),
  ('payment-cancel', 'standard'),
  ('payment-success', 'standard'),
  ('pricing', 'standard'),
  ('privacy', 'standard'),
  ('profile', 'standard'),
  ('saved', 'standard'),
  ('submit', 'standard'),
  ('submit-bulk', 'standard'),
  ('submit-single', 'standard'),
  ('terms', 'standard')
ON CONFLICT (page_key) DO NOTHING;

-- Pre-set map variant to slim even if the row already existed before this
-- migration (when it would have inserted as 'standard').
UPDATE page_banners SET variant = 'slim' WHERE page_key = 'map' AND variant <> 'slim';
