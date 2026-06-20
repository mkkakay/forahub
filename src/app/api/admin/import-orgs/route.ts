// Admin-triggered org importer for ROR and IATI.
//
//   POST  /api/admin/import-orgs  body: { source: 'ror'|'iati', pages?: 10 }
//     Pulls `pages` consecutive pages from the source's REST API, upserts
//     each row through the shared dedup/upsert helper, and returns aggregate
//     counters + the next cursor. Caller (admin UI) keeps POSTing until
//     `done: true` to drain the source.
//
//   GET   /api/admin/import-orgs
//     Returns the current state for each source: total rows in the directory
//     by source, last job row, and the most recent next_cursor so the admin
//     UI can resume an interrupted run without losing progress.
//
//   DELETE /api/admin/import-orgs  body: { source: 'ror'|'iati' }
//     Reversibility hook. Deletes every org row imported under the given
//     source (manual rows untouched). Use with care — it cascades through
//     org_claims via FK on org_slug.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchRorPage } from "@/lib/orgs/rorImport";
import { fetchIatiSlice } from "@/lib/orgs/iatiImport";
import { upsertImportedOrg } from "@/lib/orgs/upsertImported";

// IATI rows-per-call. The bulk file is ~2K rows total, so the admin
// auto-loop drains in ~10 POSTs at 200 rows each, with the per-process
// 5-minute cache making subsequent fetches free.
const IATI_BATCH_SIZE = 200;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_PAGES_PER_CALL = 8;
const MAX_PAGES_PER_CALL = 50;
// Be a polite citizen of the ROR API — 100/min is fine without a delay,
// IATI similar. 50ms between page fetches keeps us comfortably under.
const INTER_PAGE_DELAY_MS = 50;

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminKey = req.headers.get("x-admin-key");
  return !!adminSecret && adminKey === adminSecret;
}

interface Counters {
  rows_seen: number;
  rows_inserted: number;
  rows_updated: number;
  rows_merged: number;
  rows_skipped: number;
}
const emptyCounters = (): Counters => ({
  rows_seen: 0, rows_inserted: 0, rows_updated: 0, rows_merged: 0, rows_skipped: 0,
});

async function processBatch(
  source: "ror" | "iati",
  startCursor: number,
  pages: number,
): Promise<{ counters: Counters; nextCursor: number; total: number; done: boolean }> {
  const counters = emptyCounters();
  let cursor = startCursor;
  let total = Infinity;
  let done = false;

  if (source === "iati") {
    // IATI cursor is a row offset into the bulk file. One POST drains
    // IATI_BATCH_SIZE rows; the auto-loop continues until done=true.
    // `pages` is ignored — IATI doesn't paginate at the source.
    const slice = await fetchIatiSlice(cursor, IATI_BATCH_SIZE);
    total = slice.total;
    counters.rows_seen += slice.orgs.length;
    for (const org of slice.orgs) {
      const r = await upsertImportedOrg(adminSupabase, org);
      if (r.outcome === "inserted") counters.rows_inserted += 1;
      else if (r.outcome === "updated") counters.rows_updated += 1;
      else if (r.outcome === "merged") counters.rows_merged += 1;
      else counters.rows_skipped += 1;
    }
    return { counters, nextCursor: slice.next_cursor, total, done: slice.done };
  }

  // ROR: paginated REST API (20 rows per page, 1-indexed).
  for (let i = 0; i < pages; i++) {
    const page = await fetchRorPage(cursor);
    total = page.totalResults;
    counters.rows_seen += page.rows.length + page.dropped;
    for (const org of page.rows) {
      const r = await upsertImportedOrg(adminSupabase, org);
      if (r.outcome === "inserted") counters.rows_inserted += 1;
      else if (r.outcome === "updated") counters.rows_updated += 1;
      else if (r.outcome === "merged") counters.rows_merged += 1;
      else counters.rows_skipped += 1;
    }
    cursor += 1;
    if ((cursor - 1) * 20 >= total) { done = true; break; }
    if (INTER_PAGE_DELAY_MS > 0) {
      await new Promise(r => setTimeout(r, INTER_PAGE_DELAY_MS));
    }
  }
  return { counters, nextCursor: cursor, total, done };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Per-source counts via HEAD requests — read the exact count from the
  // Content-Range header instead of fetching row bodies (PostgREST caps the
  // response body at max-rows, which silently truncates an in-JS tally).
  const SOURCES = ["manual", "ror", "iati", "submission"] as const;
  const directoryCounts: Record<string, number> = {};
  await Promise.all(
    SOURCES.map(async (src) => {
      const { count } = await adminSupabase
        .from("organizations_directory")
        .select("id", { count: "exact", head: true })
        .eq("source", src);
      directoryCounts[src] = count ?? 0;
    })
  );
  const { count: directoryTotal } = await adminSupabase
    .from("organizations_directory")
    .select("id", { count: "exact", head: true });
  // Last job per source.
  const { data: jobs } = await adminSupabase
    .from("directory_import_jobs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  return NextResponse.json({ directoryCounts, directoryTotal: directoryTotal ?? 0, jobs: jobs ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { source?: "ror" | "iati"; pages?: number; cursor?: number; job_id?: string };
  try { body = await req.json(); } catch { body = {}; }
  const source = body.source;
  if (source !== "ror" && source !== "iati") {
    return NextResponse.json({ error: "source must be 'ror' or 'iati'" }, { status: 400 });
  }
  // ROR honours `pages` (default 8); IATI ignores it — one POST = one row
  // batch of IATI_BATCH_SIZE rows. The default still applies to ROR.
  const pages = Math.max(1, Math.min(MAX_PAGES_PER_CALL, body.pages ?? DEFAULT_PAGES_PER_CALL));

  // Resume an existing running job, or create one. Initial cursor:
  //   ROR  → page 1
  //   IATI → row 0
  const initialCursor = source === "ror" ? 1 : 0;
  let jobId = body.job_id ?? null;
  let startCursor: number;
  if (jobId) {
    const { data: job } = await adminSupabase
      .from("directory_import_jobs")
      .select("id, status, next_cursor, rows_seen, rows_inserted, rows_updated, rows_merged, rows_skipped")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
    if (job.status !== "running") {
      return NextResponse.json({ error: `job already ${job.status}` }, { status: 409 });
    }
    startCursor = Number(job.next_cursor ?? initialCursor);
  } else {
    startCursor = body.cursor ?? initialCursor;
    const { data: created, error: createErr } = await adminSupabase
      .from("directory_import_jobs")
      .insert({ source, status: "running", next_cursor: String(startCursor) })
      .select("id")
      .single();
    if (createErr || !created) {
      return NextResponse.json({ error: createErr?.message ?? "could not create job" }, { status: 500 });
    }
    jobId = created.id;
  }

  let result;
  try {
    result = await processBatch(source, startCursor, pages);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await adminSupabase
      .from("directory_import_jobs")
      .update({
        status: "failed",
        last_error: msg,
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId!);
    return NextResponse.json({ ok: false, error: msg, job_id: jobId }, { status: 502 });
  }

  // Roll the job's running totals + cursor forward.
  const { data: snapshot } = await adminSupabase
    .from("directory_import_jobs")
    .select("rows_seen, rows_inserted, rows_updated, rows_merged, rows_skipped")
    .eq("id", jobId!)
    .single();
  const prior = (snapshot ?? emptyCounters()) as Counters;
  await adminSupabase
    .from("directory_import_jobs")
    .update({
      next_cursor: String(result.nextCursor),
      rows_seen: prior.rows_seen + result.counters.rows_seen,
      rows_inserted: prior.rows_inserted + result.counters.rows_inserted,
      rows_updated: prior.rows_updated + result.counters.rows_updated,
      rows_merged: prior.rows_merged + result.counters.rows_merged,
      rows_skipped: prior.rows_skipped + result.counters.rows_skipped,
      ...(result.done ? { status: "completed", finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", jobId!);

  return NextResponse.json({
    ok: true,
    job_id: jobId,
    source,
    batch: result.counters,
    next_cursor: result.nextCursor,
    total_results: result.total,
    done: result.done,
  });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { source?: "ror" | "iati" };
  try { body = await req.json(); } catch { body = {}; }
  const source = body.source;
  if (source !== "ror" && source !== "iati") {
    return NextResponse.json({ error: "source must be 'ror' or 'iati'" }, { status: 400 });
  }
  const { error, count } = await adminSupabase
    .from("organizations_directory")
    .delete({ count: "exact" })
    .eq("source", source);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await adminSupabase
    .from("directory_import_jobs")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("source", source)
    .eq("status", "running");
  return NextResponse.json({ ok: true, deleted: count ?? 0, source });
}
