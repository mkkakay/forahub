import { adminSupabase } from "@/lib/supabase/admin";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FETCH_TIMEOUT_MS = 10_000;

const SDG_KEYWORDS: Record<number, string> = {
  1: "poverty community development",
  2: "agriculture food security",
  3: "health hospital medical",
  4: "education classroom learning",
  5: "women empowerment leadership",
  6: "water sanitation village",
  7: "renewable energy solar wind",
  8: "economic growth workplace",
  9: "technology innovation infrastructure",
  10: "diversity inclusion community",
  11: "sustainable city urban",
  12: "recycling sustainable",
  13: "climate environment nature",
  14: "ocean marine coral",
  15: "forest wildlife biodiversity",
  16: "peace justice diplomacy",
  17: "global partnership cooperation",
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "for", "to", "in", "on", "at",
  "by", "with", "from", "as", "is", "are", "was", "were", "be", "this",
  "that", "these", "those", "&", "-", "—", "vs", "vs.", "via", "about",
  "annual", "session", "summit", "forum", "meeting", "event", "th", "st", "nd", "rd",
]);

export interface EventForBanner {
  id: string;
  title: string;
  sdg_goals: number[] | null;
}

interface PexelsPhoto {
  src?: { large2x?: string; large?: string; landscape?: string; original?: string };
  alt?: string;
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

function buildQuery(event: EventForBanner): string {
  const words = (event.title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 5);

  const primarySdg = event.sdg_goals?.[0];
  const sdgKeywords = primarySdg && SDG_KEYWORDS[primarySdg] ? SDG_KEYWORDS[primarySdg] : "global conference";

  return [...words, sdgKeywords].join(" ").trim() || "global conference";
}

function pickBestPhoto(photos: PexelsPhoto[]): PexelsPhoto | null {
  if (photos.length === 0) return null;
  const TAG_HINTS = ["people", "conference", "meeting", "summit", "audience", "speaker"];
  const ranked = [...photos].sort((a, b) => {
    const aHit = TAG_HINTS.some(t => (a.alt ?? "").toLowerCase().includes(t)) ? 0 : 1;
    const bHit = TAG_HINTS.some(t => (b.alt ?? "").toLowerCase().includes(t)) ? 0 : 1;
    return aHit - bHit;
  });
  return ranked[0];
}

function photoUrl(photo: PexelsPhoto): string | null {
  return photo.src?.large2x ?? photo.src?.landscape ?? photo.src?.large ?? photo.src?.original ?? null;
}

async function readCached(eventId: string): Promise<{ banner_image_url: string | null; banner_fetched_at: string | null } | null> {
  const { data } = await adminSupabase
    .from("events")
    .select("banner_image_url, banner_fetched_at")
    .eq("id", eventId)
    .maybeSingle();
  return (data as { banner_image_url: string | null; banner_fetched_at: string | null } | null) ?? null;
}

/**
 * Fetch (or read from cache) a Pexels banner image for an event.
 * Persists the result on events.banner_image_url / banner_fetched_at.
 * Returns null if Pexels has no result or the API key is missing.
 */
export async function fetchEventBanner(event: EventForBanner): Promise<string | null> {
  if (!event?.id) return null;

  const cached = await readCached(event.id).catch(() => null);
  if (cached?.banner_image_url && cached.banner_fetched_at) {
    const age = Date.now() - new Date(cached.banner_fetched_at).getTime();
    if (age < CACHE_TTL_MS) return cached.banner_image_url;
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return cached?.banner_image_url ?? null;

  const query = buildQuery(event);
  const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let chosenUrl: string | null = null;
  try {
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: controller.signal,
    });
    if (!res.ok) {
      return cached?.banner_image_url ?? null;
    }
    const payload = (await res.json()) as PexelsResponse;
    const best = pickBestPhoto(payload.photos ?? []);
    chosenUrl = best ? photoUrl(best) : null;
  } catch {
    return cached?.banner_image_url ?? null;
  } finally {
    clearTimeout(t);
  }

  const now = new Date().toISOString();
  await adminSupabase
    .from("events")
    .update({
      banner_image_url: chosenUrl,
      banner_fetched_at: now,
    })
    .eq("id", event.id);

  return chosenUrl;
}

/**
 * Fire-and-forget background fetch for many events. Triggers fetchEventBanner
 * for any event missing a banner. Does not await — page render never blocks.
 */
export function backfillBannersAsync(events: EventForBanner[]): void {
  for (const event of events) {
    void fetchEventBanner(event).catch(() => {});
  }
}
