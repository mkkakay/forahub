export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import Navbar from "@/components/Navbar";
import HomeSearchBar from "@/components/HomeSearchBar";
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

  const [{ data: upcomingData }, { data: thisWeekData }, { data: titleData }, { count: totalCount }] = await Promise.all([
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
      .select("title")
      .gte("start_date", today)
      .order("start_date", { ascending: true }),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("start_date", today),
  ]);

  const events = (upcomingData as EventPreview[] | null) ?? [];
  const thisWeekEvents = (thisWeekData as EventPreview[] | null) ?? [];
  const eventTitles = (titleData ?? []).map((e: { title: string }) => e.title);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-[#0f2a4a] pb-20 pt-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-blue-200 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            1,000+ events across 50+ countries
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Never Miss a Global Development Event
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto">
            Conferences, side events, and convenings across all 17 SDG goals, in one place.
          </p>
          <HomeSearchBar eventTitles={eventTitles} />
        </div>
      </section>

      <HomeClient
        events={events}
        thisWeekEvents={thisWeekEvents}
        totalCount={totalCount ?? 0}
      />
    </div>
  );
}
