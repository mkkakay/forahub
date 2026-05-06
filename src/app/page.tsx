export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import SubmitEventBanner from "@/components/SubmitEventBanner";
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
  ]);

  const events = (upcomingData as EventPreview[] | null) ?? [];
  const thisWeekEvents = (thisWeekData as EventPreview[] | null) ?? [];

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      {/* Spacer so stats section clears the floating search bar on md+ screens */}
      <div className="hidden md:block h-14" />
      <TrustStrip />
      <SubmitEventBanner />
      <HomeClient
        events={events}
        thisWeekEvents={thisWeekEvents}
        totalCount={totalCount ?? 0}
      />
    </div>
  );
}
