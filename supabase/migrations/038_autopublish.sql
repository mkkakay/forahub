-- Event auto-publish for verified-org managers.
--
-- Domain-verified managers (org_managers.added_via='domain_match') always
-- skip review when they submit an event for the org they manage. Invited
-- and admin-reviewed managers only skip review if a domain-verified manager
-- explicitly grants them auto-publish via the new can_autopublish flag.
-- A rolling 24h cap (enforced in app code) prevents a compromised account
-- from flooding the directory.

-- ── org_managers: per-seat autopublish grant ───────────────────────────
ALTER TABLE org_managers
  ADD COLUMN IF NOT EXISTS can_autopublish        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS autopublish_granted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS autopublish_granted_at timestamptz;

-- ── events: stable org link + auto-publish + recheck audit ─────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS org_slug                    text,
  ADD COLUMN IF NOT EXISTS auto_published_at           timestamptz,
  ADD COLUMN IF NOT EXISTS auto_published_by_user_id   uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS needs_recheck               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_recheck_at            timestamptz,
  ADD COLUMN IF NOT EXISTS needs_recheck_reason        text;

CREATE INDEX IF NOT EXISTS events_org_slug_idx                ON events(org_slug);
CREATE INDEX IF NOT EXISTS events_auto_published_at_idx       ON events(auto_published_at DESC) WHERE auto_published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS events_needs_recheck_idx           ON events(needs_recheck) WHERE needs_recheck = true;

-- Best-effort backfill so the manage-page Events panel can list pre-existing
-- events for an org. Mirrors slugify() in src/lib/organizations: lowercase,
-- non-alphanumerics → hyphens, trim leading/trailing hyphens, collapse runs.
UPDATE events
SET org_slug = trim(both '-' from regexp_replace(lower(organization), '[^a-z0-9]+', '-', 'g'))
WHERE org_slug IS NULL AND organization IS NOT NULL AND organization <> '';
