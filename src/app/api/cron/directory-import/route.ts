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
import { fetchIatiBulk } from "@/lib/orgs/iatiImport";
import { upsertImportedOrg } from "@/lib/orgs/upsertImported";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Leaves us ~60s of headroom under Vercel's 300s hard cap for cleanup.
export const maxDuration = 300;

// ROR daily window. Once the catalog is in steady state this yields
// roughly 30–80 modified records per day — comfortably under the budget.
// A one-time catch-up after a long gap is handled by the cron running
// daily; we don't try to drain a huge window in a single invocation.
const ROR_LOOKBACK_DAYS = 3;
// Belt-and-suspenders: stop the ROR loop comfortably before the IATI step
// starts, so the *combined* wall-clock fits inside Vercel's 300s cap.
const ROR_RUNTIME_BUDGET_MS = 120_000;
// IATI rotation: the bulk file has ~2K rows, no native "modified since"
// filter, and each upsert is a Supabase REST round-trip. Processing 400
// rows takes ~70s. We rotate through the catalog one daily slice at a
// time so any given row is touched every ~5–6 days.
const IATI_DAILY_CHUNK = 400;
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
      if (Date.now() - startedAt > ROR_RUNTIME_BUDGET_MS) break;
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
  // IATI rotation strategy: the bulk file has no per-row "modified since"
  // metadata, so we can't be incremental like ROR. Instead we touch
  // IATI_DAILY_CHUNK rows per day, rotating through the catalog so every
  // row gets refreshed every ~5–6 days. Idempotent: re-running same slice
  // is just UPDATEs through external_ids.iati. Errors are soft-failed so
  // ROR isn't blocked.
  const counters = emptyCounters();
  const dayIndex = Math.floor(Date.now() / 86_400_000);

  const { data: job, error: jobErr } = await adminSupabase
    .from("directory_import_jobs")
    .insert({ source: "iati", status: "running", next_cursor: `cron:day${dayIndex}` })
    .select("id")
    .single();
  if (jobErr || !job) {
    return { source: "iati", ok: false, pages_processed: 0, counters, error: jobErr?.message ?? "could not create job" };
  }
  try {
    const bulk = await fetchIatiBulk();
    const total = bulk.orgs.length;
    const startCursor = total > 0 ? (dayIndex * IATI_DAILY_CHUNK) % total : 0;
    const slice = bulk.orgs.slice(startCursor, startCursor + IATI_DAILY_CHUNK);
    counters.rows_seen = slice.length;
    for (const org of slice) {
      const r = await upsertImportedOrg(adminSupabase, org);
      if (r.outcome === "inserted") counters.rows_inserted += 1;
      else if (r.outcome === "updated") counters.rows_updated += 1;
      else if (r.outcome === "merged") counters.rows_merged += 1;
      else counters.rows_skipped += 1;
    }
    await adminSupabase.from("directory_import_jobs").update({
      status: "completed",
      next_cursor: `cron:day${dayIndex}:rows ${startCursor}-${startCursor + slice.length}`,
      rows_seen: counters.rows_seen,
      rows_inserted: counters.rows_inserted,
      rows_updated: counters.rows_updated,
      rows_merged: counters.rows_merged,
      rows_skipped: counters.rows_skipped,
      finished_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { source: "iati", ok: true, pages_processed: 1, counters, total_results: total, done: true, job_id: job.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
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
