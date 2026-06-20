// POST /api/analytics/event
//
// Server-side analytics ingest. The client gates each call on
// isAnalyticsAllowed() before sending; this route adds a second defence
// layer:
//
//   1. Honour the Sec-GPC request header — if the browser sent it, log
//      nothing and return 204. (DNT cannot be checked server-side
//      because the standard request header was deprecated; the Sec-GPC
//      header IS sent by GPC-compliant browsers.)
//   2. For signed-in users, require profiles.analytics_consent = true.
//      A user who flipped consent off in another tab is honoured even
//      if a stale tab tries to send.
//   3. The payload MUST carry either a user_id (derived from the auth
//      session, not the body — the client cannot forge user_id) or an
//      anonymous_id. Both forms still require consent — the DB CHECK
//      constraint enforces presence, and this route enforces consent.
//
// Pre-consent / opt-out responses are 204 No Content with no body, so a
// client can call this fire-and-forget without branching on the
// response.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = new Set(["view", "save", "unsave", "registration_click"]);

interface Body {
  event_id?: string;
  action?: string;
  anonymous_id?: string;
  referrer?: string;
}

/** Normalize a referrer string to "host only", or null if empty / invalid.
 *  Strips path, query, fragment so we never accidentally log a URL the
 *  user thought was private. */
function safeReferrer(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    return u.host || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // GPC at the request layer. Honours the signal even if the client
  // bundle is somehow stale.
  if (req.headers.get("sec-gpc") === "1") {
    return new NextResponse(null, { status: 204 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const eventId = (body.event_id ?? "").trim();
  const action = (body.action ?? "").trim();
  const clientAnonId = typeof body.anonymous_id === "string" ? body.anonymous_id.trim().slice(0, 64) : null;

  if (!eventId || !action) return NextResponse.json({ error: "missing_required" }, { status: 400 });
  if (!ALLOWED_ACTIONS.has(action)) return NextResponse.json({ error: "invalid_action" }, { status: 400 });

  // Pull auth + consent server-side.
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const userId = u.user?.id ?? null;

  // For signed-in users, the profiles row IS the source of truth for
  // consent. We treat NULL or false as "no consent" — never log.
  let userConsent = false;
  if (userId) {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("analytics_consent")
      .eq("id", userId)
      .maybeSingle();
    userConsent = (profile as { analytics_consent?: boolean | null } | null)?.analytics_consent === true;
  }

  // The gate:
  //   - signed-in user without server-side consent → 204, log nothing.
  //   - signed-in user WITH consent → use their user_id (preferred).
  //   - anon visitor → an anonymous_id from the client is required.
  let logUserId: string | null = null;
  let logAnonId: string | null = null;
  if (userId) {
    if (!userConsent) return new NextResponse(null, { status: 204 });
    logUserId = userId;
  } else {
    if (!clientAnonId) return new NextResponse(null, { status: 204 });
    logAnonId = clientAnonId;
  }

  // Hydrate org_slug + series_id from the events row so the dashboards
  // can run on these denormalized fields without a join.
  const { data: ev } = await adminSupabase
    .from("events")
    .select("id, org_slug, series_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  const eventRow = ev as { id: string; org_slug: string | null; series_id: string | null };

  const { error } = await adminSupabase
    .from("event_analytics_events")
    .insert({
      event_id: eventRow.id,
      org_slug: eventRow.org_slug,
      series_id: eventRow.series_id,
      action,
      user_id: logUserId,
      anonymous_id: logAnonId,
      referrer: safeReferrer(body.referrer),
    });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
