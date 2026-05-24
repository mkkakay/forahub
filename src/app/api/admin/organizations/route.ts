import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getAllResolvedOrgs } from "@/lib/organizations/getResolvedOrg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set([
  "display_name",
  "short_name",
  "description",
  "manual_logo_url",
  "needs_dark_background",
  "brand_color",
  "is_featured",
  "display_order",
]);

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgs = await getAllResolvedOrgs();
  return NextResponse.json({ data: orgs });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const patch: Record<string, unknown> = { slug, updated_at: new Date().toISOString() };
  for (const k of Object.keys(body)) {
    if (k === "slug") continue;
    if (!ALLOWED_FIELDS.has(k)) continue;
    const v = body[k];
    if (k === "display_order") {
      patch[k] = typeof v === "number" ? v : Number(v) || 0;
    } else if (k === "needs_dark_background" || k === "is_featured") {
      patch[k] = Boolean(v);
    } else {
      // empty string → null (so the override stops shadowing the registry value)
      patch[k] = typeof v === "string" && v.trim() === "" ? null : v;
    }
  }

  const { data, error } = await adminSupabase
    .from("organization_overrides")
    .upsert(patch, { onConflict: "slug" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
