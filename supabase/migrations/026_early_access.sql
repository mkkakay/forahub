-- Early-access signups for upcoming features (org accounts, etc.).
-- Captures interest before launch; admin notifies via `notified_at`.

CREATE TABLE IF NOT EXISTS early_access_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  interest text DEFAULT 'org_accounts',
  signed_up_at timestamptz DEFAULT now(),
  notified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_early_access_email ON early_access_signups(email);
CREATE INDEX IF NOT EXISTS idx_early_access_interest ON early_access_signups(interest);

-- One row per (email, interest); a re-signup just refreshes timestamps.
CREATE UNIQUE INDEX IF NOT EXISTS uq_early_access_email_interest
  ON early_access_signups(lower(email), interest);

-- Allow anonymous inserts via the API (route uses adminSupabase so this is
-- a belt-and-suspenders enable; lock down reads to service role only).
ALTER TABLE early_access_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS early_access_insert_anon ON early_access_signups;
CREATE POLICY early_access_insert_anon ON early_access_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

COMMENT ON TABLE early_access_signups IS 'Pre-launch signups for upcoming features (e.g., organization accounts).';
