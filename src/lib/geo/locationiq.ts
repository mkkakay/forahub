// LocationIQ geocoding (free tier 5K/day, ~2 req/sec).
// Requires LOCATIONIQ_API_KEY env var. When the key is missing this module
// returns { error: 'no_key' } so callers can fall back to Nominatim.

const ENDPOINT = "https://us1.locationiq.com/v1/search";
const FETCH_TIMEOUT_MS = 5_000;

export interface LocationIqResult {
  lat: number;
  lng: number;
  country_code: string | null;
  raw: Record<string, unknown>;
}

export type LocationIqError = "no_key" | "no_match" | "rate_limited" | "http_error" | "timeout" | "unknown";

export interface LocationIqResponse {
  ok: boolean;
  data?: LocationIqResult;
  error?: LocationIqError;
  message?: string;
}

interface RawHit {
  lat?: string;
  lon?: string;
  address?: { country_code?: string };
  display_name?: string;
}

export async function geocodeWithLocationIQ(location: string): Promise<LocationIqResponse> {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) return { ok: false, error: "no_key" };

  const q = location.trim();
  if (!q) return { ok: false, error: "no_match", message: "empty location" };

  const params = new URLSearchParams({
    key: apiKey,
    q,
    format: "json",
    limit: "1",
    addressdetails: "1",
    normalizecity: "1",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (res.status === 429) return { ok: false, error: "rate_limited" };
    if (!res.ok) return { ok: false, error: "http_error", message: `HTTP ${res.status}` };

    const body = (await res.json().catch(() => null)) as RawHit[] | { error?: string } | null;
    if (!body) return { ok: false, error: "unknown" };
    if (Array.isArray(body) && body.length === 0) return { ok: false, error: "no_match" };
    if (!Array.isArray(body)) {
      return { ok: false, error: "unknown", message: typeof body.error === "string" ? body.error : "no array body" };
    }

    const hit = body[0];
    const lat = hit?.lat ? Number(hit.lat) : NaN;
    const lng = hit?.lon ? Number(hit.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, error: "no_match" };

    return {
      ok: true,
      data: {
        lat,
        lng,
        country_code: hit.address?.country_code?.toUpperCase() ?? null,
        raw: { display_name: hit.display_name },
      },
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "unknown", message: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
