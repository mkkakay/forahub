-- Audience cards powering the "Who We Serve" section on /about.
-- Public reads active rows only; writes are admin-only via the service role.

CREATE TABLE IF NOT EXISTS public.audience_cards (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label            text NOT NULL,
  icon             text,
  image_url        text,
  link_url         text,
  bg_class         text,
  icon_color_class text,
  sort_order       integer NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audience_cards_sort ON public.audience_cards(sort_order);
CREATE INDEX IF NOT EXISTS idx_audience_cards_active ON public.audience_cards(is_active);

ALTER TABLE public.audience_cards ENABLE ROW LEVEL SECURITY;

-- Public read of active audience cards (matches the 022 organizations_directory pattern).
DROP POLICY IF EXISTS "Public read of active audience cards" ON public.audience_cards;
CREATE POLICY "Public read of active audience cards"
  ON public.audience_cards
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Seed the nine current cards. Guarded so re-running the SQL in the
-- Supabase editor is a no-op once seeded.
INSERT INTO public.audience_cards (label, icon, bg_class, icon_color_class, sort_order, is_active)
SELECT label, icon, bg_class, icon_color_class, sort_order, true
FROM (VALUES
  ('Researchers & Scientists', 'Microscope',    'bg-green-50',  'text-green-600',  1),
  ('Policy Advisors',          'FileText',      'bg-blue-50',   'text-blue-600',   2),
  ('Programme Officers',       'ClipboardList', 'bg-indigo-50', 'text-indigo-600', 3),
  ('NGO Professionals',        'Users',         'bg-teal-50',   'text-teal-600',   4),
  ('Donors & Funders',         'HandCoins',     'bg-amber-50',  'text-amber-600',  5),
  ('Government Officials',     'Landmark',      'bg-slate-50',  'text-slate-600',  6),
  ('Consultants',              'Briefcase',     'bg-sky-50',    'text-sky-600',    7),
  ('Students & Early Career',  'GraduationCap', 'bg-violet-50', 'text-violet-600', 8),
  ('Journalists & Advocates',  'Megaphone',     'bg-rose-50',   'text-rose-600',   9)
) AS seed(label, icon, bg_class, icon_color_class, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.audience_cards);

COMMENT ON TABLE  public.audience_cards                  IS 'Cards rendered in the /about "Who We Serve" section. Admin-managed.';
COMMENT ON COLUMN public.audience_cards.icon             IS 'lucide-react icon name (e.g. Microscope). Nullable when image_url is set.';
COMMENT ON COLUMN public.audience_cards.image_url        IS 'Optional image alternative to the lucide icon.';
COMMENT ON COLUMN public.audience_cards.link_url         IS 'Optional click-through URL for the card.';
COMMENT ON COLUMN public.audience_cards.bg_class         IS 'Tailwind background tint class, e.g. bg-green-50.';
COMMENT ON COLUMN public.audience_cards.icon_color_class IS 'Tailwind text color class for the icon, e.g. text-green-600.';
