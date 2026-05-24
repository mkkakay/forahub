-- Caches organization logo URLs fetched from Brandfetch.
-- status values: 'pending', 'success', 'not_found', 'error'

CREATE TABLE IF NOT EXISTS organization_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text UNIQUE NOT NULL,
  domain text,
  logo_url text,
  fetched_at timestamptz DEFAULT now(),
  last_attempted_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_organization_logos_name ON organization_logos(organization_name);

-- Service-role-only access (the route + server helper use adminSupabase).
ALTER TABLE public.organization_logos ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE organization_logos IS 'Caches Brandfetch logo URLs by organization_name. Service-role only.';
COMMENT ON COLUMN organization_logos.status IS 'pending | success | not_found | error';
