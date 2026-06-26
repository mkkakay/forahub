import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getAllRegions } from "@/lib/regions/getActiveRegions";
import { safeEqual } from "@/lib/security/timing";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set(["name", "description", "banner_image_url", "display_order", "is_active"]);

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const regions = await getAllRegions();
  return NextResponse.json({ data: regions });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { slug?: string; name?: string; description?: string; display_order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const name = (body.name ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data, error } = await adminSupabase
    .from("regions")
    .insert({
      slug,
      name,
      description: (body.description ?? "").trim() || null,
      display_order: typeof body.display_order === "number" ? body.display_order : 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return sanitizeApiError(error, "admin/regions", 500);
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of Object.keys(body)) {
    if (k === "slug") continue;
    if (!ALLOWED_FIELDS.has(k)) continue;
    const v = body[k];
    if (k === "display_order") {
      patch[k] = typeof v === "number" ? v : Number(v) || 0;
    } else if (k === "is_active") {
      patch[k] = Boolean(v);
    } else {
      patch[k] = typeof v === "string" && v.trim() === "" ? null : v;
    }
  }

  const { data, error } = await adminSupabase
    .from("regions")
    .update(patch)
    .eq("slug", slug)
    .select()
    .single();

  if (error) return sanitizeApiError(error, "admin/regions", 500);
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { error } = await adminSupabase.from("regions").delete().eq("slug", slug);
  if (error) return sanitizeApiError(error, "admin/regions", 500);
  return NextResponse.json({ ok: true });
}
