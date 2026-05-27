// Wikimedia Commons image lookup for famous, recurring events that have
// historical photo coverage (UN General Assembly, COP, WHA, Davos, G7/G20…).
// We use Commons' OpenSearch+ImageInfo to pick a landscape photo of the
// venue/event rather than a Pexels stock image.

const FETCH_TIMEOUT_MS = 8_000;
const MIN_WIDTH = 800;
const MIN_LANDSCAPE_RATIO = 1.3;

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

interface WikiImageInfo {
  url?: string;
  width?: number;
  height?: number;
  mime?: string;
}

interface WikiPage {
  title?: string;
  imageinfo?: WikiImageInfo[];
}

interface WikiResponse {
  query?: { pages?: Record<string, WikiPage> };
}

const REJECT_FILENAME_HINTS = [
  "logo", "icon", "favicon",
  "map", "diagram", "chart", "graph", "plot",
  "portrait", "headshot", "selfie",
  "drawing", "sketch", "cartoon", "illustration",
  "coat_of_arms", "flag_of_", "emblem", "seal",
  ".svg",
];

function isUnwantedTitle(title: string): boolean {
  const lc = title.toLowerCase();
  return REJECT_FILENAME_HINTS.some(h => lc.includes(h));
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        // Wikimedia asks API consumers to identify themselves.
        "User-Agent": "ForaHub/1.0 (https://forahub.org) banner-resolver",
        Accept: "application/json",
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Query Wikimedia Commons for a landscape photo matching `query`. Filters out
 * maps, portraits, drawings, and undersized images. Returns the first usable
 * file URL, or null.
 */
export async function tryWikimediaImage(query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|size|mime",
    generator: "search",
    gsrsearch: trimmed,
    gsrlimit: "10",
    gsrnamespace: "6",
  });

  const res = await fetchWithTimeout(`${COMMONS_API}?${params.toString()}`);
  if (!res || !res.ok) return null;

  const json = (await res.json().catch(() => null)) as WikiResponse | null;
  const pages = json?.query?.pages;
  if (!pages) return null;

  const candidates = Object.values(pages);
  for (const page of candidates) {
    if (!page.title || isUnwantedTitle(page.title)) continue;
    const info = page.imageinfo?.[0];
    if (!info?.url || !info.width || !info.height) continue;
    if (!info.mime?.startsWith("image/")) continue;
    if (info.mime === "image/svg+xml") continue;
    if (info.width < MIN_WIDTH) continue;
    if (info.width / Math.max(1, info.height) < MIN_LANDSCAPE_RATIO) continue;
    return info.url;
  }

  return null;
}

const WIKIMEDIA_TRIGGERS: { pattern: RegExp; query: string }[] = [
  { pattern: /\bun\s+general\s+assembly|unga\b/i, query: "United Nations General Assembly hall" },
  { pattern: /\bgeneral\s+assembly\b.*\bun\b|\bun\b.*\bgeneral\s+assembly\b/i, query: "United Nations General Assembly" },
  { pattern: /\bcop\s*\d{1,3}\b/i, query: "UN Climate Change Conference COP" },
  { pattern: /\bworld\s+health\s+assembly|\bwha\b/i, query: "World Health Assembly Geneva" },
  { pattern: /\bhlpf\b|high[-\s]?level\s+political\s+forum/i, query: "High-Level Political Forum United Nations" },
  { pattern: /\bdavos\b|world\s+economic\s+forum/i, query: "World Economic Forum Davos" },
  { pattern: /\bg20\s+summit\b|\bg20\b/i, query: "G20 summit leaders" },
  { pattern: /\bg7\s+summit\b|\bg7\b/i, query: "G7 summit leaders" },
  { pattern: /munich\s+security\s+conference|\bmsc\s+\d{4}/i, query: "Munich Security Conference" },
];

/**
 * If the event title matches one of the famous-event patterns, return a
 * Wikimedia query string aimed at that event. Returns null if the event isn't
 * one we'd expect Wikimedia to have good coverage of.
 */
export function wikimediaQueryForTitle(title: string): string | null {
  if (!title) return null;
  for (const entry of WIKIMEDIA_TRIGGERS) {
    if (entry.pattern.test(title)) return entry.query;
  }
  return null;
}
