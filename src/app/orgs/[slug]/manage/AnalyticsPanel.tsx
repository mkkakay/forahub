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
    <section className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
      <header className="flex items-start justify-between gap-3 p-5 md:p-6 border-b border-gray-100 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#0f2a4a] inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0f2a4a]" /> Analytics
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-prose">
            Aggregate views, saves, and registration clicks across <span className="font-semibold">{props.orgName}</span>&apos;s events — from visitors who&apos;ve consented to analytics. We never show individual identities, only totals and trends.
          </p>
        </div>
        <div className="shrink-0 inline-flex bg-gray-100 rounded-lg p-0.5 text-[11px] font-semibold">
          {(["30", "90"] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setWindow(d)}
              className={`px-3 py-1 rounded-md ${window === d ? "bg-white text-[#0f2a4a] shadow-sm" : "text-gray-500"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      {showEmpty ? (
        <div className="p-5 md:p-6">
          <div className="border border-dashed border-gray-200 rounded-xl px-4 py-10 text-center">
            <BarChart3 className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#0f2a4a]">Nothing logged yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Either no consented visitors have engaged with your events in the last {data.windowDays} days, or analytics is brand-new on your org. Counts populate as users opt in.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-5 md:p-6 space-y-6">
          {/* Totals — aggregate only */}
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<Eye className="w-3.5 h-3.5" />} label="Views" value={data.total.views} />
            <Stat icon={<Bookmark className="w-3.5 h-3.5" />} label="Saves" value={data.total.saves} />
            <Stat icon={<ExternalLink className="w-3.5 h-3.5" />} label="Reg. clicks" value={data.total.registration_clicks} />
          </div>

          {/* Trend chart */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Daily trend</p>
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
            <p className="text-[10px] text-gray-400 mt-2 px-2 inline-flex items-center gap-3">
              <Legend swatch="#4ea8de" label="Views" />
              <Legend swatch="#10b981" label="Saves" />
              <Legend swatch="#f59e0b" label="Reg. clicks" />
            </p>
          </div>

          {/* Series rollup */}
          {data.seriesRollup.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <Repeat className="w-3 h-3" /> Series rollups
              </h3>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {data.seriesRollup.map(s => (
                  <li key={s.series_id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 font-medium truncate">{s.series_title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{s.occurrence_count} occurrence(s) combined</p>
                      </div>
                      <div className="shrink-0 inline-flex items-center gap-3 text-[12px] text-gray-700 tabular-nums">
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
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3" /> Top events
              </h3>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {data.topEvents.map(ev => (
                  <li key={ev.event_id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 font-medium truncate">{ev.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {fmtFull(ev.start_date)}{ev.series_id && " · part of a series"}
                        </p>
                      </div>
                      <div className="shrink-0 inline-flex items-center gap-3 text-[12px] text-gray-700 tabular-nums">
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

      <footer className="px-5 md:px-6 py-3 border-t border-gray-100 text-[11px] text-gray-400">
        Raw logs auto-delete after 14 months. We never share or expose individual user identities — only the aggregate totals shown here.
      </footer>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider inline-flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className="text-2xl font-extrabold text-[#0f2a4a] mt-1 tabular-nums">{value.toLocaleString()}</p>
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
