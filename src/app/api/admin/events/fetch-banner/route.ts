import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchEventBannerDetailed } from "@/lib/events/fetchEventBanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_SECRET;
  return !!expected && key === expected;
}

interface EventRow {
  id: string;
  title: string;
  organization: string | null;
  registration_url: string | null;
  sdg_goals: number[] | null;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event_id?: string; variant?: boolean };
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
    .select("id, title, organization, registration_url, sdg_goals")
    .eq("id", eventId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const event = data as EventRow;
  const result = await fetchEventBannerDetailed({
    id: event.id,
    title: event.title,
    organization: event.organization,
    registration_url: event.registration_url,
    sdg_goals: event.sdg_goals,
    variant: !!body.variant,
  });

  return NextResponse.json({
    event_id: eventId,
    banner_image_url: result.url,
    source: result.source,
    query: result.query,
  });
}
