import { NextRequest, NextResponse } from "next/server";
import { fetchRegionBanner } from "@/lib/regions/fetchRegionBanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { slug?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const result = await fetchRegionBanner(slug, body.query);
  if (result.status === "success") {
    return NextResponse.json({ banner_image_url: result.url, query: result.query, source: "pexels" });
  }
  if (result.status === "not_found") {
    return NextResponse.json({ banner_image_url: null, query: result.query, message: "No Pexels result" });
  }
  return NextResponse.json({ error: result.message ?? "Pexels fetch failed", query: result.query }, { status: 502 });
}
