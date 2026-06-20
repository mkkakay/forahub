-- Co-manager invitations. A verified manager invites any email — including
-- addresses outside the org's domain — to join as a co-manager. The seat
-- they get on acceptance lands in org_managers with added_via='invitation',
-- so audit history distinguishes domain-matched seats from invited seats.

CREATE TABLE IF NOT EXISTS org_invites (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_slug           text        NOT NULL REFERENCES organizations_directory(slug) ON DELETE CASCADE,
  invited_email      text        NOT NULL,
  token              text        NOT NULL UNIQUE,
  invited_by_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_email   text,
  note               text,
  status             text        NOT NULL DEFAULT 'pending',
  expires_at         timestamptz NOT NULL,
  accepted_at        timestamptz,
  accepted_user_id   uuid        REFERENCES auth.users(id),
  revoked_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_invites_org_slug_idx ON org_invites(org_slug);
CREATE INDEX IF NOT EXISTS org_invites_token_idx    ON org_invites(token);
CREATE INDEX IF NOT EXISTS org_invites_email_idx    ON org_invites(lower(invited_email));
CREATE INDEX IF NOT EXISTS org_invites_status_idx   ON org_invites(status);
