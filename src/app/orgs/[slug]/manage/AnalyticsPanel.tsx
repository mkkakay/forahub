"use client";

// Manager-facing analytics panel. Receives a fully-aggregated summary
// from the server — NEVER raw rows, NEVER user_id, NEVER anonymous_id.
// The /lib/analytics/aggregate.ts loader proves this server-side; the
// component's props type also intentionally has no `user_id` /
// `anonymous_id` field, so even a future code edit can't accidentally
// pass identifiers down here.

import { useMemo, useState } from "react";
import { BarChart3, Eye, Bookmark, ExternalLink, Sparkles, Repeat } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

interface AggregateTotals {
  views: number;
  saves: number;
  unsaves: number;
  registration_clicks: number;
}
interface TrendPoint {
  date: string;
  views: number;
  saves: number;
  registration_clicks: number;
}
interface PerEventRow {
  event_id: string;
  title: string;
  start_date: string;
  series_id: string | null;
  views: number;
  saves: number;
  registration_clicks: number;
}
interface SeriesRollupRow {
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

interface Props {
  slug: string;
  orgName: string;
  summary30: AnalyticsSummary;
  summary90: AnalyticsSummary;
}

function fmt(d: string): string {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
function fmtFull(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function AnalyticsPanel(props: Props) {
  const [window, setWindow] = useState<"30" | "90">("30");
  const data = window === "30" ? props.summary30 : props.summary90;

  const showEmpty = data.total.views + data.total.saves + data.total.registration_clicks === 0;

  const chartData = useMemo(() => data.trend.map(p => ({
    ...p,
    label: fmt(p.date),
  })), [data]);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_1px_2px_rgba(15,42,74,0.04)]">
      <header className="flex items-start justify-between gap-3 p-5 md:p-6 border-b border-gray-100 dark:border-slate-800 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-slate-100">Analytics</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-prose">
            Track how people discover, save, and click through to your events.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Window"
          className="shrink-0 inline-flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px] font-semibold"
        >
          {(["30", "90"] as const).map(d => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={window === d}
              onClick={() => setWindow(d)}
              className={
                "px-3 py-1.5 rounded-md transition-colors " +
                (window === d
                  ? "bg-white dark:bg-slate-800 text-[#0f2a4a] dark:text-slate-100 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-[#0f2a4a] dark:hover:text-slate-100")
              }
            >
              Last {d} days
            </button>
          ))}
        </div>
      </header>

      <div className="p-5 md:p-6 space-y-6">
        {/* Metric cards — always shown, even when zero. Aggregate only. */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Eye className="w-3.5 h-3.5" />} label="Views" value={data.total.views} />
          <Stat icon={<Bookmark className="w-3.5 h-3.5" />} label="Saves" value={data.total.saves} />
          <Stat icon={<ExternalLink className="w-3.5 h-3.5" />} label="Reg. clicks" value={data.total.registration_clicks} />
        </div>

        {showEmpty ? (
          <div className="rounded-xl bg-gray-50/60 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 px-4 py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-gray-300 dark:text-slate-600" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100">No data yet for this window</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Analytics will appear once visitors engage with your published events.
            </p>
          </div>
        ) : (
          <div className="space-y-6">

          {/* Trend chart */}
          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl px-3 py-4">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2">Daily trend</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ea8de" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#4ea8de" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                    labelStyle={{ color: "#0f2a4a", fontWeight: 700 }}
                  />
                  <Area type="monotone" dataKey="views" stroke="#4ea8de" fill="url(#viewGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="saves" stroke="#10b981" fill="transparent" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="registration_clicks" stroke="#f59e0b" fill="transparent" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-600 dark:text-slate-400 mt-2 px-2 inline-flex items-center gap-3">
              <Legend swatch="#4ea8de" label="Views" />
              <Legend swatch="#10b981" label="Saves" />
              <Legend swatch="#f59e0b" label="Reg. clicks" />
            </p>
          </div>

          {/* Series rollup */}
          {data.seriesRollup.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <Repeat className="w-3 h-3" /> Series rollups
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
                {data.seriesRollup.map(s => (
                  <li key={s.series_id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 dark:text-slate-100 font-medium truncate">{s.series_title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{s.occurrence_count} occurrence(s) combined</p>
                      </div>
                      <div className="shrink-0 inline-flex items-center gap-3 text-[12px] text-gray-700 dark:text-slate-200 tabular-nums">
                        <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3 text-[#4ea8de]" /> {s.views}</span>
                        <span className="inline-flex items-center gap-1"><Bookmark className="w-3 h-3 text-emerald-600" /> {s.saves}</span>
                        <span className="inline-flex items-center gap-1"><ExternalLink className="w-3 h-3 text-amber-600" /> {s.registration_clicks}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top standalone events */}
          {data.topEvents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3" /> Top events
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
                {data.topEvents.map(ev => (
                  <li key={ev.event_id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 dark:text-slate-100 font-medium truncate">{ev.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                          {fmtFull(ev.start_date)}{ev.series_id && " · part of a series"}
                        </p>
                      </div>
                      <div className="shrink-0 inline-flex items-center gap-3 text-[12px] text-gray-700 dark:text-slate-200 tabular-nums">
                        <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3 text-[#4ea8de]" /> {ev.views}</span>
                        <span className="inline-flex items-center gap-1"><Bookmark className="w-3 h-3 text-emerald-600" /> {ev.saves}</span>
                        <span className="inline-flex items-center gap-1"><ExternalLink className="w-3 h-3 text-amber-600" /> {ev.registration_clicks}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      </div>

      <footer className="px-5 md:px-6 py-3 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-500 dark:text-slate-400">
        Only aggregate analytics are shown. Individual visitor identities are never exposed. Raw logs auto-delete after 14 months.
      </footer>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider inline-flex items-center gap-1.5">
        <span className="text-gray-600 dark:text-slate-400">{icon}</span> {label}
      </p>
      <p className="text-2xl font-bold text-[#0f2a4a] dark:text-slate-100 mt-1 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span style={{ background: swatch }} className="w-2 h-2 rounded-full" />
      {label}
    </span>
  );
}
