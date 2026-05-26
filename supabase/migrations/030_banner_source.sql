-- Idempotent ensure of banner_source / banner_query columns.
-- (Columns were introduced in 027; this migration restates them so any fresh
-- env that skipped 027 still ends up with the right schema.)
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_source text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_query text;
