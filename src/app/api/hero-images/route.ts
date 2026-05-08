import { NextRequest, NextResponse } from "next/server";

const EXCLUDE_TERMS = [
  "boardroom", "office meeting", "laptop", "business meeting",
  "handshake", "corporate", "whiteboard", "cubicle",
];

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
  };
}

function isExcluded(photo: PexelsPhoto): boolean {
  const text = `${photo.alt} ${photo.photographer}`.toLowerCase();
  return EXCLUDE_TERMS.some(term => text.includes(term));
}

function pickBest(photos: PexelsPhoto[]): PexelsPhoto | null {
  const filtered = photos.filter(p => !isExcluded(p));
  const pool = filtered.length >= 3 ? filtered : photos;
  // Pick the photo with the largest total pixel area (proxy for editorial quality)
  return pool.reduce<PexelsPhoto | null>(
    (best, p) => (!best || p.width * p.height > best.width * best.height ? p : best),
    null
  );
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ url: null, error: "Missing q parameter" }, { status: 400 });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ url: null, error: "Pexels API key not configured" }, { status: 500 });
  }

  try {
    let photo: PexelsPhoto | null = null;

    if (query.startsWith("id:")) {
      const photoId = query.slice(3).trim();
      const res = await fetch(
        `https://api.pexels.com/v1/photos/${photoId}`,
        {
          headers: { Authorization: apiKey },
          next: { revalidate: 86400 },
        }
      );
      if (!res.ok) {
        return NextResponse.json({ url: null, error: `Pexels error ${res.status}` }, { status: 502 });
      }
      photo = await res.json();
    } else {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=10`,
        {
          headers: { Authorization: apiKey },
          next: { revalidate: 86400 },
        }
      );
      if (!res.ok) {
        return NextResponse.json({ url: null, error: `Pexels error ${res.status}` }, { status: 502 });
      }
      const data = await res.json();
      const photos: PexelsPhoto[] = data.photos ?? [];
      photo = pickBest(photos);
    }
    const url: string | null =
      photo?.src?.large2x ?? photo?.src?.large ?? photo?.src?.original ?? null;

    return NextResponse.json(
      { url },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json({ url: null, error: "Fetch failed" }, { status: 500 });
  }
}
