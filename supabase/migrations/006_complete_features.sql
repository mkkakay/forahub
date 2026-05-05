-- Migration 006: Complete features
-- Add columns to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS has_travel_grant boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS travel_grant_details text,
  ADD COLUMN IF NOT EXISTS fellowship_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS funding_deadline date,
  ADD COLUMN IF NOT EXISTS save_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trend_score float DEFAULT 0;

-- Add columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS organization_website text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cookie_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by text,
  ADD COLUMN IF NOT EXISTS font_size_preference text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS high_contrast boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS sdg_interests integer[],
  ADD COLUMN IF NOT EXISTS notification_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_push boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_30d boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_7d boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_1d boolean DEFAULT true;

-- push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs" ON push_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- abstracts
CREATE TABLE IF NOT EXISTS abstracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  event_name text,
  title text NOT NULL,
  submission_date date,
  deadline date,
  status text DEFAULT 'Draft',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE abstracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own abstracts" ON abstracts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- event_stats
CREATE TABLE IF NOT EXISTS event_stats (
  event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  save_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  week_saves integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE event_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read event stats" ON event_stats FOR SELECT USING (true);

-- conference_guides
CREATE TABLE IF NOT EXISTS conference_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  content text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conference_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read guides" ON conference_guides FOR SELECT USING (true);

-- post_event_resources
CREATE TABLE IF NOT EXISTS post_event_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  submitted_by uuid REFERENCES auth.users ON DELETE SET NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE post_event_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read verified resources" ON post_event_resources
  FOR SELECT USING (verified = true);
CREATE POLICY "Users can submit resources" ON post_event_resources
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- referrals
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users ON DELETE CASCADE,
  converted_at timestamptz,
  reward_applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own referrals" ON referrals
  USING (auth.uid() = referrer_id);

-- keyword_alerts
CREATE TABLE IF NOT EXISTS keyword_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  keyword text NOT NULL,
  region_filter text,
  format_filter text,
  notification_type text DEFAULT 'email',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE keyword_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alerts" ON keyword_alerts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- qr_tokens
CREATE TABLE IF NOT EXISTS qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  user_email text,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON notifications
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- organizers
CREATE TABLE IF NOT EXISTS organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  website text,
  org_type text,
  contact_email text,
  verified boolean DEFAULT false,
  created_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read organizers" ON organizers FOR SELECT USING (true);

-- Generate referral codes for existing profiles
UPDATE profiles SET referral_code = left(md5(id::text || now()::text), 8)
WHERE referral_code IS NULL;
