// Unified server-side geocoding entry point. Picks LocationIQ when the key is
// configured (fast, 5K/day), falls back to Nominatim otherwise (1 req/sec).
// Returns a normalized result so callers don't need to know which provider ran.

import { geocodeWithLocationIQ } from "./locationiq";
import { searchCities } from "@/lib/location/nominatim";

export type GeocodeStatus = "success" | "failed" | "skipped";

export interface GeocodeResult {
  status: GeocodeStatus;
  lat?: number;
  lng?: number;
  country_code?: string | null;
  provider?: "locationiq" | "nominatim";
  error?: string;
}

export interface GeocodeOptions {
  provider?: "locationiq" | "nominatim";
}

const ONLINE_PATTERN = /\b(online|virtual|webinar|zoom|teams|hybrid only)\b/i;

function isOnlinish(location: string): boolean {
  return ONLINE_PATTERN.test(location);
}

export function isLocationIqConfigured(): boolean {
  return !!process.env.LOCATIONIQ_API_KEY;
}

export async function geocodeLocation(
  location: string | null | undefined,
  opts: GeocodeOptions = {}
): Promise<GeocodeResult> {
  if (!location || !location.trim()) {
    return { status: "skipped", error: "empty location" };
  }
  if (isOnlinish(location)) {
    return { status: "skipped", error: "online-only event" };
  }

  const explicit = opts.provider;
  const tryLocationIq = explicit !== "nominatim" && isLocationIqConfigured();

  if (tryLocationIq) {
    const r = await geocodeWithLocationIQ(location);
    if (r.ok && r.data) {
      return {
        status: "success",
        lat: r.data.lat,
        lng: r.data.lng,
        country_code: r.data.country_code,
        provider: "locationiq",
      };
    }
    // LocationIQ definitively missed (no_match) — don't fall through to a
    // second provider that will produce a different, possibly contradictory
    // answer. Only fall through on transport/rate/key errors.
    if (r.error === "no_match") {
      return { status: "failed", error: r.error, provider: "locationiq" };
    }
    if (r.error && r.error !== "no_key") {
      // Try Nominatim as a graceful fallback when LocationIQ is unreachable.
    }
  }

  try {
    const results = await searchCities(location);
    if (results.length > 0) {
      const top = results[0];
      return {
        status: "success",
        lat: top.lat,
        lng: top.lon,
        country_code: top.country_code ? top.country_code.toUpperCase() : null,
        provider: "nominatim",
      };
    }
    return { status: "failed", error: "no_match", provider: "nominatim" };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      provider: "nominatim",
    };
  }
}
