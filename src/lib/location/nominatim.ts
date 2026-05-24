// Nominatim (OpenStreetMap) client for location autocomplete.
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/
//   - Max 1 request/second per app
//   - Unique User-Agent required
//   - No bulk geocoding
//
// We enforce both the global rate limit AND a per-session in-memory cache.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "ForaHub/1.0 (https://forahub.org)";
const MIN_INTERVAL_MS = 1100; // a hair over 1s to be safe

export interface LocationResult {
  display_name: string;     // "Brussels, Belgium"
  city: string | null;       // "Brussels"
  country: string | null;    // "Belgium"
  country_code: string | null; // "be" (ISO 3166-1 alpha-2, lowercase)
  lat: number;
  lon: number;
}

interface NominatimRaw {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

const cache = new Map<string, LocationResult[]>();
let lastFetchAt = 0;
let chainTail: Promise<unknown> = Promise.resolve();

function gatedFetch(url: string): Promise<Response> {
  // Chain calls so they execute serially with ≥ MIN_INTERVAL_MS between them.
  const next = chainTail.then(async () => {
    const elapsed = Date.now() - lastFetchAt;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
    lastFetchAt = Date.now();
    return fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  });
  // Swallow errors in the chain so one failure doesn't break the queue.
  chainTail = next.catch(() => {});
  return next as Promise<Response>;
}

function format(raw: NominatimRaw): LocationResult | null {
  if (!raw.display_name || raw.lat == null || raw.lon == null) return null;
  const a = raw.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? null;
  const cc = (a.country_code ?? "").toLowerCase() || null;
  return {
    display_name: raw.display_name,
    city,
    country: a.country ?? null,
    country_code: cc,
    lat: Number(raw.lat),
    lon: Number(raw.lon),
  };
}

export async function searchCities(query: string): Promise<LocationResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8`;
  let raw: NominatimRaw[];
  try {
    const res = await gatedFetch(url);
    if (!res.ok) return [];
    raw = (await res.json()) as NominatimRaw[];
  } catch {
    return [];
  }
  const results = raw
    .map(format)
    .filter((r): r is LocationResult => r !== null)
    // Prefer entries with a recognizable city + country.
    .sort((a, b) => {
      const aScore = (a.city ? 1 : 0) + (a.country ? 1 : 0);
      const bScore = (b.city ? 1 : 0) + (b.country ? 1 : 0);
      return bScore - aScore;
    });
  cache.set(cacheKey, results);
  return results;
}

export function flagEmoji(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  const cc = countryCode.toUpperCase();
  // Regional indicator symbols start at U+1F1E6 (= 'A')
  const a = 0x1f1e6 + (cc.charCodeAt(0) - 65);
  const b = 0x1f1e6 + (cc.charCodeAt(1) - 65);
  return String.fromCodePoint(a, b);
}

export function formatLocation(loc: LocationResult): string {
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  if (loc.country) return loc.country;
  return loc.display_name.split(",").slice(0, 2).join(", ");
}
