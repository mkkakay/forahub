-- Tiered organization directory.
-- Tier 1 = curated featured orgs (~300, this migration seeds via tier1Seed.ts)
-- Tier 2 = imported known orgs (~2000, Stage 2 via ROR / OpenAlex)
-- Tier 3 = community-submitted orgs (await admin approval)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS organizations_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  short_name text,
  aliases text[],
  org_type text NOT NULL,
  region text,
  domain text,
  logo_url text,
  tier integer DEFAULT 2,
  is_verified boolean DEFAULT false,
  description text,
  source text DEFAULT 'manual',
  status text DEFAULT 'active',
  submission_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_dir_tier ON organizations_directory(tier);
CREATE INDEX IF NOT EXISTS idx_org_dir_type ON organizations_directory(org_type);
CREATE INDEX IF NOT EXISTS idx_org_dir_status ON organizations_directory(status);
CREATE INDEX IF NOT EXISTS idx_org_dir_name_trgm ON organizations_directory USING gin (name gin_trgm_ops);

ALTER TABLE public.organizations_directory ENABLE ROW LEVEL SECURITY;

-- Public search reads active rows only.
CREATE POLICY "Public read of active orgs"
  ON public.organizations_directory
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

COMMENT ON TABLE organizations_directory IS 'Tiered org directory powering /submit autocomplete and admin /admin Directory panel.';
COMMENT ON COLUMN organizations_directory.tier IS '1 = featured, 2 = known/imported, 3 = community-submitted (pending review)';
COMMENT ON COLUMN organizations_directory.org_type IS 'un_agency | un_fund | un_programme | multilateral | ifi | foundation | ngo | government | university | think_tank | civil_society | private_sector | media | other';
COMMENT ON COLUMN organizations_directory.status IS 'active | pending | rejected | merged';
COMMENT ON COLUMN organizations_directory.source IS 'manual | registry | ror | openalex | submission';
