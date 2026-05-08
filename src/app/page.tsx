export const dynamic = "force-dynamic";

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustStrip from "@/components/TrustStrip";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import SubmitEventBanner from "@/components/SubmitEventBanner";
import HomeClient from "@/components/HomeClient";

// Search queries aligned to each slide's content — specific enough for accurate Pexels results
const SLIDE_QUERIES = [
  "id:16146279",                                                         // WHO/WHA — UN Geneva flags (Allée des Nations)
  "climate action renewable energy solar wind earth environment",       // COP31
  "United Nations general assembly hall delegates sustainability",      // UN HLPF
  "global summit audience international stage diverse crowd",           // Never Miss
  "artificial intelligence digital network technology innovation global", // AI Assistant
  "diverse people Africa Asia Latin America community global",          // Every Region
  "international development forum conference hall audience",           // Track Events
  "conference speaker stage podium global event audience",              // Submit Event
  "sustainable development goals earth climate forest community action", // SDG Goals
];

// Local fallbacks (already downloaded) if Pexels is unavailable
const SLIDE_FALLBACKS = [
  "/images/hero/who-wha.jpg",
  "/images/hero/cop-climate.jpg",
  "/images/hero/un-hlpf.jpg",
  "/images/hero/global-events.jpg",
  "/images/hero/ai-assistant.jpg",
  "/images/hero/global-regions.jpg",
  "/images/hero/track-events.jpg",
  "/images/hero/submit-event.jpg",
  "/images/hero/sdg-goals.jpg",
];

async function fetchOnePexelsImage(query: string, fallback: string): Promise<string> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return fallback;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=10`,
      { headers: { Authorization: apiKey }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const photo = data.photos?.[0];
    return photo?.src?.large2x ?? photo?.src?.large ?? fallback;
  } catch {
    return fallback;
  }
}

// Cache the full batch of hero images for 24 hours independently of the page's force-dynamic
const fetchHeroImages = unstable_cache(
  async (): Promise<string[]> => {
    return Promise.all(
      SLIDE_QUERIES.map((q, i) => fetchOnePexelsImage(q, SLIDE_FALLBACKS[i]))
    );
  },
  ["hero-slide-images"],
  { revalidate: 86400 }
);

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
    slideImages,
    [{ data: upcomingData }, { data: thisWeekData }, { count: totalCount }],
  ] = await Promise.all([
    fetchHeroImages(),
    Promise.all([
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
    ]),
  ]);

  const events = (upcomingData as EventPreview[] | null) ?? [];
  const thisWeekEvents = (thisWeekData as EventPreview[] | null) ?? [];

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection slideImages={slideImages} />
      {/* Spacer so stats section clears the floating search bar on md+ screens */}
      <div className="hidden md:block h-14" />
      <TrustStrip />
      <LiveActivityTicker />
      <HomeClient
        events={events}
        thisWeekEvents={thisWeekEvents}
        totalCount={totalCount ?? 0}
      />
      <SubmitEventBanner />
    </div>
  );
}
