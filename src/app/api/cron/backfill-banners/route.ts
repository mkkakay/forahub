import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchEventBannerDetailed, type BannerSource } from "@/lib/events/fetchEventBanner";
import { safeEqual } from "@/lib/security/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 50;
const PACING_MS = 600;

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (safeEqual(bearer, process.env.CRON_SECRET)) return true;
  return safeEqual(req.headers.get("x-admin-key"), process.env.ADMIN_SECRET);
}

interface CandidateEvent {
  id: string;
  title: string;
  sdg_goals: number[] | null;
}

async function runBackfill() {
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, sdg_goals")
    .is("banner_image_url", null)
    .order("start_date", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) throw new Error(error.message);

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

  return summary;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runBackfill();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

export type BackfillResult = {
  ok: boolean;
  processed: number;
  success: number;
  pexels_hits: number;
  unsplash_hits: number;
  failures: number;
  source?: BannerSource | null;
};
