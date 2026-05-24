-- Per-event banner display mode toggle.
-- 'cover'   = photo fills the card cover (default — most banners are photos).
-- 'contain' = logo fit (when the banner is actually a wordmark/poster on solid bg).

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS banner_display_mode text DEFAULT 'cover'
  CHECK (banner_display_mode IN ('contain', 'cover'));

COMMENT ON COLUMN events.banner_display_mode IS
  'How to render the event banner: cover (photo fill) or contain (logo fit).';
