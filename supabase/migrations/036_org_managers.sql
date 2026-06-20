-- Multi-manager model for orgs. Replaces single-owner gate
-- (organizations_directory.claimed_by_user_id) with a join table so any number
-- of verified colleagues from the same org can co-manage. The badge stays at
-- the org level via is_claimed / is_verified; ownership/edit access is "row
-- exists in org_managers for (slug, auth.uid())".

CREATE TABLE IF NOT EXISTS org_managers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_slug    text        NOT NULL REFERENCES organizations_directory(slug) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'manager',
  added_at    timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  added_via   text,
  CONSTRAINT org_managers_unique_org_user UNIQUE (org_slug, user_id)
);

CREATE INDEX IF NOT EXISTS org_managers_org_slug_idx ON org_managers(org_slug);
CREATE INDEX IF NOT EXISTS org_managers_user_id_idx  ON org_managers(user_id);

-- Backfill 1: every verified claim that has a real auth user becomes a
-- manager. Idempotent via the (org_slug, user_id) unique index.
INSERT INTO org_managers (org_slug, user_id, email, role, added_at, verified_at, added_via)
SELECT
  oc.org_slug,
  oc.user_id,
  oc.user_email,
  'manager',
  COALESCE(oc.claimed_at, oc.created_at, now()),
  COALESCE(oc.claimed_at, oc.created_at),
  COALESCE(oc.verification_path, 'manual_backfill')
FROM org_claims oc
WHERE oc.status = 'verified'
  AND oc.user_id IS NOT NULL
ON CONFLICT (org_slug, user_id) DO NOTHING;

-- Backfill 2: any org row whose single-owner claimed_by_user_id was set but
-- whose matching claim row didn't have user_id populated (the legacy WHO
-- shape). We pull the email out of auth.users.
INSERT INTO org_managers (org_slug, user_id, email, role, added_at, verified_at, added_via)
SELECT
  od.slug,
  od.claimed_by_user_id,
  COALESCE(au.email, ''),
  'manager',
  COALESCE(od.claimed_at, now()),
  od.claimed_at,
  'manual_backfill'
FROM organizations_directory od
LEFT JOIN auth.users au ON au.id = od.claimed_by_user_id
WHERE od.is_claimed = true
  AND od.claimed_by_user_id IS NOT NULL
ON CONFLICT (org_slug, user_id) DO NOTHING;

-- Note: organizations_directory.claimed_by_user_id is no longer read by the
-- app after this migration. The column is left in place so this migration is
-- safely reversible; a follow-up cleanup migration can DROP it once we're
-- confident nothing reads it.
