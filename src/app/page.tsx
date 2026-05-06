export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import Navbar from "@/components/Navbar";
import HeroSection, { type HeroPanelEvent } from "@/components/HeroSection";
import HomeClient from "@/components/HomeClient";

type EventPreview = Pick<
  Database['public']['Tables']['events']['Row'],
  'id' | 'title' | 'start_date' | 'end_date' | 'location' | 'organization' | 'sdg_goals' | 'is_featured' | 'format' | 'region'
>;

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );

  const today = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoYearsOut = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: upcomingData },
    { data: thisWeekData },
    { count: totalCount },
    { data: featuredHeroData },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, start_date, end_date, location, organization, sdg_goals, is_featured, format, region")
      .gte("start_date", today)
      .lte("start_date", twoYearsOut)
      .order("start_date", { ascending: true })
      .limit(6),
    supabase
      .from("events")
      .select("id, title, start_date, end_date, location, organization, sdg_goals, is_featured, format, region")
      .gte("start_date", today)
      .lte("start_date", nextWeek)
      .order("start_date", { ascending: true })
      .limit(10),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("start_date", today),
    supabase
      .from("events")
      .select("id, title, start_date, location, organization, sdg_goals, region")
      .eq("is_hero_featured", true)
      .order("hero_panel_position", { ascending: true, nullsFirst: false })
      .limit(3),
  ]);

  const events = (upcomingData as EventPreview[] | null) ?? [];
  const thisWeekEvents = (thisWeekData as EventPreview[] | null) ?? [];

  // Fill hero panels: featured events first, then upcoming events
  const featured = (featuredHeroData as HeroPanelEvent[] | null) ?? [];
  let heroEvents: HeroPanelEvent[] = [...featured];
  if (heroEvents.length < 3) {
    const featuredIds = new Set(heroEvents.map(e => e.id));
    const fill = (upcomingData as HeroPanelEvent[] | null ?? []).filter(e => !featuredIds.has(e.id));
    heroEvents = [...heroEvents, ...fill].slice(0, 3);
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection heroEvents={heroEvents} />
      {/* Spacer so stats section clears the floating search bar on md+ screens */}
      <div className="hidden md:block h-14" />
      <HomeClient
        events={events}
        thisWeekEvents={thisWeekEvents}
        totalCount={totalCount ?? 0}
      />
    </div>
  );
}
