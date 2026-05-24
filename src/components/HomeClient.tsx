"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Calendar, Flag, MapPin, ArrowRight, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { FEATURED_CALENDARS as DEFAULT_FEATURED_CALENDARS } from "@/lib/organizations";

// Subset of ResolvedOrg the homepage actually uses — defined here so HomeClient
// stays a clean client component (no server-only imports).
export interface FeaturedOrg {
  slug: string;
  name: string;
  short: string;
  description: string;
  color: string;
  needs_dark_background: boolean;
  logo_url: string | null;
  logo_display_mode?: "contain" | "cover";
}

export interface HomeRegion {
  slug: string;
  name: string;
  banner_image_url: string | null;
}
import { getEventAssets } from "@/lib/assets/eventAssetService";
import { SDG_COLORS } from "@/lib/assets/sdgFallbacks";

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};



// Region tiles are admin-managed via the regions DB table; the homepage
// receives the active list as a prop from page.tsx (see HomeRegion below).

// Provides cached Brandfetch logo URLs to EventCard. page.tsx populates this server-side.
const OrgLogosContext = createContext<Record<string, string>>({});

export interface EventPreview {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  organization: string | null;
  sdg_goals: number[];
  is_featured: boolean;
  format: string | null;
  region: string | null;
  banner_image_url?: string | null;
  banner_display_mode?: "contain" | "cover" | null;
  cost_type?: "free" | "paid" | "sliding_scale" | "donor_funded" | null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const startTime = performance.now();
          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
            else setCount(target);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function OrgLogo({
  logoUrl,
  initial,
  color,
  alt,
}: {
  logoUrl: string | null;
  initial: string;
  color: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={alt}
        className="w-10 h-10 rounded-md bg-white border border-gray-200 object-contain p-1 shrink-0"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}

function FeaturedOrgCard({ org }: { org: FeaturedOrg }) {
  const { lang } = useLanguage();
  const orgLogos = useContext(OrgLogosContext);
  // Override > prop logo_url > batch-cache context
  const logoUrl = org.logo_url ?? orgLogos[org.name] ?? null;
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = logoUrl && !logoFailed;

  // Tinted brand background by default; full-color when needs_dark_background
  // (for orgs whose logos are light/white and would disappear on a faint tint).
  const headerBg = org.needs_dark_background ? org.color : `${org.color}14`;
  const fallbackTextColor = org.needs_dark_background ? "#ffffff" : org.color;

  return (
    <Link
      href={`/organizations/${org.slug}`}
      className="shrink-0 w-52 snap-start bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-[#334155] shadow-sm hover:shadow-lg transition-all duration-200 group overflow-hidden flex flex-col"
    >
      {/* Tinted brand-color logo tile (or full color when dark mode is on);
          full-bleed photo fill when display_mode = "cover". */}
      <div
        className={`h-32 border-b border-gray-100 dark:border-[#334155] overflow-hidden ${
          org.logo_display_mode === "cover" ? "" : "flex items-center justify-center p-6"
        }`}
        style={{ backgroundColor: headerBg }}
      >
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={org.short}
            className={
              org.logo_display_mode === "cover"
                ? "w-full h-full object-cover"
                : "max-h-12 max-w-40 object-contain mx-auto"
            }
            loading="lazy"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-lg font-bold text-center leading-tight" style={{ color: fallbackTextColor }}>
            {org.short}
          </span>
        )}
      </div>
      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-sm font-bold text-[#0f2a4a] dark:text-white group-hover:text-[#4ea8de] transition-colors">{org.short}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 flex-1">{org.name}</p>
        <span className="mt-3 block w-full py-2 rounded-lg text-sm font-semibold text-center border border-[#4ea8de]/40 text-[#4ea8de] group-hover:bg-[#4ea8de] group-hover:text-white transition-colors">
          {t(lang, "calendar.follow")}
        </span>
      </div>
    </Link>
  );
}

function SdgCard({ sdg, count }: { sdg: number; count: number }) {
  const [bgFailed, setBgFailed] = useState(false);
  const num = String(sdg).padStart(2, "0");
  return (
    <Link href={`/events?sdg=${sdg}`}>
      <div className="relative overflow-hidden rounded-2xl cursor-pointer group h-48 w-full">
        {/* Background photo */}
        {!bgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/images/sdg-bg/sdg-${num}.jpg`}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={() => setBgFailed(true)}
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: SDG_COLORS[sdg] }} />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
        {/* Event count badge */}
        {count > 0 && (
          <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {count} event{count !== 1 ? "s" : ""}
          </span>
        )}
        {/* SDG icon badge */}
        <div className="absolute bottom-3 left-3 w-14 h-14 rounded-xl overflow-hidden shadow-xl border-2 border-white/30 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/images/sdg/sdg-${num}.jpg`}
            alt={`SDG ${sdg}`}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Goal name */}
        <span className="absolute bottom-3 left-20 text-white text-sm font-bold leading-tight max-w-28 drop-shadow-lg">
          {SDG_LABELS[sdg]}
        </span>
      </div>
    </Link>
  );
}

export function EventCard({ event }: { event: EventPreview }) {
  const sdg = event.sdg_goals?.[0];
  const orgInitial = event.organization?.trim()[0]?.toUpperCase() ?? "E";
  const orgLogos = useContext(OrgLogosContext);
  const logoUrl = event.organization ? orgLogos[event.organization] ?? null : null;
  const assets = getEventAssets({
    banner_image_url: event.banner_image_url,
    organization: event.organization,
    sdg_goals: event.sdg_goals,
    org_logo_url: logoUrl,
  });
  const color = assets.org_brand_color;
  const formatLabel =
    event.format === "in_person" ? "In-Person" :
    event.format === "virtual" ? "Virtual" :
    event.format === "hybrid" ? "Hybrid" : "";
  const formatColor =
    event.format === "in_person" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
    event.format === "virtual" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";

  const [coverFailed, setCoverFailed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState(false);

  async function submitReport() {
    if (!reportType) return;
    await supabase.from("reports").insert({
      event_id: event.id,
      report_type: reportType,
      notes: notes.trim() || null,
    });
    setReportOpen(false);
    setReportType("");
    setNotes("");
    setToast(true);
    setTimeout(() => setToast(false), 4000);
  }

  return (
    <div className="relative group/card">
      <Link
        href={`/events/${event.id}`}
        className="block bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden min-h-[260px] flex flex-col"
      >
        {/* Cover: real image when available, SDG gradient when not — never a broken state */}
        <div
          className="h-[100px] relative shrink-0 overflow-hidden flex flex-col items-center justify-center"
          style={(!assets.banner_image_url || coverFailed) ? { background: assets.banner_gradient } : undefined}
        >
          {assets.banner_image_url && !coverFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={assets.banner_image_url}
              alt=""
              aria-hidden="true"
              className={
                event.banner_display_mode === "contain"
                  ? "w-full h-full object-contain object-center bg-white"
                  : "w-full h-full object-cover object-center"
              }
              loading="lazy"
              onError={() => setCoverFailed(true)}
            />
          )}
          {(!assets.banner_image_url || coverFailed) && (
            <>
              <span className="text-white font-extrabold leading-none select-none drop-shadow-md" style={{ fontSize: 48 }}>
                {orgInitial}
              </span>
              {event.organization && (
                <span className="text-white/90 text-xs mt-1 font-medium px-4 text-center line-clamp-1 max-w-full drop-shadow">
                  {event.organization}
                </span>
              )}
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10 pointer-events-none" />
          {/* Org logo (Brandfetch) or initial fallback */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <OrgLogo
              logoUrl={logoUrl}
              initial={orgInitial}
              color={color}
              alt={event.organization ?? ""}
            />
            {event.organization && (
              <span className="text-white text-xs font-semibold truncate max-w-[130px] drop-shadow-sm">
                {event.organization}
              </span>
            )}
          </div>
          {sdg && (
            <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white">
              SDG {sdg}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {formatLabel && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${formatColor}`}>
                {formatLabel}
              </span>
            )}
            {event.cost_type && event.cost_type !== "free" && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 inline-flex items-center gap-0.5">
                $
                <span>
                  {event.cost_type === "paid" ? "Paid" : event.cost_type === "sliding_scale" ? "Sliding scale" : "Donor-funded"}
                </span>
              </span>
            )}
          </div>
          <h3 className="text-[#0f2a4a] dark:text-white font-semibold text-base leading-snug group-hover:text-[#4ea8de] transition-colors line-clamp-2">
            {event.title}
          </h3>
          <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-auto">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="shrink-0 text-[#4ea8de]" />
              {formatDate(event.start_date)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="shrink-0 text-[#4ea8de]" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Report flag button */}
      <button
        onClick={() => setReportOpen(true)}
        aria-label="Report this event"
        className="absolute bottom-3 right-3 p-1.5 rounded-full text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover/card:opacity-100"
      >
        <Flag size={14} />
      </button>

      {/* Report modal */}
      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-[#0f2a4a] dark:text-white mb-4">Report this event</h3>
            <div className="space-y-2 mb-4">
              {["Wrong date", "Wrong location", "Event cancelled", "Duplicate event", "Other"].map(option => (
                <label key={option} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`report-${event.id}`}
                    value={option}
                    checked={reportType === option}
                    onChange={() => setReportType(option)}
                    className="accent-[#4ea8de]"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full px-3 py-2 mb-4 text-sm border border-gray-200 dark:border-[#334155] rounded-xl bg-gray-50 dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4ea8de] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-[#334155] text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-[#334155] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportType}
                className="flex-1 py-2 rounded-xl bg-[#4ea8de] hover:bg-[#3a95cc] disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-3 left-3 right-3 z-10 bg-[#0f2a4a] text-white text-xs font-medium px-3 py-2 rounded-xl text-center shadow-lg pointer-events-none">
          Thank you. We will review this event.
        </div>
      )}
    </div>
  );
}

export default function HomeClient({
  events,
  pastEvents,
  totalCount,
  orgLogos = {},
  featuredCalendars,
  regions = [],
}: {
  events: EventPreview[];
  pastEvents: EventPreview[];
  totalCount: number;
  orgLogos?: Record<string, string>;
  featuredCalendars?: FeaturedOrg[];
  regions?: HomeRegion[];
}) {
  const { lang } = useLanguage();
  const [sdgCounts, setSdgCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    async function fetchSdgCounts() {
      const counts: Record<number, number> = {};
      await Promise.all(
        Array.from({ length: 17 }, (_, i) => i + 1).map(async sdg => {
          const { count } = await supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .contains("sdg_goals", [sdg]);
          counts[sdg] = count ?? 0;
        })
      );
      setSdgCounts(counts);
    }
    fetchSdgCounts();
  }, []);

  return (
    <OrgLogosContext.Provider value={orgLogos}>
    <main className="flex-1">
      {/* Upcoming Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-0 border-t border-gray-100 dark:border-[#334155]">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t(lang, "events.upcoming")}</h2>
          <Link href="/events" className="text-[#4ea8de] hover:text-[#3a95cc] text-sm font-medium flex items-center gap-1 transition-colors">
            {t(lang, "events.viewall")} <ArrowRight size={14} />
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Calendar size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 text-lg font-medium">Events coming soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-0 border-t border-gray-100 dark:border-[#334155]">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Past Events</h2>
            <Link href="/events?filter=past" className="text-[#4ea8de] hover:text-[#3a95cc] text-sm font-medium flex items-center gap-1 transition-colors">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pastEvents.map(event => <EventCard key={event.id} event={event} />)}
          </div>
        </section>
      )}

      {/* Featured Calendars */}
      <section className="bg-gray-50 dark:bg-[#0f172a] pt-3 pb-0 border-t border-gray-100 dark:border-[#334155]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t(lang, "calendar.featured")}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t(lang, "calendar.subtitle")}</p>
            </div>
            <Link href="/events" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1 font-medium shrink-0 ml-4">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-0 no-scrollbar snap-x snap-mandatory pl-0.5">
            {(featuredCalendars && featuredCalendars.length > 0
              ? featuredCalendars
              : DEFAULT_FEATURED_CALENDARS.map(o => ({
                  slug: o.slug,
                  name: o.name,
                  short: o.short,
                  description: o.description,
                  color: o.color,
                  needs_dark_background: false,
                  logo_url: null,
                }))
            ).map(org => (
              <FeaturedOrgCard key={org.slug} org={org} />
            ))}
          </div>
        </div>
      </section>

      {/* Browse by SDG */}
      <section className="bg-gray-50 dark:bg-[#0f172a] pt-3 pb-3 border-t border-gray-100 dark:border-[#334155]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Browse by SDG Category</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Explore events aligned with the UN 2030 Agenda</p>
            </div>
            <Link href="/events" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1 font-medium shrink-0 ml-4 mt-1">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 17 }, (_, i) => i + 1).map(sdg => (
              <SdgCard key={sdg} sdg={sdg} count={sdgCounts[sdg] ?? 0} />
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <Link
              href="/events"
              className="border border-gray-300 dark:border-[#334155] text-gray-600 dark:text-gray-300 px-6 py-2 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-[#1e293b] transition-colors"
            >
              View All 17 SDG Goals
            </Link>
          </div>
        </div>
      </section>

      {/* Explore by Region */}
      {regions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t(lang, "region.explore")}</h2>
            <Link href="/events" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1 font-medium">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {regions.map(region => (
              <Link
                key={region.slug}
                href={`/events?region=${encodeURIComponent(region.name)}`}
                className="relative rounded-2xl overflow-hidden h-44 md:h-56 group cursor-pointer"
                style={!region.banner_image_url ? { background: "linear-gradient(135deg, #0f2a4a 0%, #4ea8de 100%)" } : undefined}
              >
                {region.banner_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={region.banner_image_url}
                    alt={region.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white font-bold text-xl drop-shadow-lg">{region.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="bg-white dark:bg-[#1e293b] border-t border-gray-100 border-b border-gray-200 dark:border-[#334155]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3 tracking-tight">
            ForaHub by the numbers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: Math.max(totalCount, 1000), suffix: "+", label: t(lang, "home.stats.events"), accent: "#4ea8de" },
              { value: 50, suffix: "+", label: t(lang, "home.stats.countries"), accent: "#4C9F38" },
              { value: 17, suffix: "", label: t(lang, "home.stats.sdg"), accent: "#FCC30B" },
              { value: 1000, suffix: "+", label: t(lang, "home.stats.orgs"), accent: "#FF3A21" },
            ].map(({ value, suffix, label, accent }) => (
              <div key={label} className="flex flex-col items-center">
                <div className="text-4xl font-extrabold text-[#0f2a4a] dark:text-white tracking-tight">
                  <CountUp target={value} suffix={suffix} />
                </div>
                <div className="w-10 h-1 rounded-full mt-2 mb-2" style={{ backgroundColor: accent }} />
                <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
    </OrgLogosContext.Provider>
  );
}
