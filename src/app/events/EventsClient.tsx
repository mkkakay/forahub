"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  MapPin, Calendar, Building2, Tag, Filter, X, Search, Clock, CalendarDays, List, Sparkles, Star, Check,
  Heart, Wheat, HeartPulse, GraduationCap, Users, Droplets, Zap, TrendingUp, Settings, Scale,
  Recycle, CloudSun, Fish, Trees, Shield, Handshake, type LucideIcon,
} from "lucide-react";
import { getEventAssets } from "@/lib/assets/eventAssetService";
import type { Database } from "@/lib/supabase/types";
import { matchesSearch } from "@/lib/search";
import { supabase } from "@/lib/supabase/client";
import { EVENT_CATEGORIES, getCategory, isCategoryKey, type CategoryKey } from "@/lib/categories";
import { useSubscription } from "@/context/SubscriptionContext";
import BookmarkButton from "@/components/BookmarkButton";
import CalendarExportMenu from "@/components/CalendarExportMenu";
import ShareMenu from "@/components/ShareMenu";
import CalendarSection from "@/components/calendar/CalendarSection";
import { formatDateRange } from "@/lib/date";

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

const SDG_NAMES: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

const SDG_ICONS: Record<number, LucideIcon> = {
  1: Heart, 2: Wheat, 3: HeartPulse, 4: GraduationCap, 5: Users,
  6: Droplets, 7: Zap, 8: TrendingUp, 9: Settings, 10: Scale,
  11: Building2, 12: Recycle, 13: CloudSun, 14: Fish, 15: Trees,
  16: Shield, 17: Handshake,
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

type QuickFilter = "free" | "online";

// Page size for the cursor-based "Load more" button. Matches the SSR
// caps in src/app/events/page.tsx so each click pulls one screenful.
const LOAD_MORE_PAGE_SIZE = 100;

export default function EventsClient({
  events: initialEvents,
  initialSearch = "",
  today,
  featured = [],
  nearby = [],
  nearbyCountryName = null,
  orgLogos = {},
  initialUpcomingLoaded = 0,
  initialPastLoaded = 0,
  upcomingHasMore: initialUpcomingHasMore = false,
  pastHasMore: initialPastHasMore = false,
  windowStartIso,
  windowEndIso,
}: {
  events: EventRow[];
  initialSearch?: string;
  today: string;
  featured?: EventRow[];
  nearby?: EventRow[];
  nearbyCountryName?: string | null;
  orgLogos?: Record<string, string>;
  // Pagination wiring — see src/app/events/page.tsx for where these flow
  // in. The client knows it can ask for more rows whenever
  // upcomingHasMore / pastHasMore is true, and the offset to ask from.
  initialUpcomingLoaded?: number;
  initialPastLoaded?: number;
  upcomingHasMore?: boolean;
  pastHasMore?: boolean;
  windowStartIso?: string;
  windowEndIso?: string;
}) {
  // Local mutable state so "Load more" can append without re-routing.
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [upcomingLoaded, setUpcomingLoaded] = useState(initialUpcomingLoaded);
  const [pastLoaded, setPastLoaded] = useState(initialPastLoaded);
  const [upcomingHasMore, setUpcomingHasMore] = useState(initialUpcomingHasMore);
  const [pastHasMore, setPastHasMore] = useState(initialPastHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userId: ctxUserId } = useSubscription();

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
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | null>(null);
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

  // Cursor-based "Load more". We page upcoming and past independently so
  // each tab pulls only the data it actually shows. New rows are merged
  // into the events array; the existing filter/search/sort logic above
  // recomputes automatically.
  async function loadMore(kind: "upcoming" | "past") {
    if (loadingMore) return;
    if (kind === "upcoming" && !upcomingHasMore) return;
    if (kind === "past" && !pastHasMore) return;
    setLoadingMore(true);
    const from = kind === "upcoming" ? upcomingLoaded : pastLoaded;
    const to = from + LOAD_MORE_PAGE_SIZE - 1;
    const q = supabase.from("events").select("*");
    const ranged = kind === "upcoming"
      ? q.gte("start_date", today)
         .lte("start_date", windowEndIso ?? "2030-12-31T23:59:59.999Z")
         .order("start_date", { ascending: true })
         .range(from, to)
      : q.gte("start_date", windowStartIso ?? today)
         .lt("start_date", today)
         .order("start_date", { ascending: false })
         .range(from, to);
    const { data } = await ranged;
    const rows = (data as EventRow[] | null) ?? [];
    if (rows.length > 0) {
      // Dedup by id in case range overlaps with a recently-inserted row.
      setEvents(prev => {
        const seen = new Set(prev.map(e => e.id));
        const incoming = rows.filter(r => !seen.has(r.id));
        return [...prev, ...incoming];
      });
    }
    if (kind === "upcoming") {
      setUpcomingLoaded(prev => prev + rows.length);
      setUpcomingHasMore(rows.length === LOAD_MORE_PAGE_SIZE);
    } else {
      setPastLoaded(prev => prev + rows.length);
      setPastHasMore(rows.length === LOAD_MORE_PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  // Which "Load more" button is relevant given the current view/time.
  // Calendar view is server-windowed already; no button there.
  const loadMoreKind: "upcoming" | "past" | null = (() => {
    if (viewMode === "calendar") return null;
    if (timeView === "past") return pastHasMore ? "past" : null;
    // upcoming + all both end with the upcoming tail
    return upcomingHasMore ? "upcoming" : null;
  })();

  const upcomingEvents = useMemo(() => events.filter(e => e.start_date >= today), [events, today]);
  const pastEvents = useMemo(() => events.filter(e => e.start_date < today), [events, today]);

  const baseEvents = useMemo(() => {
    if (viewMode === "calendar") {
      const calendarSet = [...upcomingEvents, ...pastEvents];
      // Flagship-only by default; ?all=1 unlocks the full set.
      return showAll ? calendarSet : calendarSet.filter(e => e.event_tier === "flagship");
    }
    if (timeView === "upcoming") return upcomingEvents;
    if (timeView === "past") return [...pastEvents].reverse(); // most recent first
    // all: upcoming ascending then past descending
    return [...upcomingEvents, ...pastEvents.slice().reverse()];
  }, [viewMode, showAll, timeView, upcomingEvents, pastEvents]);

  const activeSearch = search.trim();

  const filtered = useMemo(() => {
    return baseEvents.filter(e => {
      if (!matchesSearch(e, search)) return false;
      if (sdgFilter !== null && !e.sdg_goals.includes(sdgFilter)) return false;
      if (formatFilter !== null && e.format !== formatFilter) return false;
      if (typeFilter !== null && e.event_type !== typeFilter) return false;
      if (regionFilter !== null && deriveRegion(e.location) !== regionFilter) return false;
      if (categoryFilter !== null) {
        // NULL-category events stay visible during the backfill period — once
        // bulk classification finishes there won't be any. After that this
        // branch becomes a no-op.
        const primary = e.category;
        const secondary = e.category_secondary ?? [];
        const matches =
          primary === null ||
          primary === categoryFilter ||
          secondary.includes(categoryFilter);
        if (!matches) return false;
      }
      if (quickFilters.has("free") && e.cost_type !== "free") return false;
      if (quickFilters.has("online") && e.format !== "virtual") return false;
      return true;
    });
  }, [baseEvents, search, sdgFilter, formatFilter, typeFilter, regionFilter, categoryFilter, quickFilters]);

  const hasFilters =
    activeSearch.length >= 2 ||
    sdgFilter !== null ||
    formatFilter !== null ||
    typeFilter !== null ||
    regionFilter !== null ||
    categoryFilter !== null ||
    quickFilters.size > 0;

  function clearAll() {
    setSearch("");
    setSdgFilter(null);
    setFormatFilter(null);
    setTypeFilter(null);
    setRegionFilter(null);
    setCategoryFilter(null);
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
    const endOfThisYear = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    const groups: { id: string; label: string; events: EventRow[] }[] = [
      { id: "this-week", label: "This week", events: [] },
      { id: "this-month", label: "This month", events: [] },
      { id: "next-3-months", label: "Next 3 months", events: [] },
      { id: "this-year", label: "This year", events: [] },
      { id: "later", label: "Later", events: [] },
    ];
    for (const e of filtered) {
      const s = new Date(e.start_date);
      if (s < now) continue;
      if (s <= d7) groups[0].events.push(e);
      else if (s <= d30) groups[1].events.push(e);
      else if (s <= d90) groups[2].events.push(e);
      else if (s <= endOfThisYear) groups[3].events.push(e);
      else groups[4].events.push(e);
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
  ];

  const TIME_PILL_LABELS: Record<string, string> = {
    "this-week": "Week",
    "this-month": "Month",
    "next-3-months": "3 Months",
    "this-year": "This Year",
    "later": "Later",
  };

  const [flashSectionId, setFlashSectionId] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function jumpToBucket(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashSectionId(id);
    flashTimerRef.current = setTimeout(() => setFlashSectionId(null), 1000);
  }

  function renderStandardCard(event: EventRow) {
    const isPast = event.start_date < today;
    const primarySdg = event.sdg_goals?.[0];
    const sdg = primarySdg ? SDG_META[primarySdg] : null;
    const countdown = isPast ? null : getCountdown(event, today);
    const logoUrl = event.organization ? orgLogos[event.organization] ?? null : null;
    const assets = getEventAssets({
      banner_image_url: event.banner_image_url,
      organization: event.organization,
      sdg_goals: event.sdg_goals,
      org_logo_url: logoUrl,
    });
    const SdgIcon = primarySdg ? SDG_ICONS[primarySdg] : null;
    const sdgName = primarySdg ? SDG_NAMES[primarySdg] : null;
    return (
      <div
        key={event.id}
        onClick={() => router.push(`/events/${event.id}`)}
        className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col group cursor-pointer overflow-hidden ${isPast ? "border-gray-100 dark:border-slate-800 opacity-80" : "border-gray-200 dark:border-slate-700"}`}
      >
        {/* Cover */}
        <div
          className="relative h-40 md:h-44 shrink-0 overflow-hidden flex items-center justify-center"
          style={!assets.banner_image_url ? { background: assets.banner_gradient } : undefined}
        >
          {assets.banner_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assets.banner_image_url}
              alt=""
              aria-hidden="true"
              className={
                event.banner_display_mode === "contain"
                  ? "w-full h-full object-contain object-center bg-white dark:bg-slate-800"
                  : "w-full h-full object-cover object-center"
              }
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-4">
              {SdgIcon && <SdgIcon className="w-12 h-12 text-white/40" strokeWidth={1.5} />}
              {primarySdg && sdgName && (
                <span className="mt-1.5 text-white/60 text-[11px] uppercase tracking-wider font-semibold drop-shadow line-clamp-1 max-w-full">
                  SDG {primarySdg} · {sdgName}
                </span>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/0 pointer-events-none" />
          {logoUrl && event.organization && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={event.organization}
                className="w-8 h-8 rounded-md bg-white dark:bg-slate-800 border border-white/40 object-contain p-1 shadow-sm"
                loading="lazy"
              />
              <span className="text-white text-xs font-semibold truncate max-w-[140px] drop-shadow-sm">
                {event.organization}
              </span>
            </div>
          )}
          {primarySdg && (
            <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white">
              SDG {primarySdg}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3.5 flex-1">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {isPast && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                  <Clock size={10} /> Past
                </span>
              )}
              {(() => {
                const cat = getCategory(event.category);
                if (!cat) return null;
                const Icon = cat.icon;
                return (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: cat.color }}
                    title={cat.description}
                  >
                    <Icon size={11} />
                    {cat.label}
                  </span>
                );
              })()}
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
            <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{FORMAT_LABELS[event.format]}</span>
          </div>
          <h3 className="text-[#0f2a4a] dark:text-slate-100 font-semibold text-base leading-snug group-hover:text-[#4ea8de] transition-colors">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">{event.description}</p>
          )}
          <div className="flex flex-col gap-2 mt-auto text-sm text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Calendar size={14} className="shrink-0 text-gray-400 dark:text-slate-500" />
              {formatDateRange(event.start_date, event.end_date)}
            </span>
            {event.location && (
              <span className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0 text-gray-400 dark:text-slate-500" />
                {event.location}
              </span>
            )}
            {event.organization && (
              <span className="flex items-center gap-2">
                <Building2 size={14} className="shrink-0 text-gray-400 dark:text-slate-500" />
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
          <div className="flex items-center justify-end gap-0.5 pt-2 border-t border-gray-100 dark:border-slate-800">
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
      </div>
    );
  }

  function renderFeaturedCard(event: EventRow) {
    const primarySdg = event.sdg_goals?.[0];
    const sdg = primarySdg ? SDG_META[primarySdg] : null;
    const speakers = (event.speakers ?? []).filter(Boolean).slice(0, 2).join(" · ");
    const logoUrl = event.organization ? orgLogos[event.organization] ?? null : null;
    const assets = getEventAssets({
      banner_image_url: event.banner_image_url,
      organization: event.organization,
      sdg_goals: event.sdg_goals,
      org_logo_url: logoUrl,
    });
    const SdgIcon = primarySdg ? SDG_ICONS[primarySdg] : null;
    const sdgName = primarySdg ? SDG_NAMES[primarySdg] : null;
    return (
      <div
        key={event.id}
        onClick={() => router.push(`/events/${event.id}`)}
        className="shrink-0 w-[340px] md:w-[380px] snap-start bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer group"
      >
        <div
          className="relative h-52 overflow-hidden flex items-center justify-center"
          style={!assets.banner_image_url ? { background: assets.banner_gradient } : undefined}
        >
          {assets.banner_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assets.banner_image_url}
              alt=""
              aria-hidden="true"
              className={
                event.banner_display_mode === "contain"
                  ? "w-full h-full object-contain object-center bg-white dark:bg-slate-800"
                  : "w-full h-full object-cover"
              }
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-4">
              {SdgIcon && <SdgIcon className="w-16 h-16 text-white/40" strokeWidth={1.5} />}
              {primarySdg && sdgName && (
                <span className="mt-2 text-white/60 text-xs uppercase tracking-wider font-semibold drop-shadow line-clamp-1 max-w-full">
                  SDG {primarySdg} · {sdgName}
                </span>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/0 pointer-events-none" />
          {logoUrl && event.organization && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={event.organization}
                className="w-8 h-8 rounded-md bg-white dark:bg-slate-800 border border-white/40 object-contain p-1 shadow-sm"
                loading="lazy"
              />
              <span className="text-white text-xs font-semibold truncate max-w-[160px] drop-shadow-sm">
                {event.organization}
              </span>
            </div>
          )}
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-md">
            <Star className="w-3 h-3 fill-amber-950" /> Featured
          </span>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const cat = getCategory(event.category);
              if (!cat) return null;
              const Icon = cat.icon;
              return (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: cat.color }}
                  title={cat.description}
                >
                  <Icon size={9} />
                  {cat.label}
                </span>
              );
            })()}
            {sdg && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sdg.color}`}>
                SDG {primarySdg}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
              {FORMAT_LABELS[event.format]}
            </span>
          </div>
          <h3 className="text-[#0f2a4a] dark:text-slate-100 font-bold text-lg leading-snug line-clamp-2 group-hover:text-[#4ea8de] transition-colors">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed line-clamp-2">{event.description}</p>
          )}
          <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="text-gray-400 dark:text-slate-500" />
              {formatDateRange(event.start_date, event.end_date)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-gray-400 dark:text-slate-500" />
                {event.location}
              </span>
            )}
            {speakers && (
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
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
      {/* Filter zone — cohesive 3-row panel.
          Row 1: primary actions (search + time scope + view mode)
          Row 2: content filters (4 dropdowns + 2 toggles + clear-all)
          Row 3: jump-to-bucket nav + result count */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 md:p-4 space-y-3">

            {/* ── Row 1 — Primary actions ──────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              {/* Search */}
              <div className="flex-1 min-w-0 flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-11 px-3 gap-2 focus-within:ring-2 focus-within:ring-[#4ea8de] focus-within:border-[#4ea8de] transition-colors">
                <Search size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search events, organizations, topics…"
                  className="flex-1 min-w-0 text-base md:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0" aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Time scope toggle — list mode only */}
                {viewMode === "list" && (
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-11 p-1">
                    {TIME_VIEW_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTimeView(opt.value)}
                        aria-pressed={timeView === opt.value}
                        className={`text-sm font-medium px-3.5 h-full rounded-md transition-colors ${
                          timeView === opt.value
                            ? "bg-[#0f2a4a] text-white"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* View mode: List / Calendar */}
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-11 p-1">
                  <button
                    onClick={() => setViewMode("list")}
                    aria-pressed={viewMode === "list"}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 h-full rounded-md transition-colors ${
                      viewMode === "list" ? "bg-[#0f2a4a] text-white" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <List size={14} /> List
                  </button>
                  <button
                    onClick={() => setViewMode("calendar")}
                    aria-pressed={viewMode === "calendar"}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 h-full rounded-md transition-colors ${
                      viewMode === "calendar" ? "bg-[#0f2a4a] text-white" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <CalendarDays size={14} /> Calendar
                  </button>
                </div>
              </div>
            </div>

            {/* ── Row 2 — Content filters ──────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-slate-400 dark:text-slate-500 shrink-0 hidden md:block" />

              {/* Category — humanitarian / development / nexus / policy / research.
                  Leads the row to signal ForaHub serves the whole humanitarian-
                  development field, not just SDG-2030 framing. */}
              <select
                value={categoryFilter ?? ""}
                onChange={e => setCategoryFilter(isCategoryKey(e.target.value) ? e.target.value : null)}
                className={`text-sm h-9 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4ea8de] transition-colors border ${
                  categoryFilter !== null ? "bg-blue-50/50" : "border-slate-200 dark:border-slate-700"
                }`}
                style={categoryFilter !== null ? { borderColor: getCategory(categoryFilter)?.color ?? "#4ea8de" } : undefined}
              >
                <option value="">Category: All</option>
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>

              {/* SDG */}
              <select
                value={sdgFilter ?? ""}
                onChange={e => setSdgFilter(e.target.value ? Number(e.target.value) : null)}
                className={`text-sm h-9 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4ea8de] transition-colors border ${
                  sdgFilter !== null ? "border-[#4ea8de] bg-blue-50/50" : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <option value="">SDG: All</option>
                {Array.from({ length: 17 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>SDG {n} — {SDG_META[n].label}</option>
                ))}
              </select>

              {/* Format */}
              <select
                value={formatFilter ?? ""}
                onChange={e => setFormatFilter(e.target.value || null)}
                className={`text-sm h-9 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4ea8de] transition-colors border ${
                  formatFilter !== null ? "border-[#4ea8de] bg-blue-50/50" : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <option value="">Format: All</option>
                {Object.entries(FORMAT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {/* Type */}
              <select
                value={typeFilter ?? ""}
                onChange={e => setTypeFilter(e.target.value || null)}
                className={`text-sm h-9 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4ea8de] transition-colors border ${
                  typeFilter !== null ? "border-[#4ea8de] bg-blue-50/50" : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <option value="">Type: All</option>
                {Object.entries(EVENT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {/* Region */}
              <select
                value={regionFilter ?? ""}
                onChange={e => setRegionFilter(e.target.value || null)}
                className={`text-sm h-9 px-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4ea8de] transition-colors border ${
                  regionFilter !== null ? "border-[#4ea8de] bg-blue-50/50" : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <option value="">Region: All</option>
                {ALL_REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {/* Toggle checkboxes — Free / Online */}
              {QUICK_FILTER_OPTIONS.map(q => {
                const active = quickFilters.has(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => toggleQuick(q.id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 text-sm font-medium h-9 px-3 rounded-lg border transition-colors ${
                      active
                        ? "bg-[#4ea8de]/10 border-[#4ea8de] text-[#0f2a4a] dark:text-slate-100"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                      active ? "bg-[#4ea8de] border-[#4ea8de]" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    }`}>
                      {active && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    {q.label}
                  </button>
                );
              })}

              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="ml-auto inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <X size={14} /> Clear all filters
                </button>
              )}
            </div>

            {/* ── Row 3 — Jump-to-bucket nav + count ───────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
              {showSectionedView && buckets.some(b => b.events.length > 0) ? (
                <>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:dark:text-slate-500 uppercase tracking-wide mr-1">Jump to:</span>
                  <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap overflow-x-auto md:overflow-visible">
                    {buckets
                      .filter(b => b.events.length > 0)
                      .map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => jumpToBucket(b.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium h-8 px-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors shrink-0"
                        >
                          <Calendar className="w-3 h-3" />
                          {TIME_PILL_LABELS[b.id] ?? b.label}
                        </button>
                      ))}
                  </div>
                </>
              ) : (
                <span />
              )}
              <span className="text-sm text-slate-500 dark:text-slate-400 dark:dark:text-slate-500 ml-auto">{countLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured strip (Upcoming only) */}
      {showFeaturedStrip && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-[#0f2a4a] dark:text-slate-100 inline-flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-300" />
                Featured
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:dark:text-slate-500">Curated upcoming events</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
            {featuredActive.map(renderFeaturedCard)}
          </div>
        </div>
      )}

      {/* Events near you (Upcoming only) */}
      {showNearbyStrip && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 mt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="mt-8 mb-4">
            <h2 className="text-xl font-semibold text-[#0f2a4a] dark:text-slate-100 inline-flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              {nearbyCountryName ? `Events in ${nearbyCountryName}` : "Events near you"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:dark:text-slate-500 mt-0.5">
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
            <Calendar size={48} className="text-gray-300 dark:text-slate-600 mb-4" />
            {activeSearch.length >= 2 ? (
              <>
                <p className="text-gray-500 dark:text-slate-400 text-lg font-medium">
                  No events found for &ldquo;{activeSearch}&rdquo;.
                </p>
                <p className="text-gray-400 dark:text-slate-500 text-sm mt-2 max-w-sm">
                  Try broader search terms like health, climate, education, or water.
                </p>
              </>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-lg font-medium">No events match your filters.</p>
            )}
            <button onClick={clearAll} className="mt-4 text-[#4ea8de] text-sm hover:underline">
              Clear {activeSearch.length >= 2 ? "search" : "filters"}
            </button>
          </div>
        ) : showSectionedView ? (
          <div className="space-y-2">
            {buckets.every(b => b.events.length === 0) ? (
              <p className="text-gray-500 dark:text-slate-400 text-sm">No upcoming events match the current filters.</p>
            ) : (
              buckets.map((bucket, idx) => {
                if (bucket.events.length === 0) return null;
                const preview = bucket.events.slice(0, 6);
                const hasMore = bucket.events.length > preview.length;
                const isFlashing = flashSectionId === bucket.id;
                return (
                  <section
                    key={bucket.id}
                    id={bucket.id}
                    className={`scroll-mt-24 ${idx === 0 ? "" : "border-t border-slate-200 dark:border-slate-700 mt-12 pt-8"}`}
                  >
                    <div className="flex items-baseline justify-between mb-4">
                      <h2
                        className={`text-xl font-semibold text-[#0f2a4a] dark:text-slate-100 rounded-md transition-colors duration-700 ${
                          isFlashing ? "bg-blue-50 px-2 -mx-2" : ""
                        }`}
                      >
                        {bucket.label}{" "}
                        <span className="text-sm font-normal text-slate-500 dark:text-slate-400 dark:dark:text-slate-500">
                          · {bucket.events.length} event{bucket.events.length === 1 ? "" : "s"}
                        </span>
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {preview.map(renderStandardCard)}
                    </div>
                    {hasMore && (
                      <p className="mt-4 text-right">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:dark:text-slate-500">
                          {bucket.events.length - preview.length} more in this bucket — refine filters to narrow down
                        </span>
                      </p>
                    )}
                  </section>
                );
              })
            )}
            {loadMoreKind && (
              <div className="flex justify-center pt-8">
                <button
                  onClick={() => loadMore(loadMoreKind)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[#0f2a4a] dark:text-slate-100 hover:border-[#4ea8de] hover:text-[#3a95cc] disabled:opacity-60 transition-colors"
                >
                  {loadingMore ? "Loading…" : `Load more ${loadMoreKind === "past" ? "past " : ""}events`}
                </button>
              </div>
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
                  className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3.5 group cursor-pointer ${isPast ? "border-gray-100 dark:border-slate-800 opacity-80" : "border-gray-200 dark:border-slate-700"}`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPast && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                          <Clock size={10} /> Past
                        </span>
                      )}
                      {(() => {
                        const cat = getCategory(event.category);
                        if (!cat) return null;
                        const Icon = cat.icon;
                        return (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                            style={{ backgroundColor: cat.color }}
                            title={cat.description}
                          >
                            <Icon size={11} />
                            {cat.label}
                          </span>
                        );
                      })()}
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
                    <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{FORMAT_LABELS[event.format]}</span>
                  </div>

                  <h3 className="text-[#0f2a4a] dark:text-slate-100 font-semibold text-base leading-snug group-hover:text-[#4ea8de] transition-colors">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">{event.description}</p>
                  )}

                  <div className="flex flex-col gap-2 mt-auto text-sm text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-2">
                      <Calendar size={14} className="shrink-0 text-gray-400 dark:text-slate-500" />
                      {formatDateRange(event.start_date, event.end_date)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-2">
                        <MapPin size={14} className="shrink-0 text-gray-400 dark:text-slate-500" />
                        {event.location}
                      </span>
                    )}
                    {event.organization && (
                      <span className="flex items-center gap-2">
                        <Building2 size={14} className="shrink-0 text-gray-400 dark:text-slate-500" />
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
                  <div className="flex items-center justify-end gap-0.5 pt-2 border-t border-gray-100 dark:border-slate-800">
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
            {loadMoreKind && (
              <div className="sm:col-span-2 lg:col-span-3 flex justify-center pt-4">
                <button
                  onClick={() => loadMore(loadMoreKind)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[#0f2a4a] dark:text-slate-100 hover:border-[#4ea8de] hover:text-[#3a95cc] disabled:opacity-60 transition-colors"
                >
                  {loadingMore ? "Loading…" : `Load more ${loadMoreKind === "past" ? "past " : ""}events`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
