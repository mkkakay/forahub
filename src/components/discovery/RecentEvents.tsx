// Most-recently-added published events. Server-rendered, no client
// fetch. Renders nothing if the query returned nothing — never a
// placeholder row. We deliberately do NOT include logo / verified
// markers from the org row; an event being in the directory does not
// imply any organization "joined" or "endorsed" ForaHub.

import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { RecentEventRow } from "@/lib/discovery/queries";

interface Props {
  events: RecentEventRow[];
  /** Optional heading override. Default fits the submit page hero. */
  title?: string;
  subtitle?: string;
}

function fmtAddedAt(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtStart(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function RecentEvents({
  events,
  title = "Recently added",
  subtitle = "Newest events in the directory.",
}: Props) {
  if (events.length === 0) return null;

  return (
    <section
      aria-labelledby="recent-events-heading"
      className="bg-white dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700/70 rounded-2xl shadow-[0_1px_2px_rgba(15,42,74,0.04)] overflow-hidden"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-800">
        <div className="min-w-0">
          <h3 id="recent-events-heading" className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <Link
          href="/events"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#0f2a4a] dark:text-slate-100 hover:underline underline-offset-2"
        >
          Browse all
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </header>
      <ul className="divide-y divide-gray-100 dark:divide-slate-800">
        {events.map(e => (
          <li key={e.id}>
            <Link
              href={`/events/${e.id}`}
              className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors"
            >
              <span className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-[#0f2a4a]/5 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-[#0f2a4a]/70" aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate group-hover:text-[#0f2a4a] dark:group-hover:text-slate-100">
                  {e.title}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                  {e.organization || "—"}
                  <span className="text-gray-300 dark:text-slate-600 mx-1.5" aria-hidden="true">·</span>
                  {fmtStart(e.start_date)}
                  {e.region && (
                    <>
                      <span className="text-gray-300 dark:text-slate-600 mx-1.5" aria-hidden="true">·</span>
                      {e.region}
                    </>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-gray-600 dark:text-slate-400 mt-0.5">added {fmtAddedAt(e.created_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
