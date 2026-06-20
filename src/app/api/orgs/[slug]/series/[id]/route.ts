// PATCH  /api/orgs/[slug]/series/[id]  — edit "this and all future"
// DELETE /api/orgs/[slug]/series/[id]  — cancel future occurrences
//
// EDIT SEMANTICS
// - The PATCH updates the series rule and the shared event-template fields,
//   then rewrites every FUTURE non-exception occurrence in place. Past
//   occurrences are left untouched (history is sacred). is_exception=true
//   occurrences are left untouched (a manager explicitly diverged that one).
// - If the rrule itself changes, future non-exception rows are deleted and
//   re-materialized from the new rule. If the rrule is unchanged but only
//   shared fields changed, we UPDATE those columns in place to avoid
//   churning event IDs (better for permalinks).
//
// CANCEL SEMANTICS
// - DELETE flips event_series.status='cancelled' and marks every FUTURE
//   non-exception occurrence is_cancelled=true / status='cancelled'. Past
//   occurrences stay (audit). Exceptions stay (manager promised those).

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";
import {
  enumerateOccurrences,
  horizonWindow,
  persistOccurrences,
  type SeriesRow,
} from "@/lib/series/engine";
import { RRule } from "rrule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  rrule?: string;
  series_title?: string;
  series_description?: string | null;
  organization?: string;
  registration_url?: string | null;
  format?: string;
  location?: string | null;
  online_url?: string | null;
  sdg_goals?: number[];
  category?: string | null;
  start_time_local?: string;
  duration_minutes?: number;
  timezone?: string;
  until_date?: string | null;
  occurrence_count?: number | null;
}

function trimOrNull(v: unknown, max = 1000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

async function requireSeriesManager(slug: string, seriesId: string): Promise<{ ok: true; userId: string; series: SeriesRow } | { ok: false; status: number; error: string }> {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return { ok: false, status: 401, error: "signin_required" };
  if (!(await isOrgManager(slug, user.id))) {
    return { ok: false, status: 403, error: "not_a_manager" };
  }
  const { data: row } = await adminSupabase
    .from("event_series")
    .select("*")
    .eq("id", seriesId)
    .maybeSingle();
  if (!row) return { ok: false, status: 404, error: "series_not_found" };
  const series = row as SeriesRow;
  if (series.org_slug !== slug) {
    // Cross-org tamper: the caller manages slug A but tried to edit a
    // series belonging to slug B. Behave as if it doesn't exist.
    return { ok: false, status: 404, error: "series_not_found" };
  }
  return { ok: true, userId: user.id, series };
}

export async function PATCH(req: NextRequest, ctx: { params: { slug: string; id: string } }) {
  const guard = await requireSeriesManager(ctx.params.slug, ctx.params.id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: PatchBody;
  try { body = (await req.json()) as PatchBody; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const series = guard.series;
  const patch: Record<string, unknown> = {};

  if (typeof body.series_title === "string") {
    const t = trimOrNull(body.series_title, 300);
    if (t) patch.series_title = t;
  }
  if ("series_description" in body) patch.series_description = trimOrNull(body.series_description, 5000);
  if (typeof body.organization === "string") {
    const o = trimOrNull(body.organization, 200);
    if (o) patch.organization = o;
  }
  if ("registration_url" in body) patch.registration_url = trimOrNull(body.registration_url, 600);
  if (typeof body.format === "string" && (body.format === "in_person" || body.format === "virtual" || body.format === "hybrid")) {
    patch.format = body.format;
  }
  if ("location" in body) patch.location = trimOrNull(body.location, 500);
  if ("online_url" in body) patch.online_url = trimOrNull(body.online_url, 600);
  if (Array.isArray(body.sdg_goals)) {
    patch.sdg_goals = body.sdg_goals.filter(n => Number.isInteger(n) && n >= 1 && n <= 17);
  }
  if ("category" in body) patch.category = trimOrNull(body.category, 100);
  if (typeof body.start_time_local === "string" && /^\d{1,2}:\d{2}/.test(body.start_time_local)) {
    patch.start_time_local = body.start_time_local;
  }
  if (typeof body.duration_minutes === "number" && body.duration_minutes > 0) {
    patch.duration_minutes = Math.floor(body.duration_minutes);
  }
  if (typeof body.timezone === "string") patch.timezone = body.timezone;
  if ("until_date" in body) patch.until_date = body.until_date ?? null;
  if ("occurrence_count" in body) patch.occurrence_count = body.occurrence_count ?? null;

  let rruleChanged = false;
  if (typeof body.rrule === "string") {
    const r = trimOrNull(body.rrule, 1000);
    if (r) {
      try { RRule.parseString(r); }
      catch { return NextResponse.json({ error: "rrule_invalid" }, { status: 400 }); }
      if (r !== series.rrule) {
        patch.rrule = r;
        rruleChanged = true;
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_editable_fields" }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const { error: updSeriesErr } = await adminSupabase
    .from("event_series")
    .update(patch)
    .eq("id", series.id);
  if (updSeriesErr) return NextResponse.json({ error: updSeriesErr.message }, { status: 500 });

  // Reload the (now-updated) series so the regeneration uses the new shape.
  const { data: refreshedRow } = await adminSupabase
    .from("event_series")
    .select("*")
    .eq("id", series.id)
    .single();
  const refreshed = refreshedRow as SeriesRow;

  const nowIso = new Date().toISOString();
  let occurrencesDeleted = 0;
  let occurrencesInserted = 0;
  let occurrencesUpdated = 0;

  if (rruleChanged || "start_time_local" in patch || "duration_minutes" in patch || "until_date" in patch || "occurrence_count" in patch) {
    // Recurrence shape changed — future non-exception rows must be re-mat'd.
    const { data: delRows, error: delErr } = await adminSupabase
      .from("events")
      .delete()
      .eq("series_id", series.id)
      .eq("is_exception", false)
      .eq("is_cancelled", false)
      .gte("start_date", nowIso)
      .select("id");
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    occurrencesDeleted = (delRows ?? []).length;
    const { from, to } = horizonWindow();
    const occs = enumerateOccurrences(refreshed, from, to);
    const persisted = await persistOccurrences({
      sb: adminSupabase,
      series: refreshed,
      occurrences: occs,
      // Inherit the series's current auto-publish posture. If the series was
      // auto-published at creation, the regenerated future occurrences
      // remain published. Otherwise they remain pending. The cap counter is
      // already paid — we don't re-charge.
      status: refreshed.auto_published_at ? "published" : "pending",
      autoPublishedByUserId: refreshed.auto_published_by_user_id,
    });
    occurrencesInserted = persisted.inserted;
  } else {
    // Only shared fields changed — UPDATE in place so permalinks survive.
    const sharedPatch: Record<string, unknown> = {};
    if (patch.series_title) sharedPatch.title = patch.series_title;
    if ("series_description" in patch) sharedPatch.description = patch.series_description;
    if (patch.organization) sharedPatch.organization = patch.organization;
    if ("registration_url" in patch) sharedPatch.registration_url = patch.registration_url;
    if ("format" in patch) sharedPatch.format = patch.format;
    if ("location" in patch) sharedPatch.location = patch.location;
    if ("online_url" in patch) sharedPatch.online_url = patch.online_url;
    if ("sdg_goals" in patch) sharedPatch.sdg_goals = patch.sdg_goals;
    if ("category" in patch) sharedPatch.category = patch.category;
    if (Object.keys(sharedPatch).length > 0) {
      const { data: updRows, error: updEvErr } = await adminSupabase
        .from("events")
        .update(sharedPatch)
        .eq("series_id", series.id)
        .eq("is_exception", false)
        .eq("is_cancelled", false)
        .gte("start_date", nowIso)
        .select("id");
      if (updEvErr) return NextResponse.json({ error: updEvErr.message }, { status: 500 });
      occurrencesUpdated = (updRows ?? []).length;
    }
  }

  return NextResponse.json({
    success: true,
    rrule_changed: rruleChanged,
    occurrences_deleted: occurrencesDeleted,
    occurrences_inserted: occurrencesInserted,
    occurrences_updated: occurrencesUpdated,
    message: rruleChanged
      ? `Series updated. ${occurrencesInserted} future occurrences regenerated.`
      : `Series updated. ${occurrencesUpdated} future occurrences refreshed.`,
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: { slug: string; id: string } }) {
  const guard = await requireSeriesManager(ctx.params.slug, ctx.params.id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const series = guard.series;

  const nowIso = new Date().toISOString();

  const { error: sErr } = await adminSupabase
    .from("event_series")
    .update({ status: "cancelled", updated_at: nowIso })
    .eq("id", series.id);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // Cancel future non-exception occurrences. Exceptions are left alone
  // because the manager promised those specifically.
  const { data: cancelled, error: evErr } = await adminSupabase
    .from("events")
    .update({
      is_cancelled: true,
      status: "cancelled",
    })
    .eq("series_id", series.id)
    .eq("is_exception", false)
    .gte("start_date", nowIso)
    .select("id");
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    occurrences_cancelled: (cancelled ?? []).length,
    message: `Series cancelled. ${(cancelled ?? []).length} future occurrence(s) hidden from the manage page.`,
  });
}
