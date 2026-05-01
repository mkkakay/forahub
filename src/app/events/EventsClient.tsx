"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Building2, Tag, Filter, X, Search } from "lucide-react";
import type { Database } from "@/lib/supabase/types";
import { matchesSearch } from "@/lib/search";
import { supabase } from "@/lib/supabase/client";
import BookmarkButton from "@/components/BookmarkButton";
import CalendarExportMenu from "@/components/CalendarExportMenu";
import ShareMenu from "@/components/ShareMenu";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

const SDG_META: Record<number, { label: string; color: string }> = {
  1:  { label: "No Poverty",              color: "bg-red-100 text-red-800" },
  2:  { label: "Zero Hunger",             color: "bg-yellow-100 text-yellow-800" },
  3:  { label: "Good Health",             color: "bg-green-100 text-green-800" },
  4:  { label: "Quality Education",       color: "bg-red-100 text-red-800" },
  5:  { label: "Gender Equality",         color: "bg-orange-100 text-orange-800" },
  6:  { label: "Clean Water",             color: "bg-cyan-100 text-cyan-800" },
  7:  { label: "Affordable Energy",       color: "bg-amber-100 text-amber-800" },
  8:  { label: "Decent Work",             color: "bg-rose-100 text-rose-800" },
  9:  { label: "Industry & Innovation",   color: "bg-orange-100 text-orange-800" },
  10: { label: "Reduced Inequalities",    color: "bg-pink-100 text-pink-800" },
  11: { label: "Sustainable Cities",      color: "bg-amber-100 text-amber-800" },
  12: { label: "Responsible Consumption", color: "bg-lime-100 text-lime-800" },
  13: { label: "Climate Action",          color: "bg-green-100 text-green-800" },
  14: { label: "Life Below Water",        color: "bg-blue-100 text-blue-800" },
  15: { label: "Life on Land",            color: "bg-lime-100 text-lime-800" },
  16: { label: "Peace & Justice",         color: "bg-purple-100 text-purple-800" },
  17: { label: "Partnerships",            color: "bg-indigo-100 text-indigo-800" },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: "Conference",
  side_event: "Side Event",
  webinar: "Webinar",
  training: "Training",
};

const FORMAT_LABELS: Record<string, string> = {
  in_person: "In Person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

const REGIONS: Record<string, string[]> = {
  Africa: ["Kenya", "Ethiopia", "Nigeria", "South Africa", "Senegal", "Ghana", "Rwanda", "Congo", "Egypt", "Nairobi", "Addis Ababa", "Johannesburg", "Cairo", "Brazzaville", "Abidjan", "Abuja"],
  Americas: ["USA", "Brazil", "Colombia", "Peru", "Argentina", "Canada", "Mexico", "Chile", "New York", "Washington"],
  "Asia-Pacific": ["Japan", "Singapore", "Thailand", "India", "China", "Australia", "New Zealand", "Philippines", "Indonesia", "Bangladesh", "Tokyo", "Bangkok", "Seoul", "Beijing", "Mumbai"],
  Europe: ["France", "Germany", "UK", "Switzerland", "Italy", "Netherlands", "Norway", "Belgium", "Sweden", "Spain", "Austria", "Denmark", "Finland", "Portugal", "Paris", "Berlin", "London", "Geneva", "Rome", "Brussels", "Oslo", "Stockholm", "Barcelona", "Copenhagen", "Rotterdam", "Vienna", "Bonn", "Zurich"],
  "Middle East": ["UAE", "Saudi Arabia", "Qatar", "Jordan", "Lebanon", "Turkey", "Abu Dhabi", "Riyadh", "Dubai", "Istanbul", "Amman"],
  Online: ["Online"],
};

function deriveRegion(location: string | null): string {
  if (!location) return "Other";
  const loc = location.toLowerCase();
  if (loc.includes("online")) return "Online";
  for (const [region, keywords] of Object.entries(REGIONS)) {
    if (keywords.some(k => loc.includes(k.toLowerCase()))) return region;
  }
  return "Other";
}

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  if (!end) return fmt(start);
  const s = new Date(start);
  const e = new Date(end);
  if (s.getUTCFullYear() === e.getUTCFullYear() && s.getUTCMonth() === e.getUTCMonth()) {
    return `${s.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${s.getUTCDate()}–${e.getUTCDate()}, ${s.getUTCFullYear()}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

function getCountdown(event: EventRow): { label: string; urgent: boolean } | null {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  let target: Date | null = null;
  let prefix = "";
  if (event.registration_deadline) {
    target = new Date(event.registration_deadline);
    prefix = "Closes";
  } else {
    const start = new Date(event.start_date);
    if (start <= thirtyDays) { target = start; prefix = "Starts"; }
  }
  if (!target) return null;
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return null;
  if (diffDays === 0) return { label: `${prefix} today`, urgent: true };
  if (diffDays === 1) return { label: `${prefix} tomorrow`, urgent: true };
  return { label: `${prefix} in ${diffDays} days`, urgent: diffDays <= 3 };
}

const ALL_REGIONS = ["Africa", "Americas", "Asia-Pacific", "Europe", "Middle East", "Online", "Other"];

export default function EventsClient({ events, initialSearch = "" }: { events: EventRow[]; initialSearch?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [sdgFilter, setSdgFilter] = useState<number | null>(null);
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      setUserId(session.user.id);
      supabase.from("saved_events").select("event_id").eq("user_id", session.user.id)
        .then(({ data }) => { if (data) setSavedIds(new Set(data.map(s => s.event_id))); });
    });
  }, []);

  const activeSearch = search.trim();

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (!matchesSearch(e, search)) return false;
      if (sdgFilter !== null && !e.sdg_goals.includes(sdgFilter)) return false;
      if (formatFilter !== null && e.format !== formatFilter) return false;
      if (typeFilter !== null && e.event_type !== typeFilter) return false;
      if (regionFilter !== null && deriveRegion(e.location) !== regionFilter) return false;
      return true;
    });
  }, [events, search, sdgFilter, formatFilter, typeFilter, regionFilter]);

  const hasFilters =
    activeSearch.length >= 2 ||
    sdgFilter !== null ||
    formatFilter !== null ||
    typeFilter !== null ||
    regionFilter !== null;

  function clearAll() {
    setSearch("");
    setSdgFilter(null);
    setFormatFilter(null);
    setTypeFilter(null);
    setRegionFilter(null);
  }

  const countLabel = activeSearch.length >= 2
    ? `${filtered.length} event${filtered.length !== 1 ? "s" : ""} found for "${activeSearch}"`
    : `${filtered.length} event${filtered.length !== 1 ? "s" : ""}`;

  return (
    <div>
      {/* Filters bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-3 items-center">
          <Filter size={16} className="text-gray-400 shrink-0" />

          {/* Search */}
          <div className="flex items-center border border-gray-200 rounded-lg px-2.5 py-1.5 gap-1.5 focus-within:ring-2 focus-within:ring-[#4ea8de]">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events…"
              className="text-sm text-gray-700 focus:outline-none w-44"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {/* SDG */}
          <select
            value={sdgFilter ?? ""}
            onChange={e => setSdgFilter(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
          >
            <option value="">All SDGs</option>
            {Array.from({ length: 17 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>SDG {n} — {SDG_META[n].label}</option>
            ))}
          </select>

          {/* Format */}
          <select
            value={formatFilter ?? ""}
            onChange={e => setFormatFilter(e.target.value || null)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
          >
            <option value="">All Formats</option>
            {Object.entries(FORMAT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Type */}
          <select
            value={typeFilter ?? ""}
            onChange={e => setTypeFilter(e.target.value || null)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
          >
            <option value="">All Types</option>
            {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Region */}
          <select
            value={regionFilter ?? ""}
            onChange={e => setRegionFilter(e.target.value || null)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]"
          >
            <option value="">All Regions</option>
            {ALL_REGIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors ml-auto"
            >
              <X size={14} /> Clear all
            </button>
          )}

          <span className="text-sm text-gray-400 ml-auto">{countLabel}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Calendar size={48} className="text-gray-300 mb-4" />
            {activeSearch.length >= 2 ? (
              <>
                <p className="text-gray-500 text-lg font-medium">
                  No events found for &ldquo;{activeSearch}&rdquo;.
                </p>
                <p className="text-gray-400 text-sm mt-2 max-w-sm">
                  Try broader search terms like health, climate, education, or water.
                </p>
              </>
            ) : (
              <p className="text-gray-500 text-lg font-medium">No events match your filters.</p>
            )}
            <button onClick={clearAll} className="mt-4 text-[#4ea8de] text-sm hover:underline">
              Clear {activeSearch.length >= 2 ? "search" : "filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(event => {
              const primarySdg = event.sdg_goals?.[0];
              const sdg = primarySdg ? SDG_META[primarySdg] : null;
              const countdown = getCountdown(event);
              return (
                <div
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4 group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {sdg && (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sdg.color}`}>
                          <Tag size={11} />
                          SDG {primarySdg}
                        </span>
                      )}
                      {countdown && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${countdown.urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {countdown.label}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{FORMAT_LABELS[event.format]}</span>
                  </div>

                  <h3 className="text-[#0f2a4a] font-semibold text-base leading-snug group-hover:text-[#4ea8de] transition-colors">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2">{event.description}</p>
                  )}

                  <div className="flex flex-col gap-2 mt-auto text-sm text-gray-500">
                    <span className="flex items-center gap-2">
                      <Calendar size={14} className="shrink-0 text-gray-400" />
                      {formatDateRange(event.start_date, event.end_date)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-2">
                        <MapPin size={14} className="shrink-0 text-gray-400" />
                        {event.location}
                      </span>
                    )}
                    {event.organization && (
                      <span className="flex items-center gap-2">
                        <Building2 size={14} className="shrink-0 text-gray-400" />
                        {event.organization}
                      </span>
                    )}
                  </div>

                  {event.registration_url && (
                    <a
                      href={event.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-xs font-medium text-[#4ea8de] hover:text-[#3a95cc] transition-colors"
                      onClick={ev => ev.stopPropagation()}
                    >
                      Register →
                    </a>
                  )}

                  {/* Action toolbar */}
                  <div className="flex items-center justify-end gap-0.5 pt-2 border-t border-gray-100">
                    <BookmarkButton
                      eventId={event.id}
                      initialSaved={savedIds.has(event.id)}
                      userId={userId}
                      onToggle={(s) => setSavedIds(prev => {
                        const n = new Set(prev);
                        if (s) { n.add(event.id); } else { n.delete(event.id); }
                        return n;
                      })}
                    />
                    <CalendarExportMenu
                      title={event.title}
                      startDate={event.start_date}
                      endDate={event.end_date}
                      location={event.location}
                      description={event.description}
                      registrationUrl={event.registration_url}
                    />
                    <ShareMenu eventId={event.id} eventTitle={event.title} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
