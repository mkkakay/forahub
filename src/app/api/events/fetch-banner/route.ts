import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchEventBanner } from "@/lib/events/fetchEventBanner";
import { safeEqual } from "@/lib/security/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return safeEqual(key, process.env.ADMIN_SECRET);
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = (body.event_id ?? "").trim();
  if (!eventId) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, sdg_goals, organization, registration_url")
    .eq("id", eventId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const bannerUrl = await fetchEventBanner({
    id: data.id,
    title: data.title,
    sdg_goals: data.sdg_goals,
    organization: data.organization,
    registration_url: data.registration_url,
  });

  return NextResponse.json({
    event_id: eventId,
    banner_image_url: bannerUrl,
  });
}
