// Daily horizon-rollover for active series. Idempotent — re-runs are
// cheap because (series_id, occurrence_date) is unique-indexed: the
// upsert with ignoreDuplicates means already-materialized rows are
// no-ops.
//
// Loop budget: each series's enumerateOccurrences is capped at
// MAX_OCCURRENCES_PER_RUN (365). With a small series count we'll do this
// in milliseconds; even at hundreds of series it stays well under the
// cron's remaining time budget.

import { adminSupabase } from "@/lib/supabase/admin";
import {
  enumerateOccurrences,
  horizonWindow,
  persistOccurrences,
  type SeriesRow,
} from "./engine";

export interface RolloverResult {
  series_seen: number;
  series_skipped_inactive: number;
  occurrences_inserted: number;
  errors: number;
  ran_at: string;
  elapsed_ms: number;
}

export async function rollSeriesHorizons(deadlineMs: number): Promise<RolloverResult> {
  const startedAt = Date.now();
  const out: RolloverResult = {
    series_seen: 0,
    series_skipped_inactive: 0,
    occurrences_inserted: 0,
    errors: 0,
    ran_at: new Date(startedAt).toISOString(),
    elapsed_ms: 0,
  };

  const { data: rows, error } = await adminSupabase
    .from("event_series")
    .select("*")
    .eq("status", "active")
    .order("last_horizon_at", { ascending: true, nullsFirst: true });
  if (error) {
    out.errors += 1;
    out.elapsed_ms = Date.now() - startedAt;
    return out;
  }
  const seriesList = (rows ?? []) as SeriesRow[];

  for (const series of seriesList) {
    if (Date.now() > deadlineMs) break;
    out.series_seen += 1;
    if (series.status !== "active") { out.series_skipped_inactive += 1; continue; }

    const { from, to } = horizonWindow();
    const occs = enumerateOccurrences(series, from, to);
    const persisted = await persistOccurrences({
      sb: adminSupabase,
      series,
      occurrences: occs,
      // Horizon rollover INHERITS the series's auto-publish posture set at
      // creation. We do NOT re-check the cap — the slot was already paid.
      status: series.auto_published_at ? "published" : "pending",
      autoPublishedByUserId: series.auto_published_by_user_id,
    });
    if (persisted.error) { out.errors += 1; continue; }
    out.occurrences_inserted += persisted.inserted;

    await adminSupabase
      .from("event_series")
      .update({ last_horizon_at: new Date().toISOString() })
      .eq("id", series.id);
  }

  out.elapsed_ms = Date.now() - startedAt;
  return out;
}
