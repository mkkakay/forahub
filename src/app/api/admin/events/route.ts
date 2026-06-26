import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security/timing";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

/**
 * Admin events list for the banner-management UI. Shows upcoming events first
 * (start_date >= today, ascending), capped at 50.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString();
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, organization, start_date, end_date, sdg_goals, banner_image_url, banner_fetched_at, banner_display_mode, is_featured, featured_until")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(50);

  if (error) return sanitizeApiError(error, "admin/events", 500);
  return NextResponse.json({ data: data ?? [] });
}

/** Lightweight field updates for events from the admin UI (banner display mode toggle, etc.). */
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { event_id?: string; banner_display_mode?: string; is_featured?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = (body.event_id ?? "").trim();
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.banner_display_mode === "cover" || body.banner_display_mode === "contain") {
    patch.banner_display_mode = body.banner_display_mode;
  }
  if (typeof body.is_featured === "boolean") {
    patch.is_featured = body.is_featured;
    patch.featured_until = body.is_featured
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No supported fields to update" }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from("events")
    .update(patch)
    .eq("id", eventId)
    .select("id, banner_display_mode, is_featured, featured_until")
    .single();

  if (error) return sanitizeApiError(error, "admin/events", 500);
  return NextResponse.json({ data });
}
