/**
 * Event banner fetcher — 5-layer priority chain.
 *
 *   1. Admin-uploaded banner          (stored URL, never overwritten)
 *   2. og:image from registration_url (event's own page — best fit)
 *   3. Wikimedia Commons              (famous recurring events only)
 *   4. Pexels (title+org keywords)    (stock landscape photo)
 *   5. Unsplash                       (fallback stock photo)
 *   — gradient + SDG icon rendered by the UI when all five miss.
 *
 * Query construction (Pexels/Unsplash):
 *   • Up to 4 keywords from the event title (stopwords stripped, critical
 *     short tokens like UN/WHO/COP preserved).
 *   • Org short_name appended after title keywords if not already present.
 *   • One SDG-themed query appended last as topical context.
 *
 * Cache: 60 days. Persisted on events.banner_image_url + banner_fetched_at,
 * with banner_source ('og_image' | 'wikimedia' | 'pexels' | 'unsplash') and
 * banner_query stored for debugging / admin tooling.
 *
 * Admin re-roll: POST /api/admin/events/fetch-banner with { variant: true }
 * skips the cache and rotates strategy (different SDG query + skip first
 * Pexels/Unsplash result) to produce a different image on each click.
 */
import { adminSupabase } from "@/lib/supabase/admin";
import { waitUntil } from "@vercel/functions";
import { getSdgQueries } from "./sdgQueries";
import { tryOgImageFromUrl } from "./fetchOgImage";
import { tryWikimediaImage, wikimediaQueryForTitle } from "./wikimedia";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const UNSPLASH_SEARCH = "https://api.unsplash.com/search/photos";
const CACHE_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days
const FAILURE_BACKOFF_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 10_000;
const MIN_UNSPLASH_WIDTH = 1200;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "for", "to", "in", "on", "at",
  "by", "with", "from", "as", "is", "are", "was", "were", "be", "this",
  "that", "these", "those", "&", "-", "—", "vs", "vs.", "via", "about",
  "annual", "session", "th", "st", "nd", "rd",
  "workshop", "webinar", "online", "virtual", "global", "world",
  "international", "national", "regional", "event", "meeting",
]);

// Short uppercase acronyms that must survive keyword extraction.
const PROTECTED_TOKENS = new Set([
  "un", "who", "eu", "au", "oecd", "imf", "cop", "hlpf", "sdg", "ngo", "unga",
  "wha", "wto", "g7", "g20", "msc", "imo", "wfp", "ilo", "iom", "unicef",
]);

const RELEVANCE_HINTS = [
  "people", "conference", "meeting", "summit", "audience", "speaker",
  "professional", "business", "workshop", "presentation", "discussion",
];

export type BannerSource = "og_image" | "wikimedia" | "pexels" | "unsplash";

export interface EventForBanner {
  id: string;
  title: string;
  sdg_goals: number[] | null;
  registration_url?: string | null;
  organization?: string | null;
  /** When true: skip cache, rotate strategy (different SDG query, skip first
   *  Pexels/Unsplash result) to produce a different image. */
  variant?: boolean;
}

export interface FetchBannerOptions {
  variant?: boolean;
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

function extractTitleKeywords(title: string, max = 4): string[] {
  const tokens = (title ?? "")
    .replace(/[^A-Za-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  for (const raw of tokens) {
    const lc = raw.toLowerCase();
    const protectedToken = PROTECTED_TOKENS.has(lc);
    if (!protectedToken && lc.length < 3) continue;
    if (STOPWORDS.has(lc)) continue;
    // Preserve original casing for protected tokens so Pexels sees "UN" not "un".
    out.push(protectedToken ? raw.toUpperCase() : lc);
    if (out.length >= max) break;
  }
  return out;
}

function extractOrgKeyword(organization: string | null | undefined, alreadyInTitle: string[]): string | null {
  if (!organization) return null;
  const cleaned = organization.replace(/[^A-Za-z0-9\s-]/g, " ").trim();
  if (!cleaned) return null;
  // Prefer the acronym form when the org name contains one (e.g. "African
  // Development Bank (AfDB)" → "AfDB").
  const acroMatch = cleaned.match(/\(([A-Za-z]{2,8})\)/);
  if (acroMatch) {
    const acro = acroMatch[1];
    if (!alreadyInTitle.some(w => w.toLowerCase() === acro.toLowerCase())) return acro;
  }
  // Otherwise take the first two short-name tokens.
  const orgTokens = cleaned.split(/\s+/).filter(t => t.length >= 2).slice(0, 2);
  if (orgTokens.length === 0) return null;
  const joined = orgTokens.join(" ");
  if (alreadyInTitle.some(w => joined.toLowerCase().includes(w))) return null;
  return joined;
}

function pickSdgQuery(sdg: number | null, variant: boolean, seed: number): string {
  const candidates = getSdgQueries(sdg);
  if (variant) {
    // Rotate through deterministically so successive variant clicks land on
    // different queries each time.
    const idx = seed % candidates.length;
    return candidates[idx];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildQuery(event: EventForBanner, variant = false, seed = 0): string {
  const titleWords = extractTitleKeywords(event.title);
  const orgPart = extractOrgKeyword(event.organization, titleWords);
  const sdgQuery = pickSdgQuery(event.sdg_goals?.[0] ?? null, variant, seed);
  const parts = [...titleWords];
  if (orgPart) parts.push(orgPart);
  parts.push(sdgQuery);
  return parts.join(" ").trim() || sdgQuery;
}

function isRelevant(text: string | null | undefined): boolean {
  if (!text) return false;
  const lc = text.toLowerCase();
  return RELEVANCE_HINTS.some(h => lc.includes(h));
}

function pickPexelsPhoto(photos: PexelsPhoto[], skip = 0): PexelsPhoto | null {
  const pool = photos.slice(skip);
  if (pool.length === 0) return null;
  const relevant = pool.find(p => isRelevant(p.alt));
  return relevant ?? pool[0];
}

function pexelsPhotoUrl(photo: PexelsPhoto): string | null {
  return photo.src?.large2x ?? photo.src?.landscape ?? photo.src?.large ?? photo.src?.original ?? null;
}

function pickUnsplashPhoto(photos: UnsplashPhoto[], skip = 0): UnsplashPhoto | null {
  const pool = photos.slice(skip);
  if (pool.length === 0) return null;
  const wideEnough = pool.find(p => (p.width ?? 0) >= MIN_UNSPLASH_WIDTH);
  if (wideEnough) {
    const relevant = pool.find(
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

async function fetchPexels(query: string, skip = 0): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;
  const perPage = Math.max(5, skip + 5);
  const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { Authorization: apiKey }, signal: controller.signal });
    if (!res.ok) return null;
    const payload = (await res.json()) as PexelsResponse;
    const best = pickPexelsPhoto(payload.photos ?? [], skip);
    return best ? pexelsPhotoUrl(best) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchUnsplash(query: string, skip = 0): Promise<string | null> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) return null;
  const perPage = Math.max(5, skip + 5);
  const url = `${UNSPLASH_SEARCH}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as UnsplashResponse;
    const best = pickUnsplashPhoto(payload.results ?? [], skip);
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
 * Fetch (or read from cache) a banner image for an event using the 5-layer
 * priority chain. Persists URL + source + query on events.* with 60-day TTL.
 *
 * With `variant: true`, the cache is bypassed and each call rotates the
 * SDG-query selection + skips one Pexels/Unsplash result. The skip count
 * increases each invocation so successive admin re-rolls produce different
 * images.
 */
let rerollSeed = 1;

export async function fetchEventBannerDetailed(event: EventForBanner): Promise<FetchBannerResult> {
  warnIfUnsplashMissing();
  const empty: FetchBannerResult = { url: null, source: null, query: "" };
  if (!event?.id) return empty;

  const variant = !!event.variant;
  const cached = await readCached(event.id).catch(() => null);
  if (!variant && cached?.banner_fetched_at) {
    const age = Date.now() - new Date(cached.banner_fetched_at).getTime();
    if (cached.banner_image_url && age < CACHE_TTL_MS) {
      return { url: cached.banner_image_url, source: null, query: "" };
    }
    // A recent attempt that returned nothing — back off so we don't hammer
    // the same unmatchable event on every page render or migration loop.
    if (!cached.banner_image_url && age < FAILURE_BACKOFF_MS) {
      return { url: null, source: null, query: "" };
    }
  }

  const seed = variant ? rerollSeed++ : 0;
  const skip = variant ? (seed % 4) + 1 : 0;
  const query = buildQuery(event, variant, seed);

  let url: string | null = null;
  let source: BannerSource | null = null;

  // Layer 2: og:image from the event's registration page (skipped on variant
  // since variant intent is "different stock image", not "different scrape").
  if (!variant && event.registration_url) {
    url = await tryOgImageFromUrl(event.registration_url).catch(() => null);
    if (url) source = "og_image";
  }

  // Layer 3: Wikimedia Commons for famous recurring events.
  if (!url) {
    const wikiQuery = wikimediaQueryForTitle(event.title);
    if (wikiQuery) {
      url = await tryWikimediaImage(wikiQuery).catch(() => null);
      if (url) source = "wikimedia";
    }
  }

  // Layer 4: Pexels with title + org + SDG query.
  if (!url) {
    url = await fetchPexels(query, skip);
    if (url) source = "pexels";
  }

  // Layer 5: Unsplash as final stock-photo fallback.
  if (!url) {
    url = await fetchUnsplash(query, skip);
    if (url) source = "unsplash";
  }

  if (!url) {
    // Record the attempt timestamp so the backoff above kicks in next time.
    await adminSupabase
      .from("events")
      .update({ banner_fetched_at: new Date().toISOString(), banner_query: query })
      .eq("id", event.id);
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

export async function fetchEventBanner(event: EventForBanner, opts: FetchBannerOptions = {}): Promise<string | null> {
  const result = await fetchEventBannerDetailed({ ...event, variant: opts.variant ?? event.variant });
  return result.url;
}

const PAGE_BACKFILL_PACING_MS = 600;
const PAGE_BACKFILL_CAP = 10;

/**
 * Background fetch for many events triggered from a page render. The work is
 * registered with Vercel's `waitUntil` so it keeps running after the response
 * is sent — without `waitUntil`, the serverless function would be torn down
 * mid-loop and most fetches would never complete.
 *
 * Caps at PAGE_BACKFILL_CAP per call so a single page render doesn't queue up
 * an enormous tail. The 600ms pacing keeps us under Pexels' 200/hr free tier.
 *
 * Locally (outside Vercel), `waitUntil` is a no-op shim — the loop still runs
 * but the dev server won't kill it. Skip silently if no events qualify.
 */
export function backfillBannersAsync(events: EventForBanner[]): void {
  const candidates = events
    .filter(e => e?.id && e.title)
    .slice(0, PAGE_BACKFILL_CAP);
  if (candidates.length === 0) return;

  const task = (async () => {
    for (let i = 0; i < candidates.length; i++) {
      try {
        await fetchEventBanner(candidates[i]);
      } catch {
        // best-effort backfill; one failure must not stop the rest
      }
      if (i < candidates.length - 1) {
        await new Promise(r => setTimeout(r, PAGE_BACKFILL_PACING_MS));
      }
    }
  })();

  try {
    waitUntil(task);
  } catch {
    // Outside a Vercel runtime, waitUntil throws — fall back to fire-and-forget.
    void task.catch(() => {});
  }
}
