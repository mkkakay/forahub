"use client";

// Live events panel on the manage page. Replaces the static
// "Event management (coming soon)" card. Lists every event attributed to
// this org (by org_slug) with a clear status badge (Published / Pending
// review / Needs recheck) plus the auto-publish posture for the viewer's
// own seat. Edit + admin-takedown are out of scope here — the PATCH
// endpoint exists but the UI is intentionally read-only in this iteration.

import Link from "next/link";
import { CalendarDays, BadgeCheck, Clock, AlertTriangle, ExternalLink, Zap, ShieldCheck } from "lucide-react";

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
  /** Server tells us the viewer's posture so the header copy is honest:
   *  "your seat publishes instantly" vs "your submissions go to review". */
  viewerCanAutoPublish: boolean;
  viewerAddedVia: string | null;
  /** Capacity remaining in the rolling 24h window. Shown when low so the
   *  team knows the soft cap is about to bite. */
  autoPublishedInWindow: number;
  autoPublishCap: number;
  autoPublishWindowHours: number;
}

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
    return { label: "Pending review", cls: "bg-blue-50 text-blue-700 border-blue-200", Icon: Clock };
  }
  return { label: e.status, cls: "bg-gray-50 text-gray-700 border-gray-200", Icon: Clock };
}

export default function EventsPanel(props: Props) {
  const remaining = Math.max(0, props.autoPublishCap - props.autoPublishedInWindow);
  const capLow = props.viewerCanAutoPublish && remaining <= 1;

  return (
    <section className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
      <header className="flex items-start justify-between gap-3 p-5 md:p-6 border-b border-gray-100">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#0f2a4a] inline-flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#0f2a4a]" /> Events
            <span className="text-xs font-semibold text-gray-500 tabular-nums">({props.events.length})</span>
          </h2>
          {props.viewerCanAutoPublish ? (
            <p className="text-xs text-emerald-800 mt-1 inline-flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-600" />
              You&apos;re a verified manager — your submissions for <span className="font-semibold">{props.orgName}</span> go live instantly.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-gray-400" />
              Your seat publishes via review. A domain-verified manager can grant you instant publishing from the Team section.
            </p>
          )}
        </div>
        <Link
          href="/submit/single"
          className="shrink-0 inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-3 py-2 rounded-xl text-xs"
        >
          + New event
        </Link>
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
          <div className="border border-dashed border-gray-200 rounded-xl px-4 py-10 text-center">
            <CalendarDays className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#0f2a4a]">No events yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Add your first event to put <span className="font-semibold">{props.orgName}</span> on the map.
            </p>
            <Link
              href="/submit/single"
              className="inline-flex items-center gap-1.5 mt-4 bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-4 py-2 rounded-xl text-xs"
            >
              + Submit an event
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {props.events.map(e => {
              const badge = statusBadge(e);
              const BadgeIcon = badge.Icon;
              return (
                <li key={e.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/events/${e.id}`} className="text-gray-900 font-medium hover:text-[#4ea8de] inline-flex items-center gap-1 group">
                        <span className="truncate">{e.title}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#4ea8de]" />
                      </Link>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span>{fmtDate(e.start_date)}</span>
                        {e.location && <><span>·</span><span className="truncate max-w-[200px]">{e.location}</span></>}
                        {e.format && e.format !== "in_person" && <><span>·</span><span>{e.format.replace("_", " ")}</span></>}
                        {e.auto_published_at && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <Zap className="w-2.5 h-2.5" /> auto-published
                            </span>
                          </>
                        )}
                      </div>
                      {e.needs_recheck && e.needs_recheck_reason && (
                        <p className="text-[11px] text-amber-800 mt-1 italic">
                          Flagged for admin review — {e.needs_recheck_reason}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold border rounded px-1.5 py-0.5 ${badge.cls}`}>
                      <BadgeIcon className="w-2.5 h-2.5" /> {badge.label}
                    </span>
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
