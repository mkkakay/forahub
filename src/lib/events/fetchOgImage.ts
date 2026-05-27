// Try to extract a usable banner image from a third-party event page by
// scraping the page's og:image / twitter:image meta tag, then validating the
// candidate (HTTPS, image MIME, ≥600px wide, not a logo, not a favicon).

const FETCH_TIMEOUT_MS = 10_000;
const MIN_WIDTH = 600;
const MIN_LANDSCAPE_RATIO = 1.3;
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0";

const LOGO_HINTS = ["logo", "icon", "favicon", "avatar", "sprite"];

function looksLikeLogoUrl(url: string): boolean {
  const lc = url.toLowerCase();
  return LOGO_HINTS.some(h => lc.includes(h));
}

function resolveUrl(rawSrc: string, base: string): string | null {
  try {
    return new URL(rawSrc, base).toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*;q=0.8,*/*;q=0.5",
        ...(init?.headers ?? {}),
      },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractMetaContent(html: string, property: string): string | null {
  // Match both attribute orders: property=…content=… and content=…property=…
  // Anchor on a non-greedy span and a case-insensitive flag.
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const r of patterns) {
    const m = html.match(r);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

async function probeImage(url: string): Promise<{ width: number; height: number } | null> {
  const res = await fetchWithTimeout(url, { method: "HEAD" });
  if (!res || !res.ok) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return null;

  // HEAD can't give us dimensions; we have to fetch enough of the body to
  // parse PNG/JPEG/WebP image headers. Streaming the first ~32KB is enough.
  const get = await fetchWithTimeout(url);
  if (!get || !get.ok) return null;
  const buf = new Uint8Array(await get.arrayBuffer().catch(() => new ArrayBuffer(0)));
  const dim = parseImageDimensions(buf);
  return dim;
}

function parseImageDimensions(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 24) return null;

  // PNG: signature 89 50 4E 47 0D 0A 1A 0A, IHDR at offset 16 → 4 bytes width, 4 bytes height
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    const width = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
    const height = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
    if (width > 0 && height > 0) return { width, height };
  }

  // JPEG: scan SOFn markers
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
      if ((marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)) {
        const height = (b[i + 5] << 8) | b[i + 6];
        const width = (b[i + 7] << 8) | b[i + 8];
        if (width > 0 && height > 0) return { width, height };
        break;
      }
      const segLen = (b[i + 2] << 8) | b[i + 3];
      if (segLen < 2) break;
      i += 2 + segLen;
    }
  }

  // WebP: 'RIFF' .. 'WEBP' .. 'VP8 '|'VP8L'|'VP8X'
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    // VP8X (extended) → width/height-1 at bytes 24..29 little endian, 3 bytes each
    if (b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x58) {
      const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
      const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
      if (width > 0 && height > 0) return { width, height };
    }
    // VP8L lossless → bits packed; width/height-1 in next 4 bytes after signature byte
    if (b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x4c) {
      const b0 = b[21], b1 = b[22], b2 = b[23], b3 = b[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (width > 0 && height > 0) return { width, height };
    }
    // VP8 lossy → width/height at bytes 26..29 (each 2 bytes, lower 14 bits)
    if (b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x20) {
      const width = ((b[27] << 8) | b[26]) & 0x3fff;
      const height = ((b[29] << 8) | b[28]) & 0x3fff;
      if (width > 0 && height > 0) return { width, height };
    }
  }

  return null;
}

/**
 * Returns a usable og:image URL or null. Validates HTTPS, MIME, dimensions,
 * landscape ratio, and filename heuristics so we don't end up serving a logo
 * as the banner.
 */
export async function tryOgImageFromUrl(pageUrl: string): Promise<string | null> {
  if (!pageUrl) return null;
  let normalized: string;
  try {
    normalized = new URL(pageUrl).toString();
  } catch {
    return null;
  }

  const res = await fetchWithTimeout(normalized);
  if (!res || !res.ok) return null;
  const html = await res.text().catch(() => "");
  if (!html) return null;

  const rawCandidate =
    extractMetaContent(html, "og:image") ??
    extractMetaContent(html, "og:image:url") ??
    extractMetaContent(html, "twitter:image") ??
    extractMetaContent(html, "twitter:image:src");
  if (!rawCandidate) return null;

  const absolute = resolveUrl(rawCandidate, normalized);
  if (!absolute) return null;
  if (!absolute.startsWith("https://")) return null;
  if (looksLikeLogoUrl(absolute)) return null;

  const dim = await probeImage(absolute);
  if (!dim) return null;
  if (dim.width < MIN_WIDTH) return null;
  if (dim.width / Math.max(1, dim.height) < MIN_LANDSCAPE_RATIO) return null;

  return absolute;
}
