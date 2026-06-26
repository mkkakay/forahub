import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security/timing";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = new Set([
  "name", "short_name", "aliases", "org_type", "region", "domain",
  "logo_url", "tier", "is_verified", "description", "status",
]);

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const tier = sp.get("tier");
  const orgType = sp.get("org_type");
  const status = sp.get("status") ?? "active";
  const q = sp.get("q")?.trim() ?? "";
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? "100"), 1), 500);

  let query = adminSupabase
    .from("organizations_directory")
    .select("id, slug, name, short_name, aliases, org_type, region, domain, logo_url, tier, is_verified, description, source, status, submission_count, updated_at")
    .order("tier", { ascending: true })
    .order("name", { ascending: true })
    .limit(limit);

  if (status !== "all") query = query.eq("status", status);
  if (tier) query = query.eq("tier", Number(tier));
  if (orgType) query = query.eq("org_type", orgType);
  if (q) {
    const ilike = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`name.ilike.${ilike},short_name.ilike.${ilike},slug.ilike.${ilike}`);
  }

  const { data, error } = await query;
  if (error) return sanitizeApiError(error, "admin/directory", 500);
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of Object.keys(body)) {
    if (k === "id") continue;
    if (!ALLOWED_FIELDS.has(k)) continue;
    const v = body[k];
    if (k === "tier") {
      patch[k] = typeof v === "number" ? v : Number(v) || 2;
    } else if (k === "is_verified") {
      patch[k] = Boolean(v);
    } else if (k === "aliases") {
      // Accept array OR comma-separated string.
      if (Array.isArray(v)) patch[k] = v.filter(x => typeof x === "string");
      else if (typeof v === "string") patch[k] = v.split(",").map(s => s.trim()).filter(Boolean);
    } else {
      patch[k] = typeof v === "string" && v.trim() === "" ? null : v;
    }
  }

  const { data, error } = await adminSupabase
    .from("organizations_directory")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return sanitizeApiError(error, "admin/directory", 500);
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await adminSupabase
    .from("organizations_directory")
    .delete()
    .eq("id", id);
  if (error) return sanitizeApiError(error, "admin/directory", 500);
  return NextResponse.json({ ok: true });
}
