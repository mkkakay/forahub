-- Migration 007: Reports table + hero featured fields

-- Add hero featured fields to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_hero_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hero_panel_position integer,
  ADD COLUMN IF NOT EXISTS hero_featured_until date;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  reported_by uuid REFERENCES auth.users ON DELETE SET NULL,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert reports" ON reports;
CREATE POLICY "Authenticated users can insert reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can read all reports" ON reports;
CREATE POLICY "Admins can read all reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
