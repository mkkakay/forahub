// PATCH /api/orgs/[slug]/events/[id]
//
// Manager-edit endpoint for an org's event. Authorizes against
// isOrgManager(slug, auth.uid()) and the event's org_slug (so a manager of
// org A can't sneak an update to an event attributed to org B by passing
// A's slug in the URL).
//
// EDIT-RECHECK GUARD. If status='published' AND any "material" field
// changes value, the row gets needs_recheck=true so an admin reviews the
// change before the post-edit version is silently trusted. The edit still
// takes effect immediately — flagging is a heads-up, not a publish-time
// gate. Minor edits (dates, location text, format, capacity, cost, etc.)
// don't trigger the flag because they're the most common legitimate
// post-publish updates.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 5000;
const MAX_TITLE = 300;
const MAX_URL = 600;

// Fields a manager is allowed to edit through this endpoint, with their
// max length. Anything not listed here is rejected so we don't accidentally
// expose admin-only columns (status, auto_published_at, source_type, …).
const EDITABLE: Record<string, number> = {
  title: MAX_TITLE,
  description: MAX_TEXT,
  organization: MAX_TITLE,
  start_date: 0, // ISO string — validated by Date parser, not length
  end_date: 0,
  registration_deadline: 0,
  location: MAX_TITLE,
  online_url: MAX_URL,
  registration_url: MAX_URL,
  source_url: MAX_URL,
  capacity: -1, // number
  format: 50,
  recording_url: MAX_URL,
  banner_image_url: MAX_URL,
};

// "Material" fields. Edits here on an already-published row flip the
// needs_recheck flag. Reasoning: title/description/links/org-attribution
// carry the spam payload; times/locations are common legitimate edits.
const MATERIAL_FIELDS = new Set<string>([
  "title",
  "description",
  "organization",
  "registration_url",
  "online_url",
  "source_url",
]);

interface PatchBody {
  [k: string]: unknown;
  /** Set to true to cancel just this occurrence (hides from manage list,
   *  flips status='cancelled'). Implies is_exception=true so future
   *  series rewrites can't un-cancel it. */
  is_cancelled?: boolean;
}

function trimOrNull(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return max > 0 ? t.slice(0, max) : t;
}

export async function PATCH(req: NextRequest, ctx: { params: { slug: string; id: string } }) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "signin_required" }, { status: 401 });
  if (!(await isOrgManager(ctx.params.slug, user.id))) {
    return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  }

  let body: PatchBody;
  try { body = (await req.json()) as PatchBody; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  // Load the current row so we can (a) confirm it belongs to this org and
  // (b) diff material fields against the patch. We also pull series_id so
  // an edit to a series occurrence promotes that row to is_exception=true,
  // shielding it from future "edit-all-future" series rewrites.
  const { data: existingRow, error: exErr } = await adminSupabase
    .from("events")
    .select("id, org_slug, status, title, description, organization, registration_url, online_url, source_url, series_id, is_exception")
    .eq("id", ctx.params.id)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existingRow) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const existing = existingRow as Record<string, unknown> & { status: string };
  if (existing.org_slug !== ctx.params.slug) {
    // Slug in URL doesn't match the event's org. Refuse cleanly so a manager
    // of A can't edit B's events by tampering with the URL.
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  const changedMaterial: string[] = [];

  for (const [field, max] of Object.entries(EDITABLE)) {
    if (!(field in body)) continue;
    const raw = body[field];

    if (field === "capacity") {
      const n = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
      patch[field] = n;
      continue;
    }
    if (field === "start_date" || field === "end_date" || field === "registration_deadline") {
      if (raw === null || raw === undefined || raw === "") {
        if (field !== "start_date") patch[field] = null; // start_date is NOT NULL
        continue;
      }
      const d = new Date(raw as string);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: `${field}_invalid` }, { status: 400 });
      }
      patch[field] = d.toISOString();
      continue;
    }
    const cleaned = trimOrNull(raw, max);
    // Allow null when caller explicitly passes null/empty (clearing optional fields).
    if (cleaned === null && raw !== null && raw !== "") continue;
    patch[field] = cleaned;

    if (MATERIAL_FIELDS.has(field)) {
      const before = (existing[field] ?? null) as string | null;
      const after = (cleaned ?? null) as string | null;
      const norm = (s: string | null) => (s ?? "").trim().toLowerCase();
      if (norm(before) !== norm(after)) {
        changedMaterial.push(field);
      }
    }
  }

  // Single-occurrence cancel. Accepted only when this row IS a series
  // occurrence — a non-series event uses admin delete instead. Flipping
  // is_cancelled also flips is_exception so a future "edit all future"
  // on the series can't un-cancel it.
  const cancelRequested = body.is_cancelled === true;
  if (cancelRequested) {
    if (!existing.series_id) {
      return NextResponse.json({ error: "not_a_series_occurrence" }, { status: 400 });
    }
    patch.is_cancelled = true;
    patch.status = "cancelled";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_editable_fields" }, { status: 400 });
  }

  // Series-occurrence exception flip. ANY edit to a series occurrence (other
  // than a cancel-only no-content patch) promotes the row to is_exception
  // = true so subsequent "edit all future" series rewrites leave it alone.
  // We don't flip this on a server-side update path (e.g. cron rollover)
  // because those paths don't go through this endpoint.
  const isOccurrenceEdit = !!existing.series_id;
  const becameException = isOccurrenceEdit && !existing.is_exception;
  if (becameException) patch.is_exception = true;

  // Edit-recheck flag. Only triggers when the row is currently published —
  // pending rows are about to be reviewed anyway; admin-takendown rows
  // shouldn't get re-promoted by a stealth flag flip.
  const flagRecheck = existing.status === "published" && changedMaterial.length > 0;
  if (flagRecheck) {
    patch.needs_recheck = true;
    patch.needs_recheck_at = new Date().toISOString();
    patch.needs_recheck_reason = `material-edit: ${changedMaterial.join(", ")}`;
  }

  const { error: updErr } = await adminSupabase
    .from("events")
    .update(patch)
    .eq("id", ctx.params.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    needs_recheck: !!flagRecheck,
    material_fields_changed: changedMaterial,
    became_exception: becameException,
    cancelled: cancelRequested,
  });
}
