import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchAndCacheLogo } from "@/lib/organizations/getLogoUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { organization_name?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orgName = (body.organization_name ?? "").trim();
  if (!orgName) {
    return NextResponse.json({ error: "organization_name required" }, { status: 400 });
  }

  // Cache hit (unless force=true)
  if (!body.force) {
    const { data } = await adminSupabase
      .from("organization_logos")
      .select("logo_url, status, domain")
      .eq("organization_name", orgName)
      .maybeSingle();

    if (data?.status === "success" && data.logo_url) {
      return NextResponse.json({
        logo_url: data.logo_url,
        domain: data.domain,
        source: "cache",
      });
    }
  }

  const result = await fetchAndCacheLogo(orgName);

  if (result.status === "success") {
    return NextResponse.json({
      logo_url: result.logoUrl,
      source: "brandfetch",
    });
  }
  if (result.status === "not_found") {
    return NextResponse.json({
      logo_url: null,
      source: null,
      message: result.message ?? "No logo found",
    });
  }
  return NextResponse.json(
    { error: result.message ?? "Brandfetch error", source: null },
    { status: 502 }
  );
}
