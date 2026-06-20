-- Cover image for org profile pages, surfaced on the manage page's
-- completeness nudge alongside logo + description + website + socials.
-- Additive — every existing read path that didn't reference this column
-- keeps working unchanged.

ALTER TABLE organizations_directory
  ADD COLUMN IF NOT EXISTS cover_image_url text;
