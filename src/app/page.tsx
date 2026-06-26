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
import { batchGetLogos } from "@/lib/organizations/getLogoUrl";
import { backfillBannersAsync } from "@/lib/events/fetchEventBanner";
import { getResolvedFeaturedCalendars } from "@/lib/organizations/getResolvedOrg";
import { getActiveRegions } from "@/lib/regions/getActiveRegions";
import { adminSupabase } from "@/lib/supabase/admin";
import { getActiveTrustLogos } from "@/lib/trustLogos";

// Search queries aligned to each slide's content — specific enough for accurate Pexels results
const SLIDE_QUERIES = [
  "United Nations general assembly hall delegates sustainability",      // UN HLPF
  "global summit audience international stage diverse crowd",           // Never Miss
  "artificial intelligence digital network technology innovation global", // AI Assistant
  "diverse people Africa Asia Latin America community global",          // Every Region
  "international development forum conference hall audience",           // Track Events
  "conference speaker stage podium global event audience",              // Submit Event
  "sustainable development goals earth climate forest community action", // SDG Goals
];

// Local fallbacks (already downloaded) if Pexels is unavailable.
// Slide 0 is LCP — serve the pre-converted WebP at 1920w (245kB vs 518kB).
const SLIDE_FALLBACKS = [
  "/images/hero/un-hlpf-1920.webp",
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
  'id' | 'title' | 'start_date' | 'end_date' | 'location' | 'organization' | 'sdg_goals' | 'is_featured' | 'format' | 'region' | 'banner_image_url' | 'banner_display_mode' | 'cost_type' | 'capacity' | 'registration_full'
>;

type HeroImageRow = {
  id: string;
  public_url: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  display_order: number;
};

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );

  const now = new Date();
  const today = now.toISOString();
  const endOf2030 = '2030-12-31T23:59:59.999Z';

  const COLS = "id, title, start_date, end_date, location, organization, sdg_goals, is_featured, format, region, banner_image_url, banner_display_mode, cost_type, capacity, registration_full";

  const [
    slideImages,
    [{ data: upcomingData }, { count: totalCount }, { data: heroImagesData }],
  ] = await Promise.all([
    fetchHeroImages(),
    Promise.all([
      supabase
        .from("events")
        .select(COLS)
        .gte("start_date", today)
        .lte("start_date", endOf2030)
        .eq("submission_status", "approved")
        .order("start_date", { ascending: true })
        .limit(6),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("start_date", today),
      // HeroSection only renders the first few slides; cap at 20 so the
      // table can't accidentally ship hundreds of inactive-leaning rows.
      // Keep .limit() — removing it reintroduces the unbounded query.
      supabase
        .from("hero_images")
        .select("id, public_url, title, subtitle, cta_text, cta_url, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(20),
    ]),
  ]);

  const events = (upcomingData as EventPreview[] | null) ?? [];
  const heroImages = ((heroImagesData ?? []) as HeroImageRow[]);

  const featuredCalendars = await getResolvedFeaturedCalendars().catch(() => []);
  const regions = await getActiveRegions().catch(() => []);
  const trustLogos = await getActiveTrustLogos().catch(() => []);

  const { count: mapEventsCount } = await adminSupabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .not("latitude", "is", null)
    .in("format", ["in_person", "hybrid"])
    .gte("start_date", new Date().toISOString());

  const featuredSlugs = featuredCalendars.map(o => o.slug);
  const claimedBySlug = new Map<string, { is_claimed: boolean; is_verified: boolean }>();
  if (featuredSlugs.length > 0) {
    const { data: claimedRows } = await adminSupabase
      .from("organizations_directory")
      .select("slug, is_claimed, is_verified")
      .in("slug", featuredSlugs);
    for (const r of (claimedRows ?? []) as { slug: string; is_claimed: boolean | null; is_verified: boolean | null }[]) {
      claimedBySlug.set(r.slug, { is_claimed: !!r.is_claimed, is_verified: !!r.is_verified });
    }
  }

  const orgLogos = await batchGetLogos([
    ...events
      .map(e => e.organization)
      .filter((o): o is string => typeof o === "string" && o.trim().length > 0),
    ...featuredCalendars.map(o => o.name),
  ]).catch(() => ({}));

  // Fire-and-forget banner backfill for events missing a cached image.
  backfillBannersAsync(
    events
      .filter(e => !e.banner_image_url)
      .map(e => ({ id: e.id, title: e.title, sdg_goals: e.sdg_goals }))
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection slideImages={slideImages} heroImages={heroImages} />
      <TrustStrip logos={trustLogos.map(l => ({ name: l.name, image_url: l.image_url }))} />
      <LiveActivityTicker />
      <HomeClient
        events={events}
        pastEvents={[]}
        totalCount={totalCount ?? 0}
        mapEventsCount={mapEventsCount ?? 0}
        orgLogos={orgLogos}
        featuredCalendars={featuredCalendars.map(o => {
          const claim = claimedBySlug.get(o.slug);
          return {
            slug: o.slug,
            name: o.name,
            short: o.short,
            description: o.description,
            color: o.color,
            needs_dark_background: o.needs_dark_background,
            logo_url: o.logo_url,
            logo_display_mode: o.logo_display_mode,
            is_claimed: claim?.is_claimed ?? false,
            is_verified: claim?.is_verified ?? false,
          };
        })}
        regions={regions.map(r => ({
          slug: r.slug,
          name: r.name,
          banner_image_url: r.banner_image_url,
        }))}
      />
      <SubmitEventBanner />
    </div>
  );
}
