-- Extended fields for the /submit form: cost detail, audience, languages, etc.
-- Note: `cost_type`, `speakers`, and `registration_deadline` already exist from
-- earlier migrations (006/004/002). We widen cost_type's CHECK constraint and
-- reuse speakers (text[]) as-is — the submit form serializes its textarea to an
-- array before insert.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'events' AND constraint_name = 'events_cost_type_check'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_cost_type_check;
  END IF;
END $$;

ALTER TABLE events
  ADD CONSTRAINT events_cost_type_check
  CHECK (cost_type IS NULL OR cost_type IN ('free', 'paid', 'sliding_scale', 'donor_funded'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS cost_details text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS target_audience text[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS co_organizers text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_languages text[] DEFAULT ARRAY['en'];
ALTER TABLE events ADD COLUMN IF NOT EXISTS uploaded_flyer_url text;

COMMENT ON COLUMN events.cost_type IS 'free | paid | sliding_scale | donor_funded';
COMMENT ON COLUMN events.cost_details IS 'Optional human-readable cost details (e.g., "$50 USD, free for low-income countries").';
COMMENT ON COLUMN events.target_audience IS 'Multi-select: all, researchers, government, civil_society, private_sector, youth, donors, invite_only';
COMMENT ON COLUMN events.event_languages IS 'ISO 639-1 language codes (en, fr, es, ar, pt, zh) plus optional "other:<label>" for write-ins.';
COMMENT ON COLUMN events.uploaded_flyer_url IS 'Original flyer image uploaded for AI extraction. Kept for reference / re-extraction.';
