"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MapPin, Tag, Calendar } from "lucide-react";

const EventsMap = dynamic(() => import("@/components/EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
  ),
});

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

export interface VisibleEvent {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  location: string | null;
  sdg: number | null;
}

interface MapPin { id: string; lat: number; lng: number; sdg: number | null; }

const VISIBLE_LIMIT = 20;

export default function MapPageClient() {
  const [sdgs, setSdgs] = useState<Set<number>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [visibleDetails, setVisibleDetails] = useState<VisibleEvent[]>([]);

  const filters = useMemo(() => ({
    sdg: sdgs.size > 0 ? Array.from(sdgs).sort((a, b) => a - b) : undefined,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  }), [sdgs, dateFrom, dateTo]);

  function toggleSdg(n: number) {
    setSdgs(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }

  function clearFilters() {
    setSdgs(new Set());
    setDateFrom("");
    setDateTo("");
  }

  async function handlePinsLoaded(pins: MapPin[]) {
    const ids = pins.slice(0, VISIBLE_LIMIT).map(p => p.id);
    setVisibleIds(ids);
    if (ids.length === 0) {
      setVisibleDetails([]);
      return;
    }
    // Fetch detail for the first N visible pins so the side list can show titles.
    const details = await Promise.all(
      ids.map(async id => {
        try {
          const res = await fetch(`/api/map/event/${encodeURIComponent(id)}`);
          if (!res.ok) return null;
          return (await res.json()) as VisibleEvent;
        } catch {
          return null;
        }
      })
    );
    setVisibleDetails(details.filter((d): d is VisibleEvent => d !== null));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
            <MapPin size={16} className="text-emerald-600" />
            <span>Showing in-person events. Pan and zoom to refine — pins update for the visible area.</span>
          </div>
          <EventsMap
            mode="full"
            height="70vh"
            initialFilters={filters}
            onPinsLoaded={handlePinsLoaded}
          />
        </div>

        {/* Visible events list (top 20) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#0f2a4a] mb-3">
            Events in this view{" "}
            <span className="text-sm font-normal text-gray-500">
              · showing first {Math.min(visibleIds.length, VISIBLE_LIMIT)}
            </span>
          </h2>
          {visibleDetails.length === 0 ? (
            <p className="text-sm text-gray-500">No events in this view. Pan or zoom out to find more.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visibleDetails.map(ev => (
                <li key={ev.id} className="py-2">
                  <Link href={`/events/${ev.id}`} className="flex items-start justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0f2a4a] group-hover:text-[#4ea8de] line-clamp-1">
                        {ev.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {ev.organization && <span>{ev.organization}</span>}
                        {ev.organization && ev.location && <span> · </span>}
                        {ev.location && <span>{ev.location}</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">
                      {new Date(ev.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div>
          <h2 className="text-sm font-bold text-[#0f2a4a] uppercase tracking-wider mb-3 inline-flex items-center gap-1.5">
            <Tag size={14} className="text-violet-600" /> SDGs
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 17 }, (_, i) => i + 1).map(n => {
              const active = sdgs.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleSdg(n)}
                  title={SDG_LABELS[n]}
                  className={`text-xs font-semibold px-2 py-1 rounded border transition-colors ${
                    active
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-[#0f2a4a] uppercase tracking-wider mb-3 inline-flex items-center gap-1.5">
            <Calendar size={14} className="text-blue-600" /> Date range
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
              />
            </label>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Format: <span className="font-semibold text-gray-700">In-person only</span>
          <p className="text-[11px] text-gray-400 mt-0.5">Online events don&apos;t have a location and aren&apos;t shown on the map.</p>
        </div>

        {(sdgs.size > 0 || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={clearFilters}
            className="w-full text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg py-1.5"
          >
            Clear filters
          </button>
        )}
      </aside>
    </div>
  );
}
