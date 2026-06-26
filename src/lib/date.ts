// Centralized date formatting.
//
// Every event-facing UI in ForaHub renders dates against UTC (so a London
// reader sees the same date as a Nairobi reader) using en-US locale. Until
// this file landed, that one rule was reimplemented in ~7 places —
// SavedEventsClient, EventsClient, events/[id], HomeClient, dashboard,
// admin panels — and they drifted in subtle ways (short vs. long month,
// range collapse vs. not). Always import from here so drift can't recur.

export type MonthStyle = "short" | "long";

interface Opts {
  monthStyle?: MonthStyle;
  /** Default UTC. Pass "local" only when you mean it (admin clocks etc.). */
  timeZone?: "UTC" | "local";
}

function resolveTz(opts: Opts): string | undefined {
  return opts.timeZone === "local" ? undefined : "UTC";
}

/** "Jun 26, 2026" (short) or "June 26, 2026" (long). */
export function formatDate(
  iso: string | Date,
  opts: Opts = {},
): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: opts.monthStyle ?? "short",
    day: "numeric",
    year: "numeric",
    timeZone: resolveTz(opts),
  });
}

/**
 * "Jun 26, 2026" (single date),
 * "Jun 26–28, 2026" (same-month range — collapsed),
 * "Jun 26, 2026 – Jul 2, 2026" (cross-month range).
 *
 * `end` may be null — falls back to single-date format.
 */
export function formatDateRange(
  start: string,
  end: string | null,
  opts: Opts = {},
): string {
  if (!end) return formatDate(start, opts);
  const monthStyle = opts.monthStyle ?? "short";
  const tz = resolveTz(opts);
  const s = new Date(start);
  const e = new Date(end);
  if (s.getUTCFullYear() === e.getUTCFullYear() && s.getUTCMonth() === e.getUTCMonth()) {
    const month = s.toLocaleDateString("en-US", { month: monthStyle, timeZone: tz });
    return `${month} ${s.getUTCDate()}–${e.getUTCDate()}, ${s.getUTCFullYear()}`;
  }
  return `${formatDate(start, opts)} – ${formatDate(end, opts)}`;
}

/** Admin lists need date + time (UTC). Returns "Jun 26, 2026, 3:30 PM" or "—" for null. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
    timeZone: "UTC",
  });
}
