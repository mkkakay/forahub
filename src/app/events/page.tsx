import Link from "next/link";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import EventsClient from "./EventsClient";
import Navbar from "@/components/Navbar";
import { getLocationFromIp, type IpLocation } from "@/lib/geo/ipLocation";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export const dynamic = "force-dynamic";

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
  const [{ data: eventsData }, location, featured] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .gte("start_date", twoYearsAgo)
      .lte("start_date", endOf2030)
      .order("start_date", { ascending: true }),
    getLocationFromIp(ip).catch(() => null),
    fetchFeatured(today),
  ]);

  const events = (eventsData as EventRow[] | null) ?? [];
  const nearby = location ? await fetchNearby(location, today).catch(() => []) : [];

  // Auto-hide the Featured strip when fewer than 3 featured events have a real
  // banner. A wall of gradient-only cards reads as broken; the SDG fallback in
  // the main grid is fine, but the strip is supposed to be visually rich.
  const featuredWithBanners = featured.filter(e => !!e.banner_image_url);
  const featuredForStrip = featuredWithBanners.length >= 3 ? featuredWithBanners : [];

  const searchQuery = searchParams.q?.trim() ?? "";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      {/* Page header */}
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-300 text-sm mb-3">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Events</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Events</h1>
          <p className="mt-2 text-blue-200 text-sm">
            {events.length.toLocaleString()} events across all SDG goals
          </p>
        </div>
      </div>

      <EventsClient
        events={events}
        initialSearch={searchQuery}
        today={today}
        featured={featuredForStrip}
        nearby={nearby}
        nearbyCountryName={location?.country_name ?? null}
      />
    </div>
  );
}
