// Server-only aggregation queries for the manager dashboard. NEVER
// return user_id or anonymous_id to the client — the dashboard reads
// only the totals and the time-bucketed counts that come out of here.

import { adminSupabase } from "@/lib/supabase/admin";

export interface AggregateTotals {
  views: number;
  saves: number;
  unsaves: number;
  registration_clicks: number;
}

export interface TrendPoint {
  /** YYYY-MM-DD bucket in UTC. */
  date: string;
  views: number;
  saves: number;
  registration_clicks: number;
}

export interface PerEventRow {
  event_id: string;
  title: string;
  start_date: string;
  series_id: string | null;
  views: number;
  saves: number;
  registration_clicks: number;
}

export interface SeriesRollupRow {
  series_id: string;
  series_title: string;
  occurrence_count: number;
  views: number;
  saves: number;
  registration_clicks: number;
}

export interface AnalyticsSummary {
  total: AggregateTotals;
  trend: TrendPoint[];
  topEvents: PerEventRow[];
  seriesRollup: SeriesRollupRow[];
  windowDays: number;
}

/** Sum actions for one org over a rolling window. Single-table scan
 *  against the (org_slug, occurred_at DESC) index. Returns ONLY counters. */
export async function loadOrgAnalytics(opts: { orgSlug: string; windowDays: number }): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - opts.windowDays * 24 * 3600 * 1000).toISOString();
  // We aggregate in JS rather than via SQL group-by because PostgREST
  // doesn't expose group-by ergonomically and the row volume is small.
  const { data: raw } = await adminSupabase
    .from("event_analytics_events")
    // EXPLICIT projection — do NOT include user_id or anonymous_id. The
    // dashboard never needs them and we want it provably impossible to
    // leak them to the client through this code path.
    .select("event_id, series_id, action, occurred_at")
    .eq("org_slug", opts.orgSlug)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true })
    .limit(50000);

  const rows = (raw ?? []) as Array<{
    event_id: string;
    series_id: string | null;
    action: string;
    occurred_at: string;
  }>;

  const total: AggregateTotals = { views: 0, saves: 0, unsaves: 0, registration_clicks: 0 };
  const dayBucket = new Map<string, TrendPoint>();
  const perEvent = new Map<string, { views: number; saves: number; registration_clicks: number; series_id: string | null }>();
  const perSeries = new Map<string, { views: number; saves: number; registration_clicks: number }>();

  for (const r of rows) {
    const day = r.occurred_at.slice(0, 10);
    let bucket = dayBucket.get(day);
    if (!bucket) {
      bucket = { date: day, views: 0, saves: 0, registration_clicks: 0 };
      dayBucket.set(day, bucket);
    }
    if (r.action === "view") { total.views++; bucket.views++; }
    if (r.action === "save") { total.saves++; bucket.saves++; }
    if (r.action === "unsave") total.unsaves++;
    if (r.action === "registration_click") { total.registration_clicks++; bucket.registration_clicks++; }

    let ev = perEvent.get(r.event_id);
    if (!ev) {
      ev = { views: 0, saves: 0, registration_clicks: 0, series_id: r.series_id };
      perEvent.set(r.event_id, ev);
    }
    if (r.action === "view") ev.views++;
    if (r.action === "save") ev.saves++;
    if (r.action === "registration_click") ev.registration_clicks++;

    if (r.series_id) {
      let s = perSeries.get(r.series_id);
      if (!s) {
        s = { views: 0, saves: 0, registration_clicks: 0 };
        perSeries.set(r.series_id, s);
      }
      if (r.action === "view") s.views++;
      if (r.action === "save") s.saves++;
      if (r.action === "registration_click") s.registration_clicks++;
    }
  }

  // Top events — pull titles for at most 5.
  const topIds = Array.from(perEvent.entries())
    .sort((a, b) => (b[1].views + b[1].saves + b[1].registration_clicks) - (a[1].views + a[1].saves + a[1].registration_clicks))
    .slice(0, 5)
    .map(([id]) => id);
  let topEvents: PerEventRow[] = [];
  if (topIds.length > 0) {
    const { data: details } = await adminSupabase
      .from("events")
      .select("id, title, start_date, series_id")
      .in("id", topIds);
    topEvents = ((details ?? []) as Array<{ id: string; title: string; start_date: string; series_id: string | null }>)
      .map(d => {
        const v = perEvent.get(d.id)!;
        return {
          event_id: d.id,
          title: d.title,
          start_date: d.start_date,
          series_id: d.series_id,
          views: v.views,
          saves: v.saves,
          registration_clicks: v.registration_clicks,
        };
      })
      .sort((a, b) => (b.views + b.saves + b.registration_clicks) - (a.views + a.saves + a.registration_clicks));
  }

  // Series rollup — pull titles + occurrence counts.
  const seriesIds = Array.from(perSeries.keys());
  let seriesRollup: SeriesRollupRow[] = [];
  if (seriesIds.length > 0) {
    const [seriesRes, countsRes] = await Promise.all([
      adminSupabase.from("event_series").select("id, series_title").in("id", seriesIds),
      adminSupabase.from("events").select("id, series_id").in("series_id", seriesIds),
    ]);
    const series = (seriesRes.data ?? []) as Array<{ id: string; series_title: string }>;
    const occRows = (countsRes.data ?? []) as Array<{ id: string; series_id: string | null }>;
    const occCounts = new Map<string, number>();
    for (const r of occRows) if (r.series_id) occCounts.set(r.series_id, (occCounts.get(r.series_id) ?? 0) + 1);
    seriesRollup = series.map(s => {
      const c = perSeries.get(s.id)!;
      return {
        series_id: s.id,
        series_title: s.series_title,
        occurrence_count: occCounts.get(s.id) ?? 0,
        views: c.views,
        saves: c.saves,
        registration_clicks: c.registration_clicks,
      };
    });
  }

  // Trend — densify so the chart has zero-rows for quiet days.
  const trend: TrendPoint[] = [];
  for (let i = opts.windowDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    trend.push(dayBucket.get(key) ?? { date: key, views: 0, saves: 0, registration_clicks: 0 });
  }

  return { total, trend, topEvents, seriesRollup, windowDays: opts.windowDays };
}
