// Public read endpoint for a single page banner. Used by client-component
// pages that can't await getPageBanner() server-side. Cached for 60 s on the
// edge so repeated client renders share the response.

import { NextRequest, NextResponse } from "next/server";
import { getPageBanner } from "@/lib/pageBanners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: { key: string } }) {
  const key = (ctx.params.key ?? "").trim();
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const banner = await getPageBanner(key).catch(() => null);
  return new NextResponse(JSON.stringify({ banner }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}
