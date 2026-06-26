"use client";

// Live events panel on the manage page. Lists every event attributed to
// this org (by org_slug) with a clear status badge (Published / Pending
// review / Needs recheck) plus the auto-publish posture for the viewer's
// own seat. Edit + admin-takedown live elsewhere; this view is read-only.

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays, BadgeCheck, Clock, AlertTriangle, ExternalLink, Zap,
  ShieldCheck, Search, Plus,
} from "lucide-react";

export interface EventView {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  format: string | null;
  status: string;
  submission_status: string | null;
  source_type: string | null;
  submission_source: string | null;
  auto_published_at: string | null;
  needs_recheck: boolean;
  needs_recheck_at: string | null;
  needs_recheck_reason: string | null;
  submitted_at: string | null;
  created_at: string;
}

interface Props {
  slug: string;
  orgName: string;
  events: EventView[];
  viewerCanAutoPublish: boolean;
  viewerAddedVia: string | null;
  autoPublishedInWindow: number;
  autoPublishCap: number;
  autoPublishWindowHours: number;
}

type Filter = "all" | "upcoming" | "past" | "pending";

const FILTER_DEFS: { id: Filter; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past",     label: "Past" },
  { id: "pending",  label: "Pending review" },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusBadge(e: EventView): { label: string; cls: string; Icon: typeof BadgeCheck } {
  if (e.needs_recheck) {
    return { label: "Needs recheck", cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: AlertTriangle };
  }
  if (e.status === "published") {
    return { label: "Published", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: BadgeCheck };
  }
  if (e.status === "pending") {
    return { label: "Pending review", cls: "bg-[#0f2a4a]/5 text-[#0f2a4a] dark:text-slate-100 border-[#0f2a4a]/15", Icon: Clock };
  }
  return { label: e.status, cls: "bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-700", Icon: Clock };
}

export default function EventsPanel(props: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const remaining = Math.max(0, props.autoPublishCap - props.autoPublishedInWindow);
  const capLow = props.viewerCanAutoPublish && remaining <= 1;

  const filtered = useMemo(() => {
    const nowMs = Date.now();
    const q = query.trim().toLowerCase();
    return props.events.filter(e => {
      const ts = new Date(e.end_date ?? e.start_date).getTime();
      const matchesFilter =
        filter === "all" ? true :
        filter === "upcoming" ? ts >= nowMs :
        filter === "past" ? ts < nowMs :
        filter === "pending" ? e.status === "pending" :
        true;
      if (!matchesFilter) return false;
      if (q) {
        const hay = `${e.title} ${e.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [props.events, filter, query]);

  const counts = useMemo(() => {
    const nowMs = Date.now();
    return {
      all: props.events.length,
      upcoming: props.events.filter(e => new Date(e.end_date ?? e.start_date).getTime() >= nowMs).length,
      past:     props.events.filter(e => new Date(e.end_date ?? e.start_date).getTime() < nowMs).length,
      pending:  props.events.filter(e => e.status === "pending").length,
    };
  }, [props.events]);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_1px_2px_rgba(15,42,74,0.04)]">
      <header className="flex flex-col gap-3 p-5 md:p-6 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-slate-100">Events</h2>
            {props.viewerCanAutoPublish ? (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-emerald-600" />
                Your submissions for <span className="font-semibold text-[#0f2a4a] dark:text-slate-100">{props.orgName}</span> go live instantly.
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                Your seat publishes via review. A domain-verified manager can grant instant publishing from the Team tab.
              </p>
            )}
          </div>
          <Link
            href="/submit/single"
            className="shrink-0 inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold text-sm px-3.5 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> New event
          </Link>
        </div>

        {/* Filter pills + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div role="tablist" aria-label="Filter events" className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 scrollbar-none">
            {FILTER_DEFS.map(({ id, label }) => {
              const c = counts[id];
              const isActive = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFilter(id)}
                  className={
                    "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors " +
                    (isActive
                      ? "bg-[#0f2a4a] text-white"
                      : "text-gray-600 dark:text-slate-300 hover:text-[#0f2a4a] dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800")
                  }
                >
                  {label}
                  <span className={
                    "tabular-nums text-[10px] " +
                    (isActive ? "text-white/70" : "text-gray-600 dark:text-slate-400")
                  }>
                    {c}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search events…"
              className="w-full bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 rounded-full pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400/90 dark:placeholder-slate-500/90 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/30 focus:border-[#4ea8de]"
            />
          </div>
        </div>
      </header>

      {capLow && (
        <div className="mx-5 md:mx-6 mt-4 flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <span>
            <strong>{props.orgName}</strong> has used {props.autoPublishedInWindow} of {props.autoPublishCap} instant-publishes in the last {props.autoPublishWindowHours}h. Further submissions today will route to admin review until the window rolls over.
          </span>
        </div>
      )}

      <div className="p-5 md:p-6">
        {props.events.length === 0 ? (
          <EmptyState orgName={props.orgName} reason="none" />
        ) : filtered.length === 0 ? (
          <EmptyState orgName={props.orgName} reason="filter" />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
            {filtered.map(e => {
              const badge = statusBadge(e);
              const BadgeIcon = badge.Icon;
              return (
                <li key={e.id} className="group hover:bg-gray-50/60 dark:hover:bg-slate-900/60 transition-colors">
                  <Link href={`/events/${e.id}`} className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-[#0f2a4a] dark:group-hover:text-slate-100 truncate inline-flex items-center gap-1.5">
                        {e.title}
                        <ExternalLink className="w-3 h-3 text-gray-300 dark:text-slate-600 group-hover:text-[#0f2a4a] dark:group-hover:text-slate-100 transition-colors" />
                      </p>
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>{fmtDate(e.start_date)}</span>
                        {e.location && <><span className="text-gray-300 dark:text-slate-600">·</span><span className="truncate max-w-[200px]">{e.location}</span></>}
                        {e.format && e.format !== "in_person" && (
                          <><span className="text-gray-300 dark:text-slate-600">·</span><span className="capitalize">{e.format.replace("_", " ")}</span></>
                        )}
                        {e.auto_published_at && (
                          <>
                            <span className="text-gray-300 dark:text-slate-600">·</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <Zap className="w-2.5 h-2.5" /> auto-published
                            </span>
                          </>
                        )}
                      </div>
                      {e.needs_recheck && e.needs_recheck_reason && (
                        <p className="text-[11px] text-amber-800 mt-1.5 italic">
                          Flagged for admin review — {e.needs_recheck_reason}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold border rounded-full px-2 py-0.5 mt-0.5 ${badge.cls}`}>
                      <BadgeIcon className="w-2.5 h-2.5" /> {badge.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function EmptyState({ orgName, reason }: { orgName: string; reason: "none" | "filter" }) {
  return (
    <div className="border border-dashed border-gray-200 dark:border-slate-700 rounded-xl px-4 py-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center mb-3">
        <CalendarDays className="w-5 h-5 text-gray-300 dark:text-slate-600" aria-hidden="true" />
      </div>
      {reason === "none" ? (
        <>
          <p className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100">No events yet</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Publish your first event to put <span className="font-semibold">{orgName}</span> on the map.
          </p>
          <Link
            href="/submit/single"
            className="inline-flex items-center gap-1.5 mt-4 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Submit an event
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100">No matches</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Try a different filter or search term.</p>
        </>
      )}
    </div>
  );
}
