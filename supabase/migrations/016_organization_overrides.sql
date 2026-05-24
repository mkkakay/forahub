-- Admin-editable overrides for organization display data and logo URLs.
-- Merged on top of the static ORG_REGISTRY at runtime by getResolvedOrg().

CREATE TABLE IF NOT EXISTS organization_overrides (
  slug text PRIMARY KEY,
  display_name text,
  short_name text,
  description text,
  manual_logo_url text,
  needs_dark_background boolean DEFAULT false,
  brand_color text,
  is_featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_overrides_featured
  ON organization_overrides(is_featured, display_order);

-- Service-role only access — admin API route uses adminSupabase.
ALTER TABLE public.organization_overrides ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE organization_overrides IS 'Admin overrides for organization display + logo. Merged onto ORG_REGISTRY at runtime.';
COMMENT ON COLUMN organization_overrides.manual_logo_url IS 'Highest-priority logo source. NULL → fall back to Brandfetch cache.';
COMMENT ON COLUMN organization_overrides.needs_dark_background IS 'Render the org tile with a dark backdrop (for light-on-light logos).';
