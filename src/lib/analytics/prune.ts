// Daily prune of expired raw analytics rows. Single named retention
// constant lives in lib/analytics/constants.ts. Idempotent — re-runs are
// safely no-ops after the first one for the day.

import { adminSupabase } from "@/lib/supabase/admin";
import { ANALYTICS_RETENTION_DAYS } from "./constants";

export interface PruneResult {
  retention_days: number;
  cutoff: string;
  rows_deleted: number;
  ran_at: string;
  elapsed_ms: number;
  error?: string;
}

export async function pruneOldAnalytics(): Promise<PruneResult> {
  const ranAt = new Date();
  const cutoff = new Date(ranAt.getTime() - ANALYTICS_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  const { data, error } = await adminSupabase
    .from("event_analytics_events")
    .delete()
    .lt("occurred_at", cutoff)
    .select("id");
  return {
    retention_days: ANALYTICS_RETENTION_DAYS,
    cutoff,
    rows_deleted: (data ?? []).length,
    ran_at: ranAt.toISOString(),
    elapsed_ms: Date.now() - ranAt.getTime(),
    error: error?.message,
  };
}
