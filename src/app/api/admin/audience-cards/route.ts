// Admin CRUD for the audience_cards table, which powers the "Who We Serve"
// section on /about. Same auth + service-role pattern as the other admin
// routes (x-admin-key header → ADMIN_SECRET, adminSupabase client).

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { invalidateAudienceCardsCache } from "@/lib/audienceCards";
import { safeEqual } from "@/lib/security/timing";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

const ALLOWED_PATCH_FIELDS = new Set([
  "label", "icon", "image_url", "link_url", "is_active", "sort_order",
  "bg_class", "icon_color_class",
]);

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error, count } = await adminSupabase
    .from("audience_cards")
    .select(
      "id, label, icon, image_url, link_url, bg_class, icon_color_class, sort_order, is_active, created_at, updated_at",
      { count: "exact" }
    )
    .order("sort_order", { ascending: true });
  if (error) return sanitizeApiError(error, "admin/audience-cards", 500);
  return new NextResponse(JSON.stringify({ data: data ?? [], count: count ?? 0 }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    label?: string;
    icon?: string | null;
    image_url?: string | null;
    link_url?: string | null;
    bg_class?: string | null;
    icon_color_class?: string | null;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });

  // sort_order = current max + 1 (or 1 if empty).
  const { data: maxRow, error: maxErr } = await adminSupabase
    .from("audience_cards")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) return sanitizeApiError(maxErr, "admin/audience-cards", 500);
  const nextSort = (maxRow?.sort_order ?? 0) + 1;

  const insert = {
    label,
    icon: typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : null,
    image_url: typeof body.image_url === "string" && body.image_url.trim() ? body.image_url.trim() : null,
    link_url: typeof body.link_url === "string" && body.link_url.trim() ? body.link_url.trim() : null,
    bg_class: typeof body.bg_class === "string" && body.bg_class.trim() ? body.bg_class.trim() : null,
    icon_color_class: typeof body.icon_color_class === "string" && body.icon_color_class.trim() ? body.icon_color_class.trim() : null,
    sort_order: nextSort,
    is_active: true,
  };
  const { data, error } = await adminSupabase
    .from("audience_cards")
    .insert(insert)
    .select("id, label, icon, image_url, link_url, bg_class, icon_color_class, sort_order, is_active, created_at, updated_at")
    .single();
  if (error) return sanitizeApiError(error, "admin/audience-cards", 500);

  invalidateAudienceCardsCache();
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of Object.keys(body)) {
    if (k === "id") continue;
    if (!ALLOWED_PATCH_FIELDS.has(k)) continue;
    const v = body[k];
    if (k === "is_active") {
      patch[k] = Boolean(v);
    } else if (k === "sort_order") {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) patch[k] = Math.trunc(n);
    } else if (k === "label") {
      if (typeof v !== "string") continue;
      const trimmed = v.trim();
      if (!trimmed) return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
      patch[k] = trimmed;
    } else {
      // icon / image_url / link_url / bg_class / icon_color_class — strings or null.
      if (v === null) patch[k] = null;
      else if (typeof v === "string") patch[k] = v.trim() === "" ? null : v.trim();
    }
  }

  const { data, error } = await adminSupabase
    .from("audience_cards")
    .update(patch)
    .eq("id", id)
    .select("id, label, icon, image_url, link_url, bg_class, icon_color_class, sort_order, is_active, created_at, updated_at")
    .maybeSingle();
  if (error) return sanitizeApiError(error, "admin/audience-cards", 500);
  if (!data) return NextResponse.json({ error: "id not found" }, { status: 404 });

  invalidateAudienceCardsCache();
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await adminSupabase
    .from("audience_cards")
    .delete()
    .eq("id", id);
  if (error) return sanitizeApiError(error, "admin/audience-cards", 500);

  invalidateAudienceCardsCache();
  return NextResponse.json({ ok: true });
}
