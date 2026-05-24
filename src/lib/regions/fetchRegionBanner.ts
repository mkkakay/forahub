import { adminSupabase } from "@/lib/supabase/admin";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const FETCH_TIMEOUT_MS = 12_000;

// Default landmark queries per region — picked for iconic, instantly-recognizable imagery.
const DEFAULT_QUERIES: Record<string, string> = {
  "africa":          "Mount Kilimanjaro Tanzania",
  "asia-pacific":    "Marina Bay Sands Singapore skyline",
  "middle-east":     "Burj Khalifa Dubai",
  "americas":        "Christ the Redeemer Rio de Janeiro",
  "europe":          "Eiffel Tower Paris",
  "pacific-islands": "Bora Bora island beach",
};

export function getDefaultRegionQuery(slug: string): string {
  return DEFAULT_QUERIES[slug] ?? `${slug} landmark`;
}

interface PexelsPhoto {
  src?: { large2x?: string; landscape?: string; large?: string; original?: string };
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

function pickPhotoUrl(payload: PexelsResponse): string | null {
  const first = payload.photos?.[0];
  if (!first?.src) return null;
  return first.src.large2x ?? first.src.landscape ?? first.src.large ?? first.src.original ?? null;
}

export async function fetchRegionBanner(slug: string, queryOverride?: string): Promise<{
  url: string | null;
  query: string;
  status: "success" | "not_found" | "error";
  message?: string;
}> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return { url: null, query: "", status: "error", message: "PEXELS_API_KEY not configured" };

  const query = (queryOverride?.trim() || getDefaultRegionQuery(slug)).trim();
  if (!query) return { url: null, query: "", status: "error", message: "Empty query" };

  const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      signal: controller.signal,
    });
    if (!res.ok) return { url: null, query, status: "error", message: `Pexels HTTP ${res.status}` };
    const payload = (await res.json()) as PexelsResponse;
    const photoUrl = pickPhotoUrl(payload);
    if (!photoUrl) return { url: null, query, status: "not_found" };

    await adminSupabase
      .from("regions")
      .update({ banner_image_url: photoUrl, updated_at: new Date().toISOString() })
      .eq("slug", slug);

    return { url: photoUrl, query, status: "success" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { url: null, query, status: "error", message: "Pexels request timed out" };
    }
    return { url: null, query, status: "error", message: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(t);
  }
}
