CREATE TABLE IF NOT EXISTS org_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_slug text NOT NULL REFERENCES organizations_directory(slug),
  user_email text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending_verification',
  verification_token text UNIQUE,
  token_expires_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (org_slug, user_email)
);

CREATE INDEX IF NOT EXISTS idx_org_claims_email ON org_claims(user_email);
CREATE INDEX IF NOT EXISTS idx_org_claims_status ON org_claims(status);
CREATE INDEX IF NOT EXISTS idx_org_claims_token ON org_claims(verification_token);

ALTER TABLE organizations_directory ADD COLUMN IF NOT EXISTS is_claimed boolean DEFAULT false;
ALTER TABLE organizations_directory ADD COLUMN IF NOT EXISTS claimed_by_user_id uuid REFERENCES auth.users(id);
ALTER TABLE organizations_directory ADD COLUMN IF NOT EXISTS claimed_at timestamptz;
ALTER TABLE organizations_directory ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE organizations_directory ADD COLUMN IF NOT EXISTS twitter_url text;
ALTER TABLE organizations_directory ADD COLUMN IF NOT EXISTS linkedin_url text;
