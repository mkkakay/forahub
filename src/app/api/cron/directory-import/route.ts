// Daily cron entry point — Vercel triggers this at the schedule defined in
// vercel.json. The function pulls *recently-modified* ROR records (the last
// 14 days) and the first page of IATI organisations, upserting through the
// same dedup-aware helper the manual importer uses.
//
// Why 14 days for ROR: the catalog only changes by ~0.1–0.2 % per week, so
// the daily payload is small (often <300 rows) — easily drained inside the
// Vercel function time budget. The cron is therefore a maintenance job,
// not a seed job. The initial seed of ~110 K rows is what the admin
// "Run import" button is for.
//
// Authentication: accepts either Vercel cron's default
// `Authorization: Bearer ${CRON_SECRET}` OR an `x-admin-key` header so the
// run is also manually-triggerable for testing without setting up cron.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { fetchRorPage } from "@/lib/orgs/rorImport";
import { fetchIatiPage } from "@/lib/orgs/iatiImport";
import { upsertImportedOrg } from "@/lib/orgs/upsertImported";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Leaves us ~60s of headroom under Vercel's 300s hard cap for cleanup.
export const maxDuration = 300;

const ROR_LOOKBACK_DAYS = 14;
// Belt-and-suspenders: stop the loop a comfortable margin before maxDuration.
const RUNTIME_BUDGET_MS = 240_000;
const INTER_PAGE_DELAY_MS = 50;

function authorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const adminKey = req.headers.get("x-admin-key") ?? "";
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  if (adminSecret && adminKey === adminSecret) return true;
  return false;
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

interface SourceOutcome {
  source: "ror" | "iati";
  ok: boolean;
  pages_processed: number;
  counters: Counters;
  total_results?: number;
  done?: boolean;
  error?: string;
  job_id?: string;
}

async function runRorIncremental(startedAt: number): Promise<SourceOutcome> {
  const since = new Date(Date.now() - ROR_LOOKBACK_DAYS * 86_400_000)
    .toISOString().slice(0, 10);
  const advancedQuery = `admin.last_modified.date:[${since} TO *]`;
  const counters = emptyCounters();
  let pagesProcessed = 0;
  let total = Infinity;
  let cursor = 1;
  let done = false;

  const { data: job, error: jobErr } = await adminSupabase
    .from("directory_import_jobs")
    .insert({ source: "ror", status: "running", next_cursor: "cron:" + since })
    .select("id")
    .single();
  if (jobErr || !job) {
    return { source: "ror", ok: false, pages_processed: 0, counters, error: jobErr?.message ?? "could not create job" };
  }

  try {
    while (true) {
      if (Date.now() - startedAt > RUNTIME_BUDGET_MS) break;
      const page = await fetchRorPage(cursor, { advancedQuery });
      pagesProcessed += 1;
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
    await adminSupabase.from("directory_import_jobs").update({
      status: done ? "completed" : "running",
      next_cursor: String(cursor),
      rows_seen: counters.rows_seen,
      rows_inserted: counters.rows_inserted,
      rows_updated: counters.rows_updated,
      rows_merged: counters.rows_merged,
      rows_skipped: counters.rows_skipped,
      ...(done ? { finished_at: new Date().toISOString() } : {}),
    }).eq("id", job.id);
    return { source: "ror", ok: true, pages_processed: pagesProcessed, counters, total_results: total, done, job_id: job.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await adminSupabase.from("directory_import_jobs").update({
      status: "failed",
      last_error: msg,
      finished_at: new Date().toISOString(),
      rows_seen: counters.rows_seen,
      rows_inserted: counters.rows_inserted,
      rows_updated: counters.rows_updated,
      rows_merged: counters.rows_merged,
      rows_skipped: counters.rows_skipped,
    }).eq("id", job.id);
    return { source: "ror", ok: false, pages_processed: pagesProcessed, counters, error: msg, job_id: job.id };
  }
}

async function tryIati(): Promise<SourceOutcome> {
  // IATI is on a different cadence — they don't publish a "recently modified"
  // filter on the Datastore. So the cron just touches the first page to
  // surface new orgs. The expensive bulk drain is still manual. If IATI
  // returns 403/401 (subscription not yet active on the operator's account),
  // we catch and log it so ROR isn't blocked.
  const counters = emptyCounters();
  const { data: job, error: jobErr } = await adminSupabase
    .from("directory_import_jobs")
    .insert({ source: "iati", status: "running", next_cursor: "cron" })
    .select("id")
    .single();
  if (jobErr || !job) {
    return { source: "iati", ok: false, pages_processed: 0, counters, error: jobErr?.message ?? "could not create job" };
  }
  try {
    const page = await fetchIatiPage(0);
    counters.rows_seen = page.rows.length + page.dropped;
    for (const org of page.rows) {
      const r = await upsertImportedOrg(adminSupabase, org);
      if (r.outcome === "inserted") counters.rows_inserted += 1;
      else if (r.outcome === "updated") counters.rows_updated += 1;
      else if (r.outcome === "merged") counters.rows_merged += 1;
      else counters.rows_skipped += 1;
    }
    await adminSupabase.from("directory_import_jobs").update({
      status: "completed",
      rows_seen: counters.rows_seen,
      rows_inserted: counters.rows_inserted,
      rows_updated: counters.rows_updated,
      rows_merged: counters.rows_merged,
      rows_skipped: counters.rows_skipped,
      finished_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { source: "iati", ok: true, pages_processed: 1, counters, total_results: page.totalResults, done: false, job_id: job.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Soft-fail: ROR portion must still succeed.
    await adminSupabase.from("directory_import_jobs").update({
      status: "failed",
      last_error: msg,
      finished_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { source: "iati", ok: false, pages_processed: 0, counters, error: msg, job_id: job.id };
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const startedAt = Date.now();
  const ror = await runRorIncremental(startedAt);
  const iati = await tryIati();
  const elapsedMs = Date.now() - startedAt;
  return NextResponse.json({
    ok: ror.ok, // ROR is the cron's primary purpose; IATI is best-effort.
    ran_at: new Date(startedAt).toISOString(),
    elapsed_ms: elapsedMs,
    ror,
    iati,
  });
}

// POST for testing parity; Vercel cron sends GET.
export const POST = GET;
