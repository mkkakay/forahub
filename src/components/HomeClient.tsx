"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Calendar, Flag, MapPin, Flame, ArrowRight, ChevronRight, Globe, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

const SDG_ICONS: Record<number, string> = {
  1:  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Sustainable_Development_Goal_1.png/200px-Sustainable_Development_Goal_1.png",
  2:  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sustainable_Development_Goal_2.png/200px-Sustainable_Development_Goal_2.png",
  3:  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Sustainable_Development_Goal_3.png/200px-Sustainable_Development_Goal_3.png",
  4:  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Sustainable_Development_Goal_4.png/200px-Sustainable_Development_Goal_4.png",
  5:  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Sustainable_Development_Goal_5.png/200px-Sustainable_Development_Goal_5.png",
  6:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Sustainable_Development_Goal_6.png/200px-Sustainable_Development_Goal_6.png",
  7:  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Sustainable_Development_Goal_7.png/200px-Sustainable_Development_Goal_7.png",
  8:  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Sustainable_Development_Goal_8.png/200px-Sustainable_Development_Goal_8.png",
  9:  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Sustainable_Development_Goal_9.png/200px-Sustainable_Development_Goal_9.png",
  10: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Sustainable_Development_Goal_10.png/200px-Sustainable_Development_Goal_10.png",
  11: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Sustainable_Development_Goal_11.png/200px-Sustainable_Development_Goal_11.png",
  12: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Sustainable_Development_Goal_12.png/200px-Sustainable_Development_Goal_12.png",
  13: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sustainable_Development_Goal_13.png/200px-Sustainable_Development_Goal_13.png",
  14: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sustainable_Development_Goal_14.png/200px-Sustainable_Development_Goal_14.png",
  15: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Sustainable_Development_Goal_15.png/200px-Sustainable_Development_Goal_15.png",
  16: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Sustainable_Development_Goal_16.png/200px-Sustainable_Development_Goal_16.png",
  17: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Sustainable_Development_Goal_17.png/200px-Sustainable_Development_Goal_17.png",
};

const ORG_DOMAINS: Record<string, string> = {
  "WHO": "who.int", "World Health Organization": "who.int",
  "UNICEF": "unicef.org",
  "World Bank": "worldbank.org",
  "UN Women": "unwomen.org",
  "WFP": "wfp.org", "World Food Programme": "wfp.org",
  "UNAIDS": "unaids.org",
  "UNEP": "unep.org",
  "UNDP": "undp.org",
  "UNESCO": "unesco.org",
  "UNHCR": "unhcr.org",
  "FAO": "fao.org",
  "ILO": "ilo.org",
  "UNFCCC": "unfccc.int",
  "UN DESA": "un.org",
  "UNDESA": "un.org",
  "African Union": "au.int",
  "ECOWAS": "ecowas.int",
  "ASEAN": "asean.org",
  "Gates Foundation": "gatesfoundation.org",
  "Oxfam": "oxfam.org",
  "CARE": "care.org",
  "World Vision": "worldvision.org",
};

const REGIONS = [
  { name: "Africa", query: "Africa", photo: "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=600&q=80", cities: ["Nairobi", "Addis Ababa", "Accra"], events: 180 },
  { name: "Asia Pacific", query: "Asia", photo: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80", cities: ["Singapore", "Bangkok", "Tokyo"], events: 220 },
  { name: "Middle East", query: "Middle East", photo: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&q=80", cities: ["Dubai", "Amman", "Istanbul"], events: 95 },
  { name: "Americas", query: "Americas", photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80", cities: ["New York", "Washington", "Brasília"], events: 310 },
  { name: "Europe", query: "Europe", photo: "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=600&q=80", cities: ["Geneva", "Brussels", "Berlin"], events: 280 },
  { name: "Pacific Islands", query: "Pacific", photo: "https://images.unsplash.com/photo-1559628233-100c798642d8?w=600&q=80", cities: ["Fiji", "Samoa", "Tonga"], events: 40 },
];

const FEATURED_ORGS = [
  { name: "WHO", full: "World Health Organization", color: "#1a5c2a", events: 48 },
  { name: "UNICEF", full: "UNICEF", color: "#0075c9", events: 36 },
  { name: "World Bank", full: "World Bank Group", color: "#8b1a1a", events: 62 },
  { name: "UN Women", full: "UN Women", color: "#c0392b", events: 28 },
  { name: "WFP", full: "World Food Programme", color: "#e67e00", events: 22 },
  { name: "UNAIDS", full: "UNAIDS", color: "#7b2d8b", events: 19 },
  { name: "UNEP", full: "UN Environment", color: "#2d6a4f", events: 31 },
  { name: "UNDP", full: "UNDP", color: "#0d2137", events: 44 },
];

const ACTIVITY_FEED = [
  "A researcher from Kenya just saved World Health Summit 2027",
  "A policy officer from Nigeria bookmarked WHA 79th Session",
  "A programme manager from Bangladesh set an alert for SDG 3 events",
  "A health economist from South Africa found 12 events in Geneva",
  "A student from India discovered travel grants for COP31",
];

function getOrgDomain(org: string | null): string | null {
  if (!org) return null;
  if (ORG_DOMAINS[org]) return ORG_DOMAINS[org];
  for (const [key, domain] of Object.entries(ORG_DOMAINS)) {
    if (org.toLowerCase().includes(key.toLowerCase())) return domain;
  }
  return null;
}

function getEventCoverImage(org: string | null, sdgGoals: number[]): string {
  const o = (org ?? "").toLowerCase();
  const sdg = sdgGoals?.[0];
  if (o.includes("who") || o.includes("world health"))
    return "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80";
  if (o.includes("unicef"))
    return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&q=80";
  if (o.includes("world bank"))
    return "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&q=80";
  if (o.includes("fao") || o.includes("wfp") || o.includes("food"))
    return "https://images.unsplash.com/photo-1536304993881-ff86e0c9b5b?w=400&q=80";
  if (o.includes("unesco") || o.includes("education") || sdg === 4)
    return "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&q=80";
  if (sdg === 13 || o.includes("climate") || o.includes("cop") || o.includes("unfccc") || o.includes("environment"))
    return "https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=400&q=80";
  if (sdg === 3 || o.includes("health"))
    return "https://images.unsplash.com/photo-1584982751601-97ddc0082f3b?w=400&q=80";
  if (sdg === 8 || o.includes("finance") || o.includes("imf") || o.includes("bank"))
    return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80";
  if (sdg === 9 || o.includes("tech") || o.includes("digital") || o.includes("itu"))
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80";
  if (o.includes("africa") || o.includes("ecowas") || o.includes("sadc") || o.includes("au "))
    return "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=400&q=80";
  if (o.includes("asia") || o.includes("asean") || o.includes("adb"))
    return "https://images.unsplash.com/photo-1535139262971-ab8d1723fab6?w=400&q=80";
  return "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80";
}

interface EventPreview {
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
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
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

function OrgFavicon({ domain, initial, color }: { domain: string; initial: string; color: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      width={24}
      height={24}
      className="rounded-md shrink-0 bg-white"
      onError={() => setFailed(true)}
    />
  );
}

function EventCard({ event }: { event: EventPreview }) {
  const sdg = event.sdg_goals?.[0];
  const color = sdg ? SDG_COLORS[sdg] : "#3b82f6";
  const orgInitial = event.organization?.trim()[0]?.toUpperCase() ?? "E";
  const domain = getOrgDomain(event.organization);
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
        {/* Cover area with contextual image */}
        <div
          className="h-[100px] relative shrink-0 overflow-hidden flex flex-col items-center justify-center"
          style={coverFailed ? { background: `linear-gradient(135deg, ${color}, ${color}bb)` } : undefined}
        >
          {!coverFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getEventCoverImage(event.organization, event.sdg_goals)}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover object-center"
              loading="lazy"
              onError={() => setCoverFailed(true)}
            />
          )}
          {coverFailed && (
            <>
              <span className="text-white font-extrabold leading-none select-none" style={{ fontSize: 48 }}>
                {orgInitial}
              </span>
              {event.organization && (
                <span className="text-white/80 text-xs mt-1 font-medium px-4 text-center line-clamp-1 max-w-full">
                  {event.organization}
                </span>
              )}
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10 pointer-events-none" />
          {/* Org favicon or initial + name */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            {domain ? (
              <OrgFavicon domain={domain} initial={orgInitial} color={color} />
            ) : (
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: color }}
              >
                {orgInitial}
              </span>
            )}
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
          {formatLabel && (
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full self-start ${formatColor}`}>
              {formatLabel}
            </span>
          )}
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
  thisWeekEvents,
  totalCount,
}: {
  events: EventPreview[];
  thisWeekEvents: EventPreview[];
  totalCount: number;
}) {
  const { lang } = useLanguage();
  const [activityIdx, setActivityIdx] = useState(0);
  const [activityVisible, setActivityVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestWebsite, setSuggestWebsite] = useState("");
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setActivityVisible(false);
      timeoutRef.current = setTimeout(() => {
        setActivityIdx(i => (i + 1) % ACTIVITY_FEED.length);
        setActivityVisible(true);
      }, 400);
    }, 4000);
    return () => {
      clearInterval(id);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleSuggestSubmit() {
    if (!suggestName.trim()) return;
    setSuggestSubmitting(true);
    try {
      await fetch("/api/suggest-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: suggestName.trim(), website: suggestWebsite.trim() }),
      });
    } catch { /* silent */ }
    setSuggestSubmitting(false);
    setSuggestDone(true);
  }

  return (
    <main className="flex-1">
      {/* This Week */}
      {thisWeekEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t(lang, "events.thisweek")}</h2>
            </div>
            <Link href="/events?filter=thisweek" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1 font-medium">
              {t(lang, "events.viewall")} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar snap-x snap-mandatory pl-0.5">
            {thisWeekEvents.map(ev => {
              const sdg = ev.sdg_goals?.[0];
              const color = sdg ? SDG_COLORS[sdg] : "#3b82f6";
              return (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="shrink-0 w-80 snap-start bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group"
                >
                  {/* Cover strip */}
                  <div
                    className="h-[60px] flex items-center px-4 gap-3 relative"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
                  >
                    {ev.organization && (
                      <span className="text-white font-extrabold text-2xl opacity-90 shrink-0">
                        {ev.organization.trim()[0].toUpperCase()}
                      </span>
                    )}
                    {ev.organization && (
                      <span className="text-white/80 text-xs font-medium truncate flex-1">{ev.organization}</span>
                    )}
                    <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                      {formatShortDate(ev.start_date)}
                    </div>
                  </div>
                  <div className="p-4">
                    {sdg && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white mb-2 inline-block"
                        style={{ backgroundColor: color }}
                      >
                        SDG {sdg}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-[#0f2a4a] dark:text-white line-clamp-2 mt-1 group-hover:text-[#4ea8de] transition-colors">
                      {ev.title}
                    </p>
                    {ev.location && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                        <MapPin size={11} className="text-[#4ea8de] shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t(lang, "events.upcoming")}</h2>
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

      {/* Featured Calendars */}
      <section className="bg-gray-50 dark:bg-[#0f172a] py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t(lang, "calendar.featured")}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t(lang, "calendar.subtitle")}</p>
            </div>
            <Link href="/events" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1 font-medium shrink-0 ml-4">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar snap-x snap-mandatory pl-0.5">
            {FEATURED_ORGS.map(org => (
              <Link
                key={org.name}
                href={`/events?org=${encodeURIComponent(org.full)}`}
                className="shrink-0 w-52 snap-start bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] hover:shadow-lg transition-all duration-200 group overflow-hidden flex flex-col"
              >
                {/* Cover */}
                <div
                  className="relative h-28 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${org.color}, ${org.color}bb)` }}
                >
                  <span className="text-white font-extrabold select-none" style={{ fontSize: 56 }}>
                    {org.name[0]}
                  </span>
                  <span className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {org.events}
                  </span>
                </div>
                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-sm font-bold text-[#0f2a4a] dark:text-white group-hover:text-[#4ea8de] transition-colors">{org.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 flex-1">{org.full}</p>
                  <span className="mt-3 block w-full py-2 rounded-lg text-sm font-semibold text-center border border-[#4ea8de]/40 text-[#4ea8de] group-hover:bg-[#4ea8de] group-hover:text-white transition-colors">
                    {t(lang, "calendar.follow")}
                  </span>
                </div>
              </Link>
            ))}
            {/* Suggest organization CTA card */}
            <div className="shrink-0 w-52 snap-start rounded-2xl border-2 border-dashed border-gray-300 dark:border-[#334155] bg-white dark:bg-[#1e293b] flex flex-col items-center justify-center p-6 gap-2 text-center">
              <Globe size={28} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-snug">
                Can&apos;t find your organization?
              </p>
              <button
                onClick={() => setSuggestOpen(true)}
                className="text-xs text-blue-600 dark:text-blue-400 underline hover:text-blue-800 transition-colors"
              >
                Suggest one
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by SDG */}
      <section className="bg-gray-50 dark:bg-[#0f172a] py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t(lang, "sdg.browse")}</h2>
            <Link href="/events" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1 font-medium">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {Array.from({ length: 17 }, (_, i) => i + 1).map(sdg => (
              <Link
                key={sdg}
                href={`/events?sdg=${sdg}`}
                className="relative group rounded-xl overflow-hidden aspect-square hover:scale-105 hover:shadow-lg transition-all duration-200 shadow-sm"
                title={`SDG ${sdg}: ${SDG_LABELS[sdg]}`}
              >
                <Image
                  src={SDG_ICONS[sdg]}
                  alt={`SDG ${sdg}: ${SDG_LABELS[sdg]}`}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 17vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-colors duration-200 flex items-end justify-end p-1.5 opacity-0 group-hover:opacity-100">
                  <span className="text-white text-xs font-bold bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    Browse
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Explore by Region */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t(lang, "region.explore")}</h2>
          <Link href="/events" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1 font-medium">
            View All <ChevronRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {REGIONS.map(region => (
            <Link
              key={region.name}
              href={`/events?region=${encodeURIComponent(region.query)}`}
              className="relative rounded-2xl overflow-hidden h-44 md:h-56 group cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={region.photo}
                alt={region.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {region.events}+ events
              </div>
              <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ArrowRight size={14} className="text-white" />
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-bold text-xl mb-2">{region.name}</p>
                <div className="flex flex-wrap gap-1">
                  {region.cities.map(city => (
                    <span key={city} className="text-xs text-white/90 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-[#1e293b] border-t border-gray-100 border-b border-gray-200 dark:border-[#334155]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8 tracking-tight">
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

      {/* Submit CTA */}
      <section
        className="relative py-8 md:py-10 px-4 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f2a4a 0%, #1a3f6e 50%, #0f2a4a 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {([1, 3, 5, 7, 13, 16] as const).map((sdg, i) => (
            <div
              key={sdg}
              className="absolute rounded-full opacity-10"
              style={{
                backgroundColor: SDG_COLORS[sdg],
                width: 80 + i * 24,
                height: 80 + i * 24,
                top: `${8 + i * 14}%`,
                left: `${3 + i * 16}%`,
              }}
            />
          ))}
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">{t(lang, "home.submit.cta")}</h2>
          <p className="text-blue-200 text-base mb-2">{t(lang, "home.submit.sub")}</p>
          <p className="text-blue-300/70 text-sm mb-8">Join 1,000+ organizations already listed on ForaHub</p>
          <Link
            href="/events/create"
            className="inline-flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl text-base"
          >
            {t(lang, "home.submit.btn")} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Activity feed */}
      <div className="bg-gray-50 dark:bg-[#0f172a] border-t border-gray-200 dark:border-[#334155] py-3 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p
            className="text-sm text-gray-500 dark:text-gray-400 truncate transition-opacity duration-300"
            style={{ opacity: activityVisible ? 1 : 0 }}
          >
            🌍 {ACTIVITY_FEED[activityIdx]}
          </p>
        </div>
      </div>

      {/* Suggest organization modal */}
      {suggestOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setSuggestOpen(false); setSuggestDone(false); setSuggestName(""); setSuggestWebsite(""); }}
        >
          <div
            className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#0f2a4a] dark:text-white">Suggest an organization</h3>
              <button
                onClick={() => { setSuggestOpen(false); setSuggestDone(false); setSuggestName(""); setSuggestWebsite(""); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {suggestDone ? (
              <div className="text-center py-4">
                <p className="text-green-600 font-semibold text-sm">Thanks! We&apos;ll review your suggestion.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <input
                    type="text"
                    value={suggestName}
                    onChange={e => setSuggestName(e.target.value)}
                    placeholder="Organization name *"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#334155] rounded-xl bg-gray-50 dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4ea8de]"
                  />
                  <input
                    type="url"
                    value={suggestWebsite}
                    onChange={e => setSuggestWebsite(e.target.value)}
                    placeholder="Website (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#334155] rounded-xl bg-gray-50 dark:bg-[#0f172a] text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#4ea8de]"
                  />
                </div>
                <button
                  onClick={handleSuggestSubmit}
                  disabled={!suggestName.trim() || suggestSubmitting}
                  className="w-full py-2.5 rounded-xl bg-[#0f2a4a] hover:bg-[#1a3f6e] disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  {suggestSubmitting ? "Sending…" : "Submit suggestion"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
