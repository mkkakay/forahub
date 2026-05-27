import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { geocodeLocation, isLocationIqConfigured } from "@/lib/geo/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 100;
// LocationIQ free tier: 2 req/sec. Nominatim: 1 req/sec. Use 500ms which is
// safe for LocationIQ; geocodeLocation enforces Nominatim's own 1.1s minimum
// internally, so when the fallback path runs the effective pacing tightens
// to ~1 req/sec automatically.
const PACING_MS = 500;

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminKey = req.headers.get("x-admin-key");
  return !!adminSecret && adminKey === adminSecret;
}

interface CandidateEvent {
  id: string;
  location: string | null;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await adminSupabase
    .from("events")
    .select("id, location")
    .is("latitude", null)
    .is("geocode_status", null)
    .in("format", ["in_person", "hybrid"])
    .order("start_date", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = (data ?? []) as CandidateEvent[];
  const summary = {
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    remaining: 0,
    provider_warning: isLocationIqConfigured()
      ? null
      : "LOCATIONIQ_API_KEY not set — falling back to Nominatim (1 req/sec, no bulk).",
  };

  for (const event of events) {
    summary.processed += 1;
    const result = await geocodeLocation(event.location);
    const update = {
      latitude: result.lat ?? null,
      longitude: result.lng ?? null,
      geocode_status: result.status,
      geocode_error: result.error ?? null,
      geocoded_at: new Date().toISOString(),
    };
    try {
      const { error: updateErr } = await adminSupabase
        .from("events")
        .update(update)
        .eq("id", event.id);
      if (updateErr) {
        summary.failed += 1;
      } else if (result.status === "success") {
        summary.success += 1;
      } else if (result.status === "skipped") {
        summary.skipped += 1;
      } else {
        summary.failed += 1;
      }
    } catch {
      summary.failed += 1;
    }
    if (summary.processed < events.length) {
      await new Promise(r => setTimeout(r, PACING_MS));
    }
  }

  const { count } = await adminSupabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .is("latitude", null)
    .is("geocode_status", null)
    .in("format", ["in_person", "hybrid"]);
  summary.remaining = count ?? 0;

  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ count: withCoords }, { count: pending }, { count: failed }, { data: lastFailed }] = await Promise.all([
    adminSupabase.from("events").select("id", { count: "exact", head: true }).not("latitude", "is", null),
    adminSupabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .is("latitude", null)
      .is("geocode_status", null)
      .in("format", ["in_person", "hybrid"]),
    adminSupabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("geocode_status", "failed"),
    adminSupabase
      .from("events")
      .select("id, title, location, geocode_error")
      .eq("geocode_status", "failed")
      .order("geocoded_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    locationiq_configured: isLocationIqConfigured(),
    with_coords: withCoords ?? 0,
    pending: pending ?? 0,
    failed: failed ?? 0,
    last_failed: lastFailed ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { action?: string };
  try { body = await req.json(); } catch { body = {}; }
  if (body.action !== "retry_failed") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const { error, count } = await adminSupabase
    .from("events")
    .update({ geocode_status: null, geocode_error: null }, { count: "exact" })
    .eq("geocode_status", "failed");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cleared: count ?? 0 });
}
