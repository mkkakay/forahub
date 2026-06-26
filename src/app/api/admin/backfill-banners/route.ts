import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchEventBannerDetailed } from "@/lib/events/fetchEventBanner";
import { safeEqual } from "@/lib/security/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 50;
const PACING_MS = 600;

function isAuthorized(req: NextRequest): boolean {
  return safeEqual(req.headers.get("x-admin-key"), process.env.ADMIN_SECRET);
}

interface CandidateEvent {
  id: string;
  title: string;
  sdg_goals: number[] | null;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, sdg_goals")
    .is("banner_image_url", null)
    .order("start_date", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (data ?? []) as CandidateEvent[];
  const summary = {
    processed: 0,
    success: 0,
    pexels_hits: 0,
    unsplash_hits: 0,
    failures: 0,
  };

  for (const event of events) {
    summary.processed += 1;
    try {
      const result = await fetchEventBannerDetailed({
        id: event.id,
        title: event.title,
        sdg_goals: event.sdg_goals,
      });
      if (result.url) {
        summary.success += 1;
        if (result.source === "pexels") summary.pexels_hits += 1;
        else if (result.source === "unsplash") summary.unsplash_hits += 1;
      } else {
        summary.failures += 1;
      }
    } catch {
      summary.failures += 1;
    }
    if (summary.processed < events.length) {
      await new Promise(r => setTimeout(r, PACING_MS));
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}
