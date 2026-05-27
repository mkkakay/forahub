// One-time bulk migration to populate banners on the historical backlog.
// After every event has banner_image_url (or banner_source) set, this route
// becomes a no-op and can be safely deleted.
//
// Usage:
//   curl -H "x-admin-key: $ADMIN_SECRET" https://forahub.org/api/migrate/backfill-banners-once
//
// Caps at 500 events per invocation with 600ms pacing — roughly 5 minutes per
// call, which matches the function's 300s max duration. Re-run until the
// summary shows processed === 0.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchEventBannerDetailed } from "@/lib/events/fetchEventBanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 500;
const PACING_MS = 600;

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminKey = req.headers.get("x-admin-key");
  return !!adminSecret && adminKey === adminSecret;
}

interface CandidateEvent {
  id: string;
  title: string;
  sdg_goals: number[] | null;
  organization: string | null;
  registration_url: string | null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Honor the 7-day failure backoff — events the chain has already tried
  // recently and missed on are skipped until the backoff window expires.
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, sdg_goals, organization, registration_url")
    .is("banner_image_url", null)
    .or(`banner_fetched_at.is.null,banner_fetched_at.lt.${cutoff}`)
    .order("start_date", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (data ?? []) as CandidateEvent[];
  const summary = {
    processed: 0,
    success: 0,
    og_image_hits: 0,
    wikimedia_hits: 0,
    pexels_hits: 0,
    unsplash_hits: 0,
    failures: 0,
    remaining_after: 0,
  };

  for (const event of events) {
    summary.processed += 1;
    try {
      const result = await fetchEventBannerDetailed({
        id: event.id,
        title: event.title,
        sdg_goals: event.sdg_goals,
        organization: event.organization,
        registration_url: event.registration_url,
      });
      if (result.url) {
        summary.success += 1;
        if (result.source === "og_image") summary.og_image_hits += 1;
        else if (result.source === "wikimedia") summary.wikimedia_hits += 1;
        else if (result.source === "pexels") summary.pexels_hits += 1;
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

  const { count } = await adminSupabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .is("banner_image_url", null)
    .or(`banner_fetched_at.is.null,banner_fetched_at.lt.${cutoff}`);
  summary.remaining_after = count ?? 0;

  return NextResponse.json({
    ok: true,
    ...summary,
    next_step: summary.remaining_after > 0
      ? `Re-run this endpoint; ${summary.remaining_after} events still need banners.`
      : "Done — every event has a banner. You can delete this route file now.",
  });
}
