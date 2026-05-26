/**
 * Event banner fetcher.
 *
 * Query construction:
 *   - Pick one query from SDG_QUERY_MAP for event.sdg_goals[0] (fallback to
 *     a generic "global development conference" pair when no SDG).
 *   - Append 1–2 meaningful keywords pulled from the event title, with
 *     stopwords stripped.
 *
 * Fallback chain:
 *   1. Pexels (requires PEXELS_API_KEY) — landscape-oriented search.
 *   2. Unsplash (requires UNSPLASH_ACCESS_KEY) — only when Pexels returns
 *      nothing. Skipped silently if the key is missing (warn once at startup).
 *   3. Return null — the UI renders the SDG gradient + icon fallback.
 *
 * Cache: 60 days. Persisted on events.banner_image_url + banner_fetched_at,
 * with banner_source ('pexels' | 'unsplash') and banner_query stored for
 * debugging / admin tooling.
 *
 * Manual backfill: POST /api/admin/backfill-banners (admin-gated, 50/run).
 */
import { adminSupabase } from "@/lib/supabase/admin";
import { getSdgQueries } from "./sdgQueries";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const UNSPLASH_SEARCH = "https://api.unsplash.com/search/photos";
const CACHE_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
const FETCH_TIMEOUT_MS = 10_000;
const MIN_UNSPLASH_WIDTH = 1200;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "for", "to", "in", "on", "at",
  "by", "with", "from", "as", "is", "are", "was", "were", "be", "this",
  "that", "these", "those", "&", "-", "—", "vs", "vs.", "via", "about",
  "annual", "session", "summit", "forum", "meeting", "event", "th", "st", "nd", "rd",
  "conference", "workshop", "webinar", "online", "virtual", "global", "world",
  "international", "national", "regional",
]);

const RELEVANCE_HINTS = [
  "people", "conference", "meeting", "summit", "audience", "speaker",
  "professional", "business", "workshop", "presentation", "discussion",
];

export type BannerSource = "pexels" | "unsplash";

export interface EventForBanner {
  id: string;
  title: string;
  sdg_goals: number[] | null;
}

interface PexelsPhoto {
  src?: { large2x?: string; large?: string; landscape?: string; original?: string };
  alt?: string;
  width?: number;
  height?: number;
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

interface UnsplashPhoto {
  urls?: { full?: string; regular?: string; raw?: string };
  width?: number;
  alt_description?: string | null;
  description?: string | null;
}

interface UnsplashResponse {
  results?: UnsplashPhoto[];
}

interface CachedRow {
  banner_image_url: string | null;
  banner_fetched_at: string | null;
}

function extractTitleKeywords(title: string, max = 2): string[] {
  return (title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w))
    .slice(0, max);
}

function buildQuery(event: EventForBanner): string {
  const primarySdg = event.sdg_goals?.[0] ?? null;
  const candidates = getSdgQueries(primarySdg);
  const sdgQuery = candidates[Math.floor(Math.random() * candidates.length)];
  const titleWords = extractTitleKeywords(event.title);
  return [...titleWords, sdgQuery].join(" ").trim() || sdgQuery;
}

function isRelevant(text: string | null | undefined): boolean {
  if (!text) return false;
  const lc = text.toLowerCase();
  return RELEVANCE_HINTS.some(h => lc.includes(h));
}

function pickPexelsPhoto(photos: PexelsPhoto[]): PexelsPhoto | null {
  if (photos.length === 0) return null;
  const relevant = photos.find(p => isRelevant(p.alt));
  return relevant ?? photos[0];
}

function pexelsPhotoUrl(photo: PexelsPhoto): string | null {
  return photo.src?.large2x ?? photo.src?.landscape ?? photo.src?.large ?? photo.src?.original ?? null;
}

function pickUnsplashPhoto(photos: UnsplashPhoto[]): UnsplashPhoto | null {
  if (photos.length === 0) return null;
  const wideEnough = photos.find(p => (p.width ?? 0) >= MIN_UNSPLASH_WIDTH);
  if (wideEnough) {
    const relevant = photos.find(
      p => (p.width ?? 0) >= MIN_UNSPLASH_WIDTH && (isRelevant(p.alt_description) || isRelevant(p.description))
    );
    return relevant ?? wideEnough;
  }
  return null;
}

function unsplashPhotoUrl(photo: UnsplashPhoto): string | null {
  return photo.urls?.regular ?? photo.urls?.full ?? photo.urls?.raw ?? null;
}

async function readCached(eventId: string): Promise<CachedRow | null> {
  const { data } = await adminSupabase
    .from("events")
    .select("banner_image_url, banner_fetched_at")
    .eq("id", eventId)
    .maybeSingle();
  return (data as CachedRow | null) ?? null;
}

async function fetchPexels(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;
  const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Authorization: apiKey }, signal: controller.signal });
    if (!res.ok) return null;
    const payload = (await res.json()) as PexelsResponse;
    const best = pickPexelsPhoto(payload.photos ?? []);
    return best ? pexelsPhotoUrl(best) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchUnsplash(query: string): Promise<string | null> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) return null;
  const url = `${UNSPLASH_SEARCH}?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as UnsplashResponse;
    const best = pickUnsplashPhoto(payload.results ?? []);
    return best ? unsplashPhotoUrl(best) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

let unsplashWarned = false;
function warnIfUnsplashMissing(): void {
  if (unsplashWarned) return;
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.warn("[banner] UNSPLASH_ACCESS_KEY not set — falling back to Pexels-only mode.");
    unsplashWarned = true;
  }
}

export interface FetchBannerResult {
  url: string | null;
  source: BannerSource | null;
  query: string;
}

/**
 * Fetch (or read from cache) a banner image for an event.
 * Priority: SDG-aware query → Pexels → Unsplash → null.
 * Persists URL + source + query on events.* with 60-day TTL.
 */
export async function fetchEventBannerDetailed(event: EventForBanner): Promise<FetchBannerResult> {
  warnIfUnsplashMissing();
  const empty: FetchBannerResult = { url: null, source: null, query: "" };
  if (!event?.id) return empty;

  const cached = await readCached(event.id).catch(() => null);
  if (cached?.banner_image_url && cached.banner_fetched_at) {
    const age = Date.now() - new Date(cached.banner_fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      return { url: cached.banner_image_url, source: null, query: "" };
    }
  }

  const query = buildQuery(event);

  let url: string | null = null;
  let source: BannerSource | null = null;

  url = await fetchPexels(query);
  if (url) source = "pexels";

  if (!url) {
    url = await fetchUnsplash(query);
    if (url) source = "unsplash";
  }

  if (!url) {
    return { url: cached?.banner_image_url ?? null, source: null, query };
  }

  const now = new Date().toISOString();
  await adminSupabase
    .from("events")
    .update({
      banner_image_url: url,
      banner_fetched_at: now,
      banner_source: source,
      banner_query: query,
    })
    .eq("id", event.id);

  return { url, source, query };
}

export async function fetchEventBanner(event: EventForBanner): Promise<string | null> {
  const result = await fetchEventBannerDetailed(event);
  return result.url;
}

/**
 * Fire-and-forget background fetch for many events. Does not await — page render never blocks.
 */
export function backfillBannersAsync(events: EventForBanner[]): void {
  for (const event of events) {
    void fetchEventBanner(event).catch(() => {});
  }
}
