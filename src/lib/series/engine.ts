// Recurring-event series engine.
//
// A "series" is a parent record holding an RRULE (RFC 5545) plus the shared
// event-template fields. Each "occurrence" is a real row in the `events`
// table with the new (series_id, occurrence_date) coordinate. We use the
// well-maintained `rrule` library — never hand-roll recurrence math.
//
// Generation is bounded in two dimensions:
//   - by time: SERIES_HORIZON_DAYS (365) ahead of "now"
//   - by count: MAX_OCCURRENCES_PER_RUN (365) per materialize/rollover pass
//
// Insertion is idempotent: the (series_id, occurrence_date) unique index
// turns "row already exists" into a silent no-op so cron re-runs don't
// double up.

import type { SupabaseClient } from "@supabase/supabase-js";
import { RRule, type Options as RRuleOptions } from "rrule";

export const SERIES_HORIZON_DAYS = 365;
export const MAX_OCCURRENCES_PER_RUN = 365;

export interface SeriesRow {
  id: string;
  org_slug: string;
  created_by_user_id: string;
  rrule: string;
  timezone: string;
  start_time_local: string; // 'HH:MM:SS'
  duration_minutes: number;
  series_title: string;
  series_description: string | null;
  organization: string;
  registration_url: string | null;
  format: string;
  location: string | null;
  online_url: string | null;
  sdg_goals: number[];
  category: string | null;
  event_type: string;
  until_date: string | null;
  occurrence_count: number | null;
  status: string;
  last_horizon_at: string | null;
  auto_published_at: string | null;
  auto_published_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterializedOccurrence {
  occurrence_date: string;        // YYYY-MM-DD (UTC date of the start time)
  start_date_iso: string;         // full UTC ISO
  end_date_iso: string;           // start + duration_minutes
}

/** Hours minutes seconds breakdown of "HH:MM[:SS]" with safe defaults. */
function parseTime(t: string): { hh: number; mm: number; ss: number } {
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return { hh: 9, mm: 0, ss: 0 };
  return { hh: +m[1], mm: +m[2], ss: m[3] ? +m[3] : 0 };
}

/** Parse "HH:MM:SS" into a positive integer number of seconds since midnight. */
function timeOfDaySeconds(t: string): number {
  const { hh, mm, ss } = parseTime(t);
  return hh * 3600 + mm * 60 + ss;
}

/**
 * Build the RRule options object from a series row. We feed `rrule` a fully-
 * qualified DTSTART so it can enumerate dates relative to it. Timezone
 * handling: the rrule library treats DTSTART as a "wall-clock" timestamp;
 * we convert to UTC instants on the way out via toISOString().
 */
export function buildRule(series: Pick<SeriesRow, "rrule" | "until_date" | "occurrence_count" | "start_time_local">, dtstart: Date): RRule {
  const parsed = RRule.parseString(series.rrule);
  const opts: Partial<RRuleOptions> = {
    ...parsed,
    dtstart,
  };
  if (series.until_date) opts.until = new Date(series.until_date);
  if (series.occurrence_count) opts.count = series.occurrence_count;
  return new RRule(opts as RRuleOptions);
}

/**
 * Anchor DTSTART for a series. The series stores a start_time_local; the
 * RRULE's BYxxx encoding fixes which weekdays/days hit. We anchor the
 * DTSTART one minute before the earliest plausible occurrence so the rule
 * enumerator naturally returns the first hit at the right time of day.
 *
 * Concretely: take the series' created_at (or earliest scan window) at
 * midnight UTC, add the time-of-day in seconds. Subsequent occurrences
 * inherit the same time-of-day from the RRULE evaluator.
 */
export function anchorDtstart(series: Pick<SeriesRow, "start_time_local" | "created_at">): Date {
  const created = new Date(series.created_at);
  const midnight = new Date(Date.UTC(
    created.getUTCFullYear(),
    created.getUTCMonth(),
    created.getUTCDate(),
  ));
  midnight.setUTCSeconds(midnight.getUTCSeconds() + timeOfDaySeconds(series.start_time_local));
  return midnight;
}

/** Compute the next N occurrence dates from a series rule, for the UI preview. */
export function previewNextDates(opts: {
  rrule: string;
  start_time_local: string;
  until_date: string | null;
  occurrence_count: number | null;
  count: number;
}): { occurrence_date: string; start_date_iso: string }[] {
  const dtstart = (() => {
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    midnight.setUTCSeconds(midnight.getUTCSeconds() + timeOfDaySeconds(opts.start_time_local));
    return midnight;
  })();
  try {
    const rule = buildRule(
      { rrule: opts.rrule, until_date: opts.until_date, occurrence_count: opts.occurrence_count, start_time_local: opts.start_time_local },
      dtstart,
    );
    const dates = rule.all((_d, i) => i < opts.count);
    return dates.map(d => ({
      occurrence_date: d.toISOString().slice(0, 10),
      start_date_iso: d.toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Enumerate the occurrence dates for a series between `from` and `to`,
 * inclusive. Caps at MAX_OCCURRENCES_PER_RUN regardless of the window —
 * a daily series with no until still returns at most 365 rows per pass.
 */
export function enumerateOccurrences(series: SeriesRow, from: Date, to: Date): MaterializedOccurrence[] {
  try {
    const dtstart = anchorDtstart(series);
    const rule = buildRule(series, dtstart);
    const between = rule.between(from, to, true);
    const out: MaterializedOccurrence[] = [];
    for (const dt of between) {
      if (out.length >= MAX_OCCURRENCES_PER_RUN) break;
      const end = new Date(dt.getTime() + series.duration_minutes * 60 * 1000);
      out.push({
        occurrence_date: dt.toISOString().slice(0, 10),
        start_date_iso: dt.toISOString(),
        end_date_iso: end.toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Build the `events` row payload for one occurrence — shared between
 *  initial materialization and the cron horizon roller. The values that
 *  matter for the public-read paths (status, start_date, location,
 *  latitude/longitude, etc.) are kept compatible with what the existing
 *  read paths already expect. */
export interface BuildOccurrenceRowOpts {
  series: SeriesRow;
  occ: MaterializedOccurrence;
  status: "published" | "pending";
  /** Set non-null on the first occurrence inserted at series creation, when
   *  the series itself passed the auto-publish gate. Lets admins audit who
   *  published it; the cap is counted from event_series.auto_published_at
   *  so we DON'T duplicate the slot per occurrence here. */
  autoPublishedByUserId: string | null;
}

export function buildOccurrenceRow(opts: BuildOccurrenceRowOpts): Record<string, unknown> {
  const { series, occ, status, autoPublishedByUserId } = opts;
  return {
    title: series.series_title,
    description: series.series_description ?? null,
    organization: series.organization,
    org_slug: series.org_slug,
    start_date: occ.start_date_iso,
    end_date: occ.end_date_iso,
    location: series.location ?? null,
    online_url: series.online_url ?? null,
    registration_url: series.registration_url ?? null,
    format: series.format,
    event_type: series.event_type,
    sdg_goals: series.sdg_goals ?? [],
    category: series.category ?? null,
    status,
    submission_status: status === "published" ? "approved" : "pending",
    submission_source: "series",
    submitted_by_user_id: series.created_by_user_id,
    submitter_email: null,
    submitted_at: new Date().toISOString(),
    source_type: "series",
    // series link + dedup coordinate
    series_id: series.id,
    occurrence_date: occ.occurrence_date,
    is_exception: false,
    is_cancelled: false,
    // Cap audit: the slot is consumed by event_series.auto_published_at, NOT
    // by the per-occurrence auto_published_at. We still record the user id
    // for moderator visibility on auto-published occurrences.
    auto_published_at: null,
    auto_published_by_user_id: status === "published" ? autoPublishedByUserId : null,
  };
}

/** Insert occurrence rows for a series in idempotent batches. Returns the
 *  count of NEW rows persisted (PostgREST gives us back-confirmation only on
 *  successful inserts; the unique constraint silently swallows dupes). */
export async function persistOccurrences(opts: {
  sb: SupabaseClient;
  series: SeriesRow;
  occurrences: MaterializedOccurrence[];
  status: "published" | "pending";
  autoPublishedByUserId: string | null;
}): Promise<{ inserted: number; error?: string }> {
  if (opts.occurrences.length === 0) return { inserted: 0 };
  const rows = opts.occurrences.map(occ =>
    buildOccurrenceRow({
      series: opts.series,
      occ,
      status: opts.status,
      autoPublishedByUserId: opts.autoPublishedByUserId,
    }),
  );
  // upsert on the unique (series_id, occurrence_date) so re-runs no-op.
  const { data, error } = await opts.sb
    .from("events")
    .upsert(rows, { onConflict: "series_id,occurrence_date", ignoreDuplicates: true })
    .select("id");
  if (error) return { inserted: 0, error: error.message };
  return { inserted: (data ?? []).length };
}

/** Time window helpers for the cron and create paths. */
export function horizonWindow(): { from: Date; to: Date } {
  const from = new Date();
  const to = new Date(Date.now() + SERIES_HORIZON_DAYS * 24 * 3600 * 1000);
  return { from, to };
}
