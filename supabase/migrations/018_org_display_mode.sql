-- Per-org logo display mode toggle.
-- 'contain' = logo fits (small mark on a tinted background, leaves space).
-- 'cover'   = photo fills the tile (full-bleed brand photo, may crop edges).

ALTER TABLE organization_overrides
  ADD COLUMN IF NOT EXISTS logo_display_mode text DEFAULT 'contain'
  CHECK (logo_display_mode IN ('contain', 'cover'));

COMMENT ON COLUMN organization_overrides.logo_display_mode IS
  'How to render the org logo in tiles: contain (logo fit) or cover (photo fill).';
