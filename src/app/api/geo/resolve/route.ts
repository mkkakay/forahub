// Server-side city resolver for the map. Wraps geocodeLocation() so the
// browser never needs the LocationIQ key. LocationIQ first (production-grade),
// Nominatim fallback when LocationIQ is unavailable.

import { NextRequest, NextResponse } from "next/server";
import { geocodeLocation } from "@/lib/geo/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ResolvedLocation {
  q: string;
  lat: number;
  lng: number;
  country_code: string | null;
  provider: "locationiq" | "nominatim";
}

const cache = new Map<string, { at: number; value: ResolvedLocation }>();

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ error: "q required (min 2 chars)" }, { status: 400 });

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.value);
  }

  const result = await geocodeLocation(q);
  if (result.status !== "success" || result.lat == null || result.lng == null) {
    return NextResponse.json(
      { error: result.error ?? "no_match", q },
      { status: 404 }
    );
  }

  const payload: ResolvedLocation = {
    q,
    lat: result.lat,
    lng: result.lng,
    country_code: result.country_code ?? null,
    provider: result.provider ?? "locationiq",
  };
  cache.set(key, { at: Date.now(), value: payload });
  return NextResponse.json(payload);
}
