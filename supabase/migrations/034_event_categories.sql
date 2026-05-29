-- Humanitarian / Development / Nexus / Policy & Governance / Research & Academic
-- taxonomy for events. Categorization is hybrid (keyword → SDG → AI) and
-- is set both at ingestion time and by admin review.

ALTER TABLE events ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_secondary text[];
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_confidence numeric;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_source text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_locked boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_classified_at timestamptz;

-- category_source values: 'ai' | 'keyword' | 'admin' | 'submitter' | 'sdg_inferred'
-- category_locked = true means admin or submitter set it; AI must not overwrite.

CREATE INDEX IF NOT EXISTS idx_events_category
  ON events(category)
  WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_category_secondary
  ON events USING gin(category_secondary);
