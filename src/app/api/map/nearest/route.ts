// Nearest-events endpoint.
//
// SUSTAINABILITY: bounding-box pre-filter BEFORE Haversine.
// We compute a small lat/lng box around the origin, push that down to Postgres
// (using the existing idx_events_coords partial index), then run Haversine only
// on the candidate rows. Distance is never computed across the whole table.
//
// Radius doubles once (4×) if fewer than 3 results, then gives up. Results are
// cached by rounded coordinates (~11 km grid) for 60s so users in the same
// city share the cache.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const DEFAULT_RADIUS_KM = 500;
const RADIUS_EXPANSION = 4;
const MIN_RESULTS_BEFORE_EXPANSION = 3;
const CACHE_TTL_MS = 60_000;

interface NearestEvent {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  banner_image_url: string | null;
  banner_display_mode: "contain" | "cover" | null;
  sdg_goals: number[] | null;
  format: string | null;
  distance_km: number;
}

interface NearestResponse {
  events: NearestEvent[];
  origin: { lat: number; lng: number };
  radius_used_km: number;
  expanded: boolean;
}

const cache = new Map<string, { at: number; value: NearestResponse }>();

function cacheKey(lat: number, lng: number, limit: number, radius: number): string {
  return `${lat.toFixed(1)}|${lng.toFixed(1)}|${limit}|${radius}`;
}

interface CandidateRow {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  banner_image_url: string | null;
  banner_display_mode: "contain" | "cover" | null;
  sdg_goals: number[] | null;
  format: string | null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.cos(toRad(lng1) - toRad(lng2)) +
    Math.sin(toRad(lat1)) * Math.sin(toRad(lat2));
  const clamped = Math.min(1, Math.max(-1, a)); // guards acos domain
  return 6371 * Math.acos(clamped);
}

async function searchWithinRadius(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
  nowIso: string
): Promise<NearestEvent[]> {
  // BBox prefilter: lat span is constant (1° ≈ 111 km), lng span depends on
  // latitude. At 60° N the lng degree is ~55 km, so we widen by 1/cos(lat).
  const latSpan = radiusKm / 111.0;
  const cosLat = Math.max(0.0001, Math.cos((lat * Math.PI) / 180));
  const lngSpan = radiusKm / (111.0 * cosLat);

  const { data, error } = await adminSupabase
    .from("events")
    .select(
      "id, title, organization, start_date, end_date, location, latitude, longitude, banner_image_url, banner_display_mode, sdg_goals, format"
    )
    .gte("latitude", lat - latSpan)
    .lte("latitude", lat + latSpan)
    .gte("longitude", lng - lngSpan)
    .lte("longitude", lng + lngSpan)
    .in("format", ["in_person", "hybrid"])
    .gte("start_date", nowIso)
    .order("start_date", { ascending: true })
    .limit(500);

  if (error || !data) return [];

  const candidates = data as CandidateRow[];
  // Haversine only over the candidate set; then filter by exact radius and
  // sort by distance.
  const measured: NearestEvent[] = [];
  for (const r of candidates) {
    if (r.latitude == null || r.longitude == null) continue;
    const dist = haversineKm(lat, lng, r.latitude, r.longitude);
    if (dist > radiusKm) continue;
    measured.push({ ...r, distance_km: Math.round(dist) });
  }
  measured.sort((a, b) => a.distance_km - b.distance_km);
  return measured.slice(0, limit);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const limit = Math.max(1, Math.min(50, Number(sp.get("limit") ?? DEFAULT_LIMIT)));
  const radiusKmRaw = Math.max(10, Math.min(5000, Number(sp.get("radius_km") ?? DEFAULT_RADIUS_KM)));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "invalid lat/lng" }, { status: 400 });
  }

  const key = cacheKey(lat, lng, limit, radiusKmRaw);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return jsonOk(cached.value);
  }

  const nowIso = new Date().toISOString();
  let events = await searchWithinRadius(lat, lng, radiusKmRaw, limit, nowIso);
  let radiusUsed = radiusKmRaw;
  let expanded = false;
  if (events.length < MIN_RESULTS_BEFORE_EXPANSION) {
    const expandedRadius = Math.min(radiusKmRaw * RADIUS_EXPANSION, 5000);
    if (expandedRadius > radiusKmRaw) {
      const more = await searchWithinRadius(lat, lng, expandedRadius, limit, nowIso);
      if (more.length > events.length) {
        events = more;
        radiusUsed = expandedRadius;
        expanded = true;
      }
    }
  }

  const response: NearestResponse = {
    events,
    origin: { lat, lng },
    radius_used_km: radiusUsed,
    expanded,
  };
  cache.set(key, { at: Date.now(), value: response });
  return jsonOk(response);
}

function jsonOk(payload: unknown) {
  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}
