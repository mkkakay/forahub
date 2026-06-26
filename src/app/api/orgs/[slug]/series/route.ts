// GET  /api/orgs/[slug]/series  — list series for the manage panel
// POST /api/orgs/[slug]/series  — create a new series + materialize horizon
//
// Auth: caller must be a verified manager of `slug` (server-side
// isOrgManager, not just the UI). Public / anonymous / non-managers
// cannot create series — the cap-evaluator's not_a_manager outcome covers
// that path on POST. GET returns 403 for non-managers.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";
import { evaluateAutoPublish } from "@/lib/orgs/autoPublish";
import {
  enumerateOccurrences,
  horizonWindow,
  persistOccurrences,
  type SeriesRow,
} from "@/lib/series/engine";
import { RRule } from "rrule";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  rrule?: string;
  timezone?: string;
  start_time_local?: string;
  duration_minutes?: number;
  series_title?: string;
  series_description?: string;
  organization?: string;
  registration_url?: string;
  format?: string;
  location?: string;
  online_url?: string;
  sdg_goals?: number[];
  category?: string;
  event_type?: string;
  until_date?: string | null;
  occurrence_count?: number | null;
}

function trimOrNull(v: unknown, max = 1000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

export async function GET(_req: NextRequest, ctx: { params: { slug: string } }) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "signin_required" }, { status: 401 });
  if (!(await isOrgManager(ctx.params.slug, user.id))) {
    return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  }

  const { data: series, error } = await adminSupabase
    .from("event_series")
    .select("id, series_title, organization, format, location, online_url, registration_url, timezone, start_time_local, duration_minutes, rrule, until_date, occurrence_count, status, auto_published_at, created_at, updated_at, last_horizon_at")
    .eq("org_slug", ctx.params.slug)
    .order("created_at", { ascending: false });
  if (error) return sanitizeApiError(error, "orgs/:slug/series", 500);

  // Per-series occurrence counters so the panel can show "12 upcoming · 4 past".
  const seriesList = (series ?? []) as Array<Record<string, unknown> & { id: string }>;
  const nowIso = new Date().toISOString();
  const counts = await Promise.all(seriesList.map(async (s) => {
    const [upcoming, past, exceptions, cancelled] = await Promise.all([
      adminSupabase.from("events").select("id", { count: "exact", head: true }).eq("series_id", s.id).eq("is_cancelled", false).gte("start_date", nowIso),
      adminSupabase.from("events").select("id", { count: "exact", head: true }).eq("series_id", s.id).eq("is_cancelled", false).lt("start_date", nowIso),
      adminSupabase.from("events").select("id", { count: "exact", head: true }).eq("series_id", s.id).eq("is_exception", true),
      adminSupabase.from("events").select("id", { count: "exact", head: true }).eq("series_id", s.id).eq("is_cancelled", true),
    ]);
    return {
      series_id: s.id,
      upcoming: upcoming.count ?? 0,
      past: past.count ?? 0,
      exceptions: exceptions.count ?? 0,
      cancelled: cancelled.count ?? 0,
    };
  }));
  const countsMap = new Map(counts.map(c => [c.series_id, c]));
  const seriesWithCounts = seriesList.map(s => ({ ...s, _counts: countsMap.get(s.id) }));

  return NextResponse.json({ series: seriesWithCounts });
}

export async function POST(req: NextRequest, ctx: { params: { slug: string } }) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user || !user.email_confirmed_at) {
    return NextResponse.json({ error: "signin_required" }, { status: 401 });
  }
  if (!(await isOrgManager(ctx.params.slug, user.id))) {
    return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  }

  let body: CreateBody;
  try { body = (await req.json()) as CreateBody; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const title = trimOrNull(body.series_title, 300);
  const organization = trimOrNull(body.organization, 200);
  const rrule = trimOrNull(body.rrule, 1000);
  if (!title) return NextResponse.json({ error: "series_title_required" }, { status: 400 });
  if (!organization) return NextResponse.json({ error: "organization_required" }, { status: 400 });
  if (!rrule) return NextResponse.json({ error: "rrule_required" }, { status: 400 });

  // Validate rrule parseability before we touch the DB.
  try { RRule.parseString(rrule); }
  catch { return NextResponse.json({ error: "rrule_invalid" }, { status: 400 }); }

  const duration = typeof body.duration_minutes === "number" && body.duration_minutes > 0
    ? Math.floor(body.duration_minutes)
    : 60;
  const startTime = (body.start_time_local ?? "09:00:00").trim() || "09:00:00";
  const tz = (body.timezone ?? "UTC").trim() || "UTC";
  const format = (body.format === "in_person" || body.format === "virtual" || body.format === "hybrid")
    ? body.format
    : "in_person";

  // Cap evaluation. The series CREATION consumes the cap slot — not each
  // occurrence. evaluateAutoPublish now also counts event_series rows so a
  // single creation = 1 of N per 24h.
  const eva = await evaluateAutoPublish({ orgSlug: ctx.params.slug, userId: user.id });
  let occurrenceStatus: "published" | "pending";
  let seriesAutoPublishedAt: string | null = null;
  let capInfo: { recent: number; cap: number; windowHours: number } | null = null;
  if (eva.outcome === "publish") {
    occurrenceStatus = "published";
    seriesAutoPublishedAt = new Date().toISOString();
  } else if (eva.outcome === "cap_hit") {
    occurrenceStatus = "pending";
    capInfo = { recent: eva.recent, cap: eva.cap, windowHours: eva.windowHours };
  } else {
    // not_granted: invited / admin-reviewed manager without the toggle.
    // not_a_manager shouldn't happen here (we gated above), but fall safely.
    occurrenceStatus = "pending";
  }

  // Insert the series record first so occurrences have a parent FK.
  const { data: insertedSeries, error: insErr } = await adminSupabase
    .from("event_series")
    .insert({
      org_slug: ctx.params.slug,
      created_by_user_id: user.id,
      rrule,
      timezone: tz,
      start_time_local: startTime,
      duration_minutes: duration,
      series_title: title,
      series_description: trimOrNull(body.series_description, 5000),
      organization,
      registration_url: trimOrNull(body.registration_url, 600),
      format,
      location: trimOrNull(body.location, 500),
      online_url: trimOrNull(body.online_url, 600),
      sdg_goals: Array.isArray(body.sdg_goals) ? body.sdg_goals.filter(n => Number.isInteger(n) && n >= 1 && n <= 17) : [],
      category: trimOrNull(body.category, 100),
      event_type: trimOrNull(body.event_type, 50) ?? "webinar",
      until_date: body.until_date ?? null,
      occurrence_count: body.occurrence_count ?? null,
      status: "active",
      auto_published_at: seriesAutoPublishedAt,
      auto_published_by_user_id: seriesAutoPublishedAt ? user.id : null,
      last_horizon_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (insErr || !insertedSeries) {
    return sanitizeApiError(insErr, "orgs/:slug/series", 500);
  }
  const series = insertedSeries as SeriesRow;

  // Materialize the initial horizon. Bounded by SERIES_HORIZON_DAYS AND
  // MAX_OCCURRENCES_PER_RUN inside enumerateOccurrences.
  const { from, to } = horizonWindow();
  const occurrences = enumerateOccurrences(series, from, to);
  const persisted = await persistOccurrences({
    sb: adminSupabase,
    series,
    occurrences,
    status: occurrenceStatus,
    autoPublishedByUserId: seriesAutoPublishedAt ? user.id : null,
  });

  return NextResponse.json({
    success: true,
    series_id: series.id,
    occurrences_planned: occurrences.length,
    occurrences_inserted: persisted.inserted,
    status: occurrenceStatus,
    cap_hit: capInfo,
    message: occurrenceStatus === "published"
      ? `${persisted.inserted} occurrences are live now — your series will keep generating future dates automatically.`
      : capInfo
        ? `${persisted.inserted} occurrences saved. ${organization} has hit its ${capInfo.cap}-per-${capInfo.windowHours}h soft cap, so these go through review.`
        : `${persisted.inserted} occurrences saved and queued for admin review.`,
  });
}
