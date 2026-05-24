import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchAndCacheLogo } from "@/lib/organizations/getLogoUrl";
import { ORG_REGISTRY } from "@/lib/organizations";

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

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  // Find the canonical org name to use as the cache key.
  const { data: override } = await adminSupabase
    .from("organization_overrides")
    .select("display_name")
    .eq("slug", slug)
    .maybeSingle();

  const registryEntry = ORG_REGISTRY[slug];
  const orgName = override?.display_name ?? registryEntry?.name ?? null;
  if (!orgName) {
    return NextResponse.json(
      { error: `No name resolvable for slug "${slug}". Set a display_name override first.` },
      { status: 400 }
    );
  }

  // Clear the existing cache row so the cooldown doesn't block the refetch.
  await adminSupabase
    .from("organization_logos")
    .delete()
    .eq("organization_name", orgName);

  const result = await fetchAndCacheLogo(orgName);
  return NextResponse.json({
    slug,
    organization_name: orgName,
    status: result.status,
    logo_url: result.logoUrl,
    message: result.message,
  });
}
