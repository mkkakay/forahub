"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MapPin, Calendar, Building2, Tag, Filter, X, Search, Clock, CalendarDays, List, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import type { Database } from "@/lib/supabase/types";
import { matchesSearch } from "@/lib/search";
import { supabase } from "@/lib/supabase/client";
import { useSubscription } from "@/context/SubscriptionContext";
import BookmarkButton from "@/components/BookmarkButton";
import CalendarExportMenu from "@/components/CalendarExportMenu";
import ShareMenu from "@/components/ShareMenu";
import CalendarSection from "@/components/calendar/CalendarSection";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type TimeView = "upcoming" | "past" | "all";

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

function getCountdown(event: EventRow, today: string): { label: string; urgent: boolean } | null {
  const now = new Date(today);
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

type QuickFilter = "free" | "online" | "thisWeek" | "featured";

export default function EventsClient({
  events,
  initialSearch = "",
  today,
  featured = [],
  nearby = [],
  nearbyCountryName = null,
}: {
  events: EventRow[];
  initialSearch?: string;
  today: string;
  featured?: EventRow[];
  nearby?: EventRow[];
  nearbyCountryName?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasFullAccess, userId: ctxUserId } = useSubscription();

  const viewMode: "list" | "calendar" = searchParams.get("view") === "calendar" ? "calendar" : "list";
  const showAll: boolean = searchParams.get("all") === "1";

  // Local-time construction so getFullYear()/getMonth() return the natural values
  // for the YYYY-MM-DD param regardless of viewer timezone.
  const initialDate = useMemo(() => {
    const dateParam = searchParams.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date();
  }, [searchParams]);

  function setViewMode(mode: "list" | "calendar") {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "list") params.delete("view");
    else params.set("view", "calendar");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function setShowAll(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("all", "1");
    else params.delete("all");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const [search, setSearch] = useState(initialSearch);
  const [sdgFilter, setSdgFilter] = useState<number | null>(null);
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [timeView, setTimeView] = useState<TimeView>("upcoming");
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  function toggleQuick(q: QuickFilter) {
    setQuickFilters(prev => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  }

  useEffect(() => {
    if (!ctxUserId) return;
    setUserId(ctxUserId);
    supabase.from("saved_events").select("event_id").eq("user_id", ctxUserId)
      .then(({ data }) => { if (data) setSavedIds(new Set(data.map(s => s.event_id))); });
  }, [ctxUserId]);

  // Free-tier cutoff: 30 days from now (applies to upcoming only; past events are always visible)
  const freeCutoff = useMemo(() => new Date(new Date(today).getTime() + 30 * 24 * 60 * 60 * 1000), [today]);

  const upcomingEvents = useMemo(() => events.filter(e => e.start_date >= today), [events, today]);
  const pastEvents = useMemo(() => events.filter(e => e.start_date < today), [events, today]);

  const visibleUpcoming = useMemo(() => {
    if (hasFullAccess) return upcomingEvents;
    return upcomingEvents.filter(e => new Date(e.start_date) <= freeCutoff);
  }, [upcomingEvents, hasFullAccess, freeCutoff]);

  // Past events are always fully visible (no paywall on historical records)
  const baseEvents = useMemo(() => {
    if (viewMode === "calendar") {
      // Calendar shows everything the user is allowed to see regardless of timeView.
      // Free users still see only their 30-day upcoming window; past events are always visible.
      const allowedUpcoming = hasFullAccess ? upcomingEvents : visibleUpcoming;
      const calendarSet = [...allowedUpcoming, ...pastEvents];
      // Flagship-only by default; ?all=1 unlocks the full set.
      return showAll ? calendarSet : calendarSet.filter(e => e.event_tier === "flagship");
    }
    if (timeView === "upcoming") return visibleUpcoming;
    if (timeView === "past") return [...pastEvents].reverse(); // most recent first
    // all: upcoming ascending then past descending
    return [...upcomingEvents, ...pastEvents.slice().reverse()];
  }, [viewMode, showAll, timeView, visibleUpcoming, upcomingEvents, pastEvents, hasFullAccess]);

  const activeSearch = search.trim();

  const oneWeekOut = useMemo(() => new Date(new Date(today).getTime() + 7 * 24 * 60 * 60 * 1000), [today]);

  const filtered = useMemo(() => {
    return baseEvents.filter(e => {
      if (!matchesSearch(e, search)) return false;
      if (sdgFilter !== null && !e.sdg_goals.includes(sdgFilter)) return false;
      if (formatFilter !== null && e.format !== formatFilter) return false;
      if (typeFilter !== null && e.event_type !== typeFilter) return false;
      if (regionFilter !== null && deriveRegion(e.location) !== regionFilter) return false;
      if (quickFilters.has("free") && e.cost_type !== "free") return false;
      if (quickFilters.has("online") && e.format !== "virtual") return false;
      if (quickFilters.has("thisWeek")) {
        const startDate = new Date(e.start_date);
        if (startDate < new Date(today) || startDate > oneWeekOut) return false;
      }
      if (quickFilters.has("featured") && !e.is_featured) return false;
      return true;
    });
  }, [baseEvents, search, sdgFilter, formatFilter, typeFilter, regionFilter, quickFilters, today, oneWeekOut]);

  // Show upgrade nudge when upcoming search/filters match events beyond the free window
  const hasBeyondFree = useMemo(() => {
    if (hasFullAccess || filtered.length > 0 || timeView !== "upcoming") return false;
    return upcomingEvents
      .filter(e => new Date(e.start_date) > freeCutoff)
      .some(e => {
        if (!matchesSearch(e, search)) return false;
        if (sdgFilter !== null && !e.sdg_goals.includes(sdgFilter)) return false;
        if (formatFilter !== null && e.format !== formatFilter) return false;
        if (typeFilter !== null && e.event_type !== typeFilter) return false;
        if (regionFilter !== null && deriveRegion(e.location) !== regionFilter) return false;
        return true;
      });
  }, [upcomingEvents, filtered.length, hasFullAccess, freeCutoff, search, sdgFilter, formatFilter, typeFilter, regionFilter, timeView]);

  const hasFilters =
    activeSearch.length >= 2 ||
    sdgFilter !== null ||
    formatFilter !== null ||
    typeFilter !== null ||
    regionFilter !== null ||
    quickFilters.size > 0;

  function clearAll() {
    setSearch("");
    setSdgFilter(null);
    setFormatFilter(null);
    setTypeFilter(null);
    setRegionFilter(null);
    setQuickFilters(new Set());
  }

  const countLabel = (() => {
    const base = `${filtered.length} event${filtered.length !== 1 ? "s" : ""}`;
    if (activeSearch.length >= 2) return `${base} for "${activeSearch}"`;
    return base;
  })();

  const TIME_VIEW_OPTIONS: { value: TimeView; label: string }[] = [
    { value: "upcoming", label: "Upcoming" },
    { value: "past", label: "Past" },
    { value: "all", label: "All" },
  ];

  // Action-oriented time buckets — only used when viewing Upcoming in list mode.
  const buckets = useMemo(() => {
    const now = new Date(today);
    const d7 = new Date(now.getTime() + 7 * 86400000);
    const d30 = new Date(now.getTime() + 30 * 86400000);
    const d90 = new Date(now.getTime() + 90 * 86400000);
    const groups: { id: string; label: string; events: EventRow[] }[] = [
      { id: "this-week", label: "This week", events: [] },
      { id: "this-month", label: "This month", events: [] },
      { id: "next-3-months", label: "Next 3 months", events: [] },
      { id: "later", label: "Later", events: [] },
    ];
    for (const e of filtered) {
      const s = new Date(e.start_date);
      if (s < now) continue;
      if (s <= d7) groups[0].events.push(e);
      else if (s <= d30) groups[1].events.push(e);
      else if (s <= d90) groups[2].events.push(e);
      else groups[3].events.push(e);
    }
    return groups;
  }, [filtered, today]);

  const showSectionedView = viewMode === "list" && timeView === "upcoming";

  // Featured strip is shown when we have at least 3 featured events whose start
  // date is still in the future. This stays out of the bucket sections.
  const featuredActive = useMemo(() => {
    const nowDate = new Date(today);
    return featured.filter(e => new Date(e.start_date) >= nowDate).slice(0, 5);
  }, [featured, today]);
  const showFeaturedStrip = showSectionedView && featuredActive.length >= 3;
  const showNearbyStrip = showSectionedView && nearby.length > 0;

  const QUICK_FILTER_OPTIONS: { id: QuickFilter; label: string }[] = [
    { id: "free", label: "Free" },
    { id: "online", label: "Online" },
    { id: "thisWeek", label: "This week" },
    { id: "featured", label: "Featured" },
  ];

  function renderStandardCard(event: EventRow) {
    const isPast = event.start_date < today;
    const primarySdg = event.sdg_goals?.[0];
    const sdg = primarySdg ? SDG_META[primarySdg] : null;
    const countdown = isPast ? null : getCountdown(event, today);
    return (
      <div
        key={event.id}
        onClick={() => router.push(`/events/${event.id}`)}
        className={`bg-white rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3.5 group cursor-pointer ${isPast ? "border-gray-100 opacity-80" : "border-gray-200"}`}
      >
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {isPast && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                <Clock size={10} /> Past
              </span>
            )}
            {sdg && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sdg.color}`}>
                <Tag size={11} />
                SDG {primarySdg}
              </span>
            )}
            {countdown && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${countdown.urgent ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
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
        {event.registration_url && !isPast && (
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
          <ShareMenu eventId={event.id} eventTitle={event.title} startDate={event.start_date} location={event.location} />
        </div>
      </div>
    );
  }

  function renderFeaturedCard(event: EventRow) {
    const primarySdg = event.sdg_goals?.[0];
    const sdg = primarySdg ? SDG_META[primarySdg] : null;
    const speakers = (event.speakers ?? []).filter(Boolean).slice(0, 2).join(" · ");
    return (
      <div
        key={event.id}
        onClick={() => router.push(`/events/${event.id}`)}
        className="shrink-0 w-[340px] md:w-[380px] snap-start bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer group"
      >
        <div className="relative h-44 bg-gradient-to-br from-blue-700 to-blue-900 overflow-hidden">
          {event.banner_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.banner_image_url}
              alt=""
              aria-hidden="true"
              className={
                event.banner_display_mode === "contain"
                  ? "w-full h-full object-contain object-center bg-white"
                  : "w-full h-full object-cover"
              }
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="w-12 h-12 text-white/30" />
            </div>
          )}
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-md">
            <Star className="w-3 h-3 fill-amber-950" /> Featured
          </span>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {sdg && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sdg.color}`}>
                SDG {primarySdg}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              {FORMAT_LABELS[event.format]}
            </span>
          </div>
          <h3 className="text-[#0f2a4a] font-bold text-lg leading-snug line-clamp-2 group-hover:text-[#4ea8de] transition-colors">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{event.description}</p>
          )}
          <div className="flex flex-col gap-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="text-gray-400" />
              {formatDateRange(event.start_date, event.end_date)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-gray-400" />
                {event.location}
              </span>
            )}
            {speakers && (
              <span className="flex items-center gap-1.5 text-gray-600">
                <Sparkles size={12} className="text-purple-500" />
                {speakers}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-3 items-center">
          <Filter size={16} className="text-gray-400 shrink-0" />

          {/* Time view toggle — list mode only (calendar navigates by month) */}
          {viewMode === "list" && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {TIME_VIEW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTimeView(opt.value)}
                  className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                    timeView === opt.value
                      ? "bg-white text-[#0f2a4a] shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* View mode toggle: List / Calendar */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-white text-[#0f2a4a] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              aria-pressed={viewMode === "calendar"}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                viewMode === "calendar"
                  ? "bg-white text-[#0f2a4a] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <CalendarDays size={14} /> Calendar
            </button>
          </div>

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

      {/* Quick filter pills */}
      {viewMode === "list" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTER_OPTIONS.map(q => {
              const active = quickFilters.has(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleQuick(q.id)}
                  className={`text-sm font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
            {quickFilters.size > 0 && (
              <button
                type="button"
                onClick={() => setQuickFilters(new Set())}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5"
              >
                <X size={12} /> Clear quick filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Featured strip (Upcoming only) */}
      {showFeaturedStrip && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-[#0f2a4a] inline-flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-300" />
                Featured
              </h2>
              <p className="text-sm text-slate-500">Curated upcoming events</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
            {featuredActive.map(renderFeaturedCard)}
          </div>
        </div>
      )}

      {/* Events near you (Upcoming only) */}
      {showNearbyStrip && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 mt-2 border-t border-slate-200">
          <div className="mt-8 mb-4">
            <h2 className="text-xl font-semibold text-[#0f2a4a] inline-flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              {nearbyCountryName ? `Events in ${nearbyCountryName}` : "Events near you"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {nearby.length} upcoming event{nearby.length === 1 ? "" : "s"} near you
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {nearby.slice(0, 6).map(renderStandardCard)}
          </div>
        </section>
      )}

      {/* Grid / Calendar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {viewMode === "calendar" ? (
          <>
            <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-md px-4 py-2.5 text-sm">
              <span className="text-blue-900 font-medium">
                {showAll ? "Showing all events" : "Showing flagship events only"}
              </span>
              {showAll ? (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="text-blue-700 hover:text-blue-900 font-semibold transition-colors"
                >
                  ← Back to flagship only
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-blue-700 hover:text-blue-900 font-semibold transition-colors"
                >
                  Show all events →
                </button>
              )}
            </div>
            <CalendarSection
              key={searchParams.get("date") ?? "today"}
              events={filtered}
              initialYear={initialDate.getFullYear()}
              initialMonth={initialDate.getMonth()}
            />
          </>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Calendar size={48} className="text-gray-300 mb-4" />
            {hasBeyondFree ? (
              <>
                <p className="text-gray-600 text-lg font-medium mb-2">
                  Looking for events further ahead?
                </p>
                <p className="text-gray-400 text-sm max-w-sm mb-6">
                  Pro unlocks the full calendar to 2030 for $9.99/year, cancel anytime.
                </p>
                <Link
                  href="/pricing"
                  className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
                >
                  See Pro plans →
                </Link>
              </>
            ) : activeSearch.length >= 2 ? (
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
            {!hasBeyondFree && (
              <button onClick={clearAll} className="mt-4 text-[#4ea8de] text-sm hover:underline">
                Clear {activeSearch.length >= 2 ? "search" : "filters"}
              </button>
            )}
          </div>
        ) : showSectionedView ? (
          <div className="space-y-2">
            {buckets.every(b => b.events.length === 0) ? (
              <p className="text-gray-500 text-sm">No upcoming events match the current filters.</p>
            ) : (
              buckets.map((bucket, idx) => {
                if (bucket.events.length === 0) return null;
                const preview = bucket.events.slice(0, 6);
                const hasMore = bucket.events.length > preview.length;
                return (
                  <section
                    key={bucket.id}
                    className={`${idx === 0 ? "" : "border-t border-slate-200 mt-12 pt-8"}`}
                  >
                    <div className="flex items-baseline justify-between mb-4">
                      <h2 className="text-xl font-semibold text-[#0f2a4a]">
                        {bucket.label}{" "}
                        <span className="text-sm font-normal text-slate-500">
                          · {bucket.events.length} event{bucket.events.length === 1 ? "" : "s"}
                        </span>
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {preview.map(renderStandardCard)}
                    </div>
                    {hasMore && (
                      <p className="mt-4 text-right">
                        <span className="text-sm font-medium text-slate-500">
                          {bucket.events.length - preview.length} more in this bucket — refine filters to narrow down
                        </span>
                      </p>
                    )}
                  </section>
                );
              })
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(event => {
              const isPast = event.start_date < today;
              const primarySdg = event.sdg_goals?.[0];
              const sdg = primarySdg ? SDG_META[primarySdg] : null;
              const countdown = isPast ? null : getCountdown(event, today);
              return (
                <div
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  className={`bg-white rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3.5 group cursor-pointer ${isPast ? "border-gray-100 opacity-80" : "border-gray-200"}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPast && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                          <Clock size={10} /> Past
                        </span>
                      )}
                      {sdg && (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sdg.color}`}>
                          <Tag size={11} />
                          SDG {primarySdg}
                        </span>
                      )}
                      {countdown && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${countdown.urgent ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
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

                  {event.registration_url && !isPast && (
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
                    <ShareMenu eventId={event.id} eventTitle={event.title} startDate={event.start_date} location={event.location} />
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
