-- 008_scraper.sql
-- Groq-powered scraper run log table
-- Safe to re-run: all statements are idempotent

CREATE TABLE IF NOT EXISTS scraper_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz DEFAULT now(),
  sources_processed integer DEFAULT 0,
  events_found integer DEFAULT 0,
  events_saved integer DEFAULT 0,
  errors text,
  duration_seconds integer
);

ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on scraper_logs" ON scraper_logs;
CREATE POLICY "Service role full access on scraper_logs"
  ON scraper_logs
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS scraper_logs_run_at_idx ON scraper_logs(run_at DESC);
