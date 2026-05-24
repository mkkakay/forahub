// Shared Brandfetch v2 API client. Used by both the API route and the seed script.

const BRANDFETCH_API = "https://api.brandfetch.io/v2/brands";
const FETCH_TIMEOUT_MS = 10_000;

type BrandfetchFormat = {
  format?: string;
  src?: string;
  size?: number;
};

type BrandfetchLogo = {
  type?: string;
  theme?: string;
  formats?: BrandfetchFormat[];
};

type BrandfetchResponse = {
  logos?: BrandfetchLogo[];
};

export type BrandfetchResult =
  | { status: "success"; logoUrl: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

function pickBestLogoUrl(payload: BrandfetchResponse): string | null {
  const logos = payload.logos ?? [];
  if (logos.length === 0) return null;

  // Prefer type=logo, then type=symbol, then type=icon, then any.
  const typeOrder = ["logo", "symbol", "icon", "other"];
  const sortedLogos = [...logos].sort((a, b) => {
    const ai = typeOrder.indexOf(a.type ?? "other");
    const bi = typeOrder.indexOf(b.type ?? "other");
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Prefer light-theme (renders on the white tile we draw on the card).
  const themePreference = (l: BrandfetchLogo) => (l.theme === "light" ? 0 : l.theme === "dark" ? 2 : 1);
  sortedLogos.sort((a, b) => themePreference(a) - themePreference(b));

  // Format order: svg > png > webp > jpg/jpeg.
  const formatOrder = ["svg", "png", "webp", "jpeg", "jpg"];

  for (const logo of sortedLogos) {
    const formats = (logo.formats ?? []).filter(f => typeof f.src === "string");
    if (formats.length === 0) continue;
    const ranked = [...formats].sort((a, b) => {
      const ai = formatOrder.indexOf(a.format ?? "");
      const bi = formatOrder.indexOf(b.format ?? "");
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    if (ranked[0]?.src) return ranked[0].src;
  }

  return null;
}

export async function fetchFromBrandfetch(domain: string): Promise<BrandfetchResult> {
  const apiKey = process.env.BRANDFETCH_API_KEY;
  if (!apiKey) {
    return { status: "error", message: "BRANDFETCH_API_KEY not configured" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BRANDFETCH_API}/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });

    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) {
      return { status: "error", message: `Brandfetch returned HTTP ${res.status}` };
    }

    const payload = (await res.json()) as BrandfetchResponse;
    const logoUrl = pickBestLogoUrl(payload);
    if (!logoUrl) return { status: "not_found" };
    return { status: "success", logoUrl };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { status: "error", message: "Brandfetch request timed out after 10s" };
    }
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeoutId);
  }
}
