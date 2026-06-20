-- Manage page setup-checklist: an org's "Team" item completes when at
-- least one additional manager exists beyond the founder, OR when the
-- founder explicitly acknowledges "managing solo". This column holds
-- the acknowledgement timestamp; NULL means not acknowledged. Inviting
-- additional managers does not clear it (an invited+ack'd org still
-- reads as done either way).

ALTER TABLE organizations_directory
  ADD COLUMN IF NOT EXISTS solo_acknowledged_at timestamptz;
