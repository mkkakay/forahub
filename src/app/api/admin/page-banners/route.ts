// Admin API for page header banners.
//   GET   → list all rows
//   PATCH → update a row's image_url, overlay_level, or is_active

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { invalidatePageBannerCache } from "@/lib/pageBanners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

const VALID_LEVELS = new Set(["light", "medium", "dark"]);

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await adminSupabase
    .from("page_banners")
    .select("id, page_key, image_url, overlay_level, is_active, updated_at")
    .order("page_key", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { page_key?: string; image_url?: string | null; overlay_level?: string; is_active?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const pageKey = (body.page_key ?? "").trim();
  if (!pageKey) return NextResponse.json({ error: "page_key required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let imageUrlChanging: string | null | undefined;
  if ("image_url" in body) {
    const url = typeof body.image_url === "string" ? body.image_url.trim() : null;
    imageUrlChanging = url && url.length > 0 ? url : null;
    patch.image_url = imageUrlChanging;
  }
  if ("overlay_level" in body && typeof body.overlay_level === "string") {
    if (!VALID_LEVELS.has(body.overlay_level)) {
      return NextResponse.json({ error: "overlay_level must be light|medium|dark" }, { status: 400 });
    }
    patch.overlay_level = body.overlay_level;
  }
  if ("is_active" in body && typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  } else if (imageUrlChanging) {
    // Auto-enable when a fresh image URL is being set and the caller didn't
    // explicitly opt out. Saves the admin from a two-step "paste URL → also
    // flip the toggle" interaction that was being missed in practice.
    patch.is_active = true;
  } else if (imageUrlChanging === null && !("is_active" in body)) {
    // Clearing the image — implicitly deactivate so we don't render a broken
    // image attempt.
    patch.is_active = false;
  }

  const { data, error } = await adminSupabase
    .from("page_banners")
    .update(patch)
    .eq("page_key", pageKey)
    .select("id, page_key, image_url, overlay_level, is_active, updated_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "page_key not found" }, { status: 404 });

  invalidatePageBannerCache();
  return NextResponse.json({ data });
}
