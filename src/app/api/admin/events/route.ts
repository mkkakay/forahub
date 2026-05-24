import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
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
    .select("id, title, organization, start_date, end_date, sdg_goals, banner_image_url, banner_fetched_at")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
