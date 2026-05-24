-- Adds Pexels-fetched banner image cache to events.
-- Refreshed on demand by src/lib/events/fetchEventBanner.ts.

ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_image_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_fetched_at timestamptz;

COMMENT ON COLUMN events.banner_image_url IS 'Cached Pexels stock-image URL used as the event card cover.';
COMMENT ON COLUMN events.banner_fetched_at IS 'When the banner was last fetched. Re-fetched after 30 days.';
