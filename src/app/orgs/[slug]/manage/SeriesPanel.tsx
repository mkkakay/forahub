"use client";

// Recurring-event series panel. Replaces the static "Recurring events
// (coming soon)" card. Builder lets a manager pick a frequency, interval,
// time, end-condition, and the shared event fields; live preview of the
// next 5 dates before saving. List of existing series with edit / cancel
// actions. All server-side enforcement of "must be a manager" lives in
// the API; this UI is the ergonomic layer.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Repeat, AlertCircle, CheckCircle2, X, Loader2, Trash2, Plus,
  CalendarPlus, ChevronUp, Info,
} from "lucide-react";

const FRIENDLY: Record<string, string> = {
  signin_required: "You're signed out. Sign in and try again.",
  not_a_manager: "Only verified managers can manage series.",
  series_not_found: "We couldn't find that series.",
  rrule_invalid: "That recurrence rule didn't parse — try the builder defaults again.",
  rrule_required: "Pick a frequency before saving.",
  rrule_unparseable: "We couldn't read that recurrence rule.",
  series_title_required: "Give the series a title.",
  organization_required: "Pick or confirm the organization for this series.",
  no_editable_fields: "Nothing changed.",
};

function friendly(code: string | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!code) return fallback;
  return FRIENDLY[code] ?? fallback;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface SeriesRow {
  id: string;
  series_title: string;
  organization: string;
  format: string;
  location: string | null;
  online_url: string | null;
  registration_url: string | null;
  timezone: string;
  start_time_local: string;
  duration_minutes: number;
  rrule: string;
  until_date: string | null;
  occurrence_count: number | null;
  status: string;
  auto_published_at: string | null;
  created_at: string;
  last_horizon_at: string | null;
  _counts?: { upcoming: number; past: number; exceptions: number; cancelled: number };
}

interface Props {
  slug: string;
  orgName: string;
  orgDomain: string | null;
  /** Default values for the shared template fields the manage page already
   *  knows — saves the manager re-typing the org name + domain hints. */
  defaultOrganization: string;
}

type Freq = "WEEKLY" | "MONTHLY" | "DAILY" | "YEARLY";
const WEEKDAY_LABELS: { id: string; short: string; full: string }[] = [
  { id: "MO", short: "Mon", full: "Monday" },
  { id: "TU", short: "Tue", full: "Tuesday" },
  { id: "WE", short: "Wed", full: "Wednesday" },
  { id: "TH", short: "Thu", full: "Thursday" },
  { id: "FR", short: "Fri", full: "Friday" },
  { id: "SA", short: "Sat", full: "Saturday" },
  { id: "SU", short: "Sun", full: "Sunday" },
];

/** Compose the RRULE string from builder inputs. We only emit the fields
 *  the user is currently expressing — `rrule` library tolerates omitted
 *  defaults. */
function buildRruleString(b: {
  freq: Freq;
  interval: number;
  byweekday: string[];
  bymonthday: number | null;
  endMode: "never" | "until" | "count";
  until: string;
  count: number;
}): string {
  const parts: string[] = [`FREQ=${b.freq}`];
  if (b.interval > 1) parts.push(`INTERVAL=${b.interval}`);
  if (b.freq === "WEEKLY" && b.byweekday.length > 0) {
    parts.push(`BYDAY=${b.byweekday.join(",")}`);
  }
  if (b.freq === "MONTHLY" && b.bymonthday) {
    parts.push(`BYMONTHDAY=${b.bymonthday}`);
  }
  if (b.endMode === "until" && b.until) {
    const u = new Date(b.until + "T23:59:59Z").toISOString().replace(/[-:]|\.\d{3}/g, "");
    parts.push(`UNTIL=${u}`);
  } else if (b.endMode === "count" && b.count > 0) {
    parts.push(`COUNT=${b.count}`);
  }
  return "RRULE:" + parts.join(";");
}

export default function SeriesPanel(props: Props) {
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  function flash(kind: "ok" | "error", text: string) {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 6000);
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${props.slug}/series`);
      const json = await res.json();
      if (!res.ok) {
        flash("error", friendly(json?.error));
        return;
      }
      setSeries((json.series ?? []) as SeriesRow[]);
    } catch {
      flash("error", "Couldn't load series. Try again.");
    } finally {
      setLoading(false);
    }
  }, [props.slug]);

  useEffect(() => { refresh(); }, [refresh]);

  async function cancelSeries(s: SeriesRow) {
    setActingId(s.id);
    try {
      const res = await fetch(`/api/orgs/${props.slug}/series/${s.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        flash("error", friendly(json?.error));
        return;
      }
      flash("ok", json?.message ?? `Series cancelled. ${json.occurrences_cancelled ?? 0} occurrence(s) hidden.`);
      await refresh();
      setCancelConfirmId(null);
    } catch {
      flash("error", "Something went wrong. Please try again.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_1px_2px_rgba(15,42,74,0.04)]">
      <header className="flex items-start justify-between gap-3 p-5 md:p-6 border-b border-gray-100 dark:border-slate-800 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-slate-100">Event series &amp; templates</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-prose">
            Create reusable schedules for webinars, annual conferences, briefings, or recurring calls. Edits to a series cascade to future dates; an individually-edited occurrence is left alone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBuilder(v => !v)}
          className="shrink-0 inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold text-sm px-3.5 py-2 rounded-xl transition-colors"
        >
          {showBuilder ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showBuilder ? "Close builder" : "New series"}
        </button>
      </header>

      {toast && (
        <div className={`mx-5 md:mx-6 mt-4 flex items-start gap-2 text-sm rounded-xl px-3 py-2 border ${
          toast.kind === "ok"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.kind === "ok"
            ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            : <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />}
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} className={toast.kind === "ok" ? "text-emerald-500 hover:text-emerald-700" : "text-red-500 hover:text-red-700"}>
            <X size={14} />
          </button>
        </div>
      )}

      {showBuilder && (
        <Builder
          slug={props.slug}
          defaultOrganization={props.defaultOrganization}
          onSaved={async () => {
            setShowBuilder(false);
            await refresh();
            flash("ok", "Series created. Occurrences are listed in the events panel above.");
          }}
        />
      )}

      <div className="p-5 md:p-6">
        {loading && series.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500 dark:text-slate-400 inline-flex items-center justify-center gap-2 w-full">
            <Loader2 size={14} className="animate-spin" /> Loading series…
          </div>
        ) : series.length === 0 ? (
          <div className="border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl px-5 py-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#0f2a4a]/5 flex items-center justify-center mb-3">
              <Repeat className="w-5 h-5 text-[#0f2a4a] dark:text-slate-100" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100">Build a reusable schedule</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Save a parent rule once and ForaHub materialises the next 12 months of occurrences.
            </p>
            <ul className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-md mx-auto text-left">
              {[
                "Weekly webinar",
                "Monthly briefing",
                "Annual conference",
                "Office hours",
              ].map(ex => (
                <li
                  key={ex}
                  className="text-xs font-medium text-gray-700 dark:text-slate-200 bg-gray-50/80 dark:bg-slate-900/80 border border-gray-200/80 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5"
                >
                  {ex}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              className="inline-flex items-center gap-1.5 mt-6 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create first series
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {series.map(s => {
              const counts = s._counts ?? { upcoming: 0, past: 0, exceptions: 0, cancelled: 0 };
              const isCancelled = s.status === "cancelled";
              return (
                <li key={s.id} className={`border rounded-xl px-4 py-3 ${isCancelled ? "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 opacity-80" : "border-gray-100 dark:border-slate-800"}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100 inline-flex items-center gap-2">
                        {s.series_title}
                        {isCancelled && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-1.5 py-0.5">cancelled</span>
                        )}
                        {!isCancelled && s.auto_published_at && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">auto-published</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 font-mono">{s.rrule}</p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                        {counts.upcoming} upcoming · {counts.past} past
                        {counts.exceptions > 0 && <> · {counts.exceptions} exception{counts.exceptions === 1 ? "" : "s"}</>}
                        {counts.cancelled > 0 && <> · {counts.cancelled} cancelled</>}
                      </p>
                    </div>
                    {!isCancelled && (
                      <div className="shrink-0 inline-flex items-center gap-2">
                        {cancelConfirmId === s.id ? (
                          <>
                            <span className="text-[11px] text-amber-700">Cancel all future?</span>
                            <button
                              onClick={() => cancelSeries(s)}
                              disabled={actingId === s.id}
                              className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-[11px] px-2 py-1 rounded"
                            >
                              {actingId === s.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                              Confirm
                            </button>
                            <button
                              onClick={() => setCancelConfirmId(null)}
                              className="text-[11px] text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                            >
                              Keep
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCancelConfirmId(s.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-red-700 border border-red-200 hover:bg-red-50 rounded px-2 py-1"
                          >
                            <Trash2 className="w-3 h-3" /> Cancel future
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 inline-flex items-center gap-1.5 flex-wrap">
                    <Info className="w-3 h-3" />
                    <span>To edit one occurrence, open it from the Events panel above. Edits to a single occurrence promote it to an exception and don&apos;t get rewritten by future series edits.</span>
                  </div>
                  <div className="mt-2">
                    <Link href={`/organizations/${props.slug}`} className="text-[11px] text-blue-700 hover:underline">View on org page →</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// ─── Builder ─────────────────────────────────────────────────────────────

interface PreviewRow { occurrence_date: string; start_date_iso: string }

function Builder({ slug, defaultOrganization, onSaved }: {
  slug: string;
  defaultOrganization: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [organization, setOrganization] = useState(defaultOrganization);
  const [format, setFormat] = useState<"in_person" | "virtual" | "hybrid">("virtual");
  const [location, setLocation] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [timezone, setTimezone] = useState(typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC");

  const [freq, setFreq] = useState<Freq>("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [byweekday, setByweekday] = useState<string[]>(["MO"]);
  const [bymonthday, setBymonthday] = useState<number | null>(null);
  const [endMode, setEndMode] = useState<"never" | "until" | "count">("until");
  const [untilDate, setUntilDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [countN, setCountN] = useState(12);

  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rrule = useMemo(() => buildRruleString({
    freq, interval, byweekday, bymonthday,
    endMode, until: untilDate, count: countN,
  }), [freq, interval, byweekday, bymonthday, endMode, untilDate, countN]);

  // Live preview with a 250ms debounce so we don't hammer the endpoint
  // on every keystroke.
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/series/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rrule,
            start_time_local: startTime + ":00",
            until_date: endMode === "until" ? new Date(untilDate).toISOString() : null,
            occurrence_count: endMode === "count" ? countN : null,
            count: 5,
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setPreview([]);
          setPreviewError(friendly(json?.error));
          return;
        }
        setPreview(json.preview as PreviewRow[]);
        setPreviewError(null);
      } catch {
        if (!cancelled) setPreviewError("Couldn't compute preview.");
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [rrule, startTime, endMode, untilDate, countN]);

  async function save() {
    setError(null);
    if (!title.trim()) { setError(FRIENDLY.series_title_required); return; }
    if (!organization.trim()) { setError(FRIENDLY.organization_required); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/orgs/${slug}/series`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rrule,
          timezone,
          start_time_local: startTime + ":00",
          duration_minutes: duration,
          series_title: title.trim(),
          series_description: description.trim() || null,
          organization: organization.trim(),
          registration_url: registrationUrl.trim() || null,
          format,
          location: format === "virtual" ? null : location.trim() || null,
          online_url: format === "in_person" ? null : onlineUrl.trim() || null,
          sdg_goals: [],
          event_type: "webinar",
          until_date: endMode === "until" ? new Date(untilDate).toISOString() : null,
          occurrence_count: endMode === "count" ? countN : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(friendly(json?.error));
        return;
      }
      onSaved();
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-gray-100 dark:border-slate-800 px-5 md:px-6 py-5 bg-gray-50 dark:bg-slate-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: details */}
        <div className="space-y-3">
          <Field label="Series title">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekly Open Office Hours"
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de]"
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] resize-none"
            />
          </Field>
          <Field label="Organization">
            <input
              value={organization}
              onChange={e => setOrganization(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Format">
            <select
              value={format}
              onChange={e => setFormat(e.target.value as "in_person" | "virtual" | "hybrid")}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
            >
              <option value="virtual">Virtual</option>
              <option value="in_person">In person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
          {format !== "virtual" && (
            <Field label="Location">
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City, country"
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </Field>
          )}
          {format !== "in_person" && (
            <Field label="Online URL">
              <input
                value={onlineUrl}
                onChange={e => setOnlineUrl(e.target.value)}
                placeholder="https://…"
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </Field>
          )}
          <Field label="Registration URL (optional)">
            <input
              value={registrationUrl}
              onChange={e => setRegistrationUrl(e.target.value)}
              placeholder="https://…"
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
            />
          </Field>
        </div>

        {/* Right: recurrence */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start time">
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Duration (min)">
              <input
                type="number"
                min={5}
                value={duration}
                onChange={e => setDuration(Math.max(5, Number(e.target.value) || 60))}
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <Field label="Timezone">
            <input
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-mono"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <select
                value={freq}
                onChange={e => setFreq(e.target.value as Freq)}
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </Field>
            <Field label="Every">
              <input
                type="number"
                min={1}
                value={interval}
                onChange={e => setInterval(Math.max(1, Number(e.target.value) || 1))}
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </Field>
          </div>
          {freq === "WEEKLY" && (
            <Field label="Days of week">
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map(d => {
                  const sel = byweekday.includes(d.id);
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => setByweekday(prev => sel ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${sel
                        ? "bg-[#0f2a4a] border-[#0f2a4a] text-white"
                        : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900"}`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          {freq === "MONTHLY" && (
            <Field label="Day of month (1-31)">
              <input
                type="number"
                min={1} max={31}
                value={bymonthday ?? ""}
                onChange={e => {
                  const v = Number(e.target.value);
                  setBymonthday(v >= 1 && v <= 31 ? v : null);
                }}
                placeholder="e.g. 15"
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm"
              />
            </Field>
          )}
          <Field label="Ends">
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="end" checked={endMode === "until"} onChange={() => setEndMode("until")} />
                <span>On date</span>
                {endMode === "until" && (
                  <input
                    type="date"
                    value={untilDate}
                    onChange={e => setUntilDate(e.target.value)}
                    className="ml-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 text-sm"
                  />
                )}
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="end" checked={endMode === "count"} onChange={() => setEndMode("count")} />
                <span>After</span>
                {endMode === "count" && (
                  <input
                    type="number"
                    min={1}
                    value={countN}
                    onChange={e => setCountN(Math.max(1, Number(e.target.value) || 1))}
                    className="ml-2 w-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 text-sm"
                  />
                )}
                <span>occurrences</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="end" checked={endMode === "never"} onChange={() => setEndMode("never")} />
                <span>Never (rolling 12 months)</span>
              </label>
            </div>
          </Field>
        </div>
      </div>

      <div className="mt-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
          <CalendarPlus className="w-3 h-3" /> Preview · next {preview.length} dates
        </p>
        {previewError ? (
          <p className="text-xs text-amber-700">{previewError}</p>
        ) : preview.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-slate-400">Adjust the rule to see a preview.</p>
        ) : (
          <ul className="text-sm text-gray-800 dark:text-slate-100 space-y-1">
            {preview.map(p => (
              <li key={p.occurrence_date} className="font-mono">
                {fmtDate(p.start_date_iso)} · {new Date(p.start_date_iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 font-mono break-all">{rrule}</p>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || preview.length === 0}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {saving ? "Saving…" : "Create series"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}
