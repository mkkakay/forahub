import { headers } from "next/headers";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import EventsClient from "./EventsClient";
import Navbar from "@/components/Navbar";
import { getLocationFromIp, type IpLocation } from "@/lib/geo/ipLocation";
import { backfillBannersAsync } from "@/lib/events/fetchEventBanner";
import { batchGetLogos } from "@/lib/organizations/getLogoUrl";
import PageHeader from "@/components/PageHeader";
import { getPageBanner } from "@/lib/pageBanners";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export const dynamic = "force-dynamic";

// SSR page sizes. The /events page used to fetch every event in the
// twoYearsAgo..endOf2030 window with no limit — fine while the table
// was small, but the scraper is about to make it a lot bigger. Cap the
// initial payload at 100 upcoming + 50 past; the EventsClient "Load more"
// button uses cursor pagination (range) to pull the next page on demand.
// Keep these constants — removing them reintroduces the unbounded query.
const UPCOMING_PAGE_SIZE = 100;
const PAST_PAGE_SIZE = 50;

function pickClientIp(): string | null {
  // Privacy note: this IP is never persisted. It is read from request headers
  // for the current request only, used transiently to call the IP-geo lookup,
  // and discarded when the response returns.
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

async function fetchFeatured(now: string): Promise<EventRow[]> {
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("is_featured", true)
    .gte("start_date", now)
    .or(`featured_until.is.null,featured_until.gte.${now}`)
    .order("start_date", { ascending: true })
    .limit(5);
  return (data as EventRow[] | null) ?? [];
}

async function fetchNearby(location: IpLocation, now: string): Promise<EventRow[]> {
  const candidates: string[] = [];
  if (location.country_name) candidates.push(location.country_name);
  if (location.country_code) candidates.push(location.country_code);
  if (candidates.length === 0) return [];

  // PostgREST OR over ILIKE candidates; case-insensitive substring on `location`.
  const orClause = candidates
    .map(c => `location.ilike.%${c.replace(/[%,_]/g, "")}%`)
    .join(",");

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("is_online", false)
    .gte("start_date", now)
    .or(orClause)
    .order("start_date", { ascending: true })
    .limit(6);
  return (data as EventRow[] | null) ?? [];
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const now = new Date();
  const today = now.toISOString();
  const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
  const endOf2030 = "2030-12-31T23:59:59.999Z";

  const ip = pickClientIp();
  const [
    { data: upcomingData },
    { data: pastData },
    { count: totalCount },
    location,
    featured,
  ] = await Promise.all([
    // Upcoming events — ascending so the soonest event is first. Capped at
    // UPCOMING_PAGE_SIZE; client lazy-loads more via the "Load more" button.
    supabase
      .from("events")
      .select("*")
      .gte("start_date", today)
      .lte("start_date", endOf2030)
      .order("start_date", { ascending: true })
      .limit(UPCOMING_PAGE_SIZE),
    // Past events — descending (most recent first), so the user sees fresh
    // history at the top of the Past tab. Smaller cap; the historical tail
    // is rarely scrolled in full.
    supabase
      .from("events")
      .select("*")
      .gte("start_date", twoYearsAgo)
      .lt("start_date", today)
      .order("start_date", { ascending: false })
      .limit(PAST_PAGE_SIZE),
    // Total count over the same window, for the page subtitle. head:true
    // means PostgREST returns the count only; no rows.
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("start_date", twoYearsAgo)
      .lte("start_date", endOf2030),
    getLocationFromIp(ip).catch(() => null),
    fetchFeatured(today),
  ]);

  // Merge upcoming + past for the client. Both come pre-sorted; we put
  // upcoming first so the client's existing "upcoming first" filter logic
  // continues to work unchanged. Past is reversed so the combined array is
  // still ascending by start_date for the calendar view.
  const events: EventRow[] = [
    ...((pastData as EventRow[] | null) ?? []).slice().reverse(),
    ...((upcomingData as EventRow[] | null) ?? []),
  ];
  const nearby = location ? await fetchNearby(location, today).catch(() => []) : [];

  // Auto-hide the Featured strip when fewer than 3 featured events have a real
  // banner. A wall of gradient-only cards reads as broken; the SDG fallback in
  // the main grid is fine, but the strip is supposed to be visually rich.
  const featuredWithBanners = featured.filter(e => !!e.banner_image_url);
  const featuredForStrip = featuredWithBanners.length >= 3 ? featuredWithBanners : [];

  // Background banner backfill for the upcoming events shown on this page.
  // waitUntil keeps the loop alive after the response is sent so each render
  // chips away at the pool of bannerless events.
  backfillBannersAsync(
    events
      .filter(e => !e.banner_image_url && e.start_date >= today)
      .map(e => ({ id: e.id, title: e.title, sdg_goals: e.sdg_goals }))
  );

  // Resolve org logos for events visible on this page so cards can show the
  // small org-logo badge over the banner (matches the homepage treatment).
  const orgNames = Array.from(
    new Set(
      events
        .filter(e => e.start_date >= today)
        .map(e => e.organization)
        .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
    )
  );
  const orgLogos = await batchGetLogos(orgNames).catch(() => ({} as Record<string, string>));

  const searchQuery = searchParams.q?.trim() ?? "";
  const banner = await getPageBanner("events").catch(() => null);

  const upcomingLoaded = ((upcomingData as EventRow[] | null) ?? []).length;
  const pastLoaded = ((pastData as EventRow[] | null) ?? []).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 font-sans">
      <Navbar />

      <PageHeader
        pageKey="events"
        title="Events"
        subtitle={`${(totalCount ?? events.length).toLocaleString()} events across all SDG goals`}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Events" }]}
        banner={banner}
      />

      <EventsClient
        events={events}
        initialSearch={searchQuery}
        today={today}
        featured={featuredForStrip}
        nearby={nearby}
        nearbyCountryName={location?.country_name ?? null}
        orgLogos={orgLogos}
        initialUpcomingLoaded={upcomingLoaded}
        initialPastLoaded={pastLoaded}
        upcomingHasMore={upcomingLoaded === UPCOMING_PAGE_SIZE}
        pastHasMore={pastLoaded === PAST_PAGE_SIZE}
        windowStartIso={twoYearsAgo}
        windowEndIso={endOf2030}
      />
    </div>
  );
}
