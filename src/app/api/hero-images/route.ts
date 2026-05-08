import { NextRequest, NextResponse } from "next/server";

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
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=3`,
      {
        headers: { Authorization: apiKey },
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ url: null, error: `Pexels error ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const photo = data.photos?.[0];
    const url: string | null =
      photo?.src?.large2x ?? photo?.src?.large ?? photo?.src?.original ?? null;

    return NextResponse.json(
      { url },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        },
      }
    );
  } catch {
    return NextResponse.json({ url: null, error: "Fetch failed" }, { status: 500 });
  }
}
