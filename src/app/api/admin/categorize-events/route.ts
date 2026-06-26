// Bulk-classify events into the humanitarian/development taxonomy.
//
// Runs in 50-event batches. Each event goes through the three classifier
// stages (keyword → SDG → AI). Events with category_locked = true are skipped
// so admin/submitter choices are preserved.
//
// Modes:
//   POST { mode: "keyword_only" } → run only the free stages. Useful as a first
//     pass before paying any tokens. Events that fall through stay NULL.
//   POST { mode: "ai" } (default)  → full pipeline, including AI fallback.
//
// Response includes processed/by_source/cost_usd/remaining so the admin panel
// can show progress and let the operator decide when to stop.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { buildAnthropicClient, classifyEvent } from "@/lib/categories/classify";
import type { CategorySource } from "@/lib/categories";
import { safeEqual } from "@/lib/security/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 50;
const LOW_CONFIDENCE = 0.6;

function isAuthorized(req: NextRequest): boolean {
  return safeEqual(req.headers.get("x-admin-key"), process.env.ADMIN_SECRET);
}

// GET /api/admin/categorize-events?stats=1
// Returns the dashboard summary used by the admin panel:
//   - per-category counts
//   - per-source counts (ai/keyword/sdg_inferred/admin/submitter)
//   - count of low-confidence (< 0.6) classifications
//   - count of events with no category at all
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  if (sp.get("stats") === "1") {
    const [
      { data: catRows, error: catErr },
      { data: srcRows, error: srcErr },
      { count: lowConfidence },
      { count: uncategorized },
      { count: total },
    ] = await Promise.all([
      adminSupabase.from("events").select("category").not("category", "is", null),
      adminSupabase.from("events").select("category_source").not("category_source", "is", null),
      adminSupabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .lt("category_confidence", LOW_CONFIDENCE),
      adminSupabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .is("category", null),
      adminSupabase.from("events").select("id", { count: "exact", head: true }),
    ]);
    if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });
    if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 500 });
    const by_category: Record<string, number> = {};
    for (const r of catRows ?? []) {
      const c = (r as { category: string | null }).category;
      if (!c) continue;
      by_category[c] = (by_category[c] ?? 0) + 1;
    }
    const by_source: Record<string, number> = {};
    for (const r of srcRows ?? []) {
      const s = (r as { category_source: string | null }).category_source;
      if (!s) continue;
      by_source[s] = (by_source[s] ?? 0) + 1;
    }
    return NextResponse.json({
      total: total ?? 0,
      uncategorized: uncategorized ?? 0,
      low_confidence: lowConfidence ?? 0,
      by_category,
      by_source,
    });
  }

  // GET /api/admin/categorize-events?low_confidence=1
  //   returns the 50 lowest-confidence classifications for human review.
  if (sp.get("low_confidence") === "1") {
    const { data, error } = await adminSupabase
      .from("events")
      .select("id, title, organization, category, category_secondary, category_confidence, category_source, sdg_goals, start_date")
      .not("category", "is", null)
      .lt("category_confidence", LOW_CONFIDENCE)
      .order("category_confidence", { ascending: true })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ events: data ?? [] });
  }

  return NextResponse.json({ error: "supply ?stats=1 or ?low_confidence=1" }, { status: 400 });
}

// PATCH /api/admin/categorize-events
// Body: { event_id, category, secondary?: [], source?: 'admin' }
// Locks the event so future bulk runs leave it alone.
export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { event_id?: string; category?: string; secondary?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const eventId = (body.event_id ?? "").trim();
  const category = (body.category ?? "").trim();
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });
  const validKeys = new Set([
    "humanitarian",
    "development",
    "nexus",
    "policy_governance",
    "research_academic",
  ]);
  if (!validKeys.has(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  const secondary = Array.isArray(body.secondary)
    ? body.secondary.filter(s => validKeys.has(s) && s !== category).slice(0, 2)
    : [];
  const { error } = await adminSupabase
    .from("events")
    .update({
      category,
      category_secondary: secondary.length > 0 ? secondary : null,
      category_confidence: 1.0,
      category_source: "admin",
      category_locked: true,
      category_classified_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

interface CandidateEvent {
  id: string;
  title: string;
  organization: string | null;
  description: string | null;
  sdg_goals: number[] | null;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { mode?: "keyword_only" | "ai" } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — falls through to defaults.
  }
  const mode = body.mode === "keyword_only" ? "keyword_only" : "ai";

  // Fetch the next batch of unclassified, unlocked events.
  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, organization, description, sdg_goals")
    .is("category", null)
    .or("category_locked.is.null,category_locked.eq.false")
    .order("start_date", { ascending: false })
    .limit(BATCH_SIZE);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = (data ?? []) as CandidateEvent[];
  const client = mode === "ai" ? buildAnthropicClient() : null;
  if (mode === "ai" && !client) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  const bySource: Record<CategorySource, number> = {
    ai: 0,
    keyword: 0,
    admin: 0,
    submitter: 0,
    sdg_inferred: 0,
  };
  let processed = 0;
  let skipped = 0;
  let totalCost = 0;
  const nowIso = new Date().toISOString();

  for (const event of events) {
    const result = await classifyEvent(
      {
        title: event.title,
        organization: event.organization,
        description: event.description,
        sdg_goals: event.sdg_goals,
      },
      client,
    );

    if (!result) {
      skipped += 1;
      continue;
    }

    const { error: updErr } = await adminSupabase
      .from("events")
      .update({
        category: result.category,
        category_secondary: result.secondary.length > 0 ? result.secondary : null,
        category_confidence: result.confidence,
        category_source: result.source,
        category_classified_at: nowIso,
      })
      .eq("id", event.id);
    if (updErr) {
      skipped += 1;
      continue;
    }
    processed += 1;
    bySource[result.source] += 1;
    totalCost += result.cost_usd ?? 0;
  }

  // Cheap remaining-count query so the admin can see progress.
  const { count: remaining } = await adminSupabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .is("category", null)
    .or("category_locked.is.null,category_locked.eq.false");

  return NextResponse.json({
    mode,
    batch_size: events.length,
    processed,
    skipped,
    by_source: bySource,
    total_cost_usd: Number(totalCost.toFixed(6)),
    remaining: remaining ?? 0,
  });
}
