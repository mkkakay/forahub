"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Calendar, MapPin, Building2, ChevronRight, Flame, ArrowRight } from "lucide-react";
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

const REGIONS = [
  { name: "Africa", query: "Africa", photo: "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=600&q=80", desc: "Nairobi · Addis Ababa · Accra" },
  { name: "Asia Pacific", query: "Asia", photo: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80", desc: "Singapore · Bangkok · Tokyo" },
  { name: "Middle East", query: "Middle East", photo: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&q=80", desc: "Dubai · Amman · Istanbul" },
  { name: "Americas", query: "Americas", photo: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80", desc: "New York · Washington · Brasília" },
  { name: "Europe", query: "Europe", photo: "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=600&q=80", desc: "Geneva · Brussels · Berlin" },
  { name: "Pacific Islands", query: "Pacific", photo: "https://images.unsplash.com/photo-1559628233-100c798642d8?w=600&q=80", desc: "Fiji · Samoa · Tonga" },
];

const FEATURED_ORGS = [
  { name: "WHO", full: "World Health Organization", sdg: 3, color: "#4C9F38" },
  { name: "UNICEF", full: "UNICEF", sdg: 4, color: "#C5192D" },
  { name: "World Bank", full: "World Bank Group", sdg: 1, color: "#E5243B" },
  { name: "UN Women", full: "UN Women", sdg: 5, color: "#FF3A21" },
  { name: "WFP", full: "World Food Programme", sdg: 2, color: "#DDA63A" },
  { name: "UNAIDS", full: "UNAIDS", sdg: 3, color: "#4C9F38" },
  { name: "UNEP", full: "UN Environment", sdg: 13, color: "#3F7E44" },
  { name: "UNDP", full: "UN Dev Programme", sdg: 17, color: "#19486A" },
];

const ACTIVITY_FEED = [
  "A researcher from Kenya just saved World Health Summit 2027",
  "A policy advisor from India just saved COP32 Side Events",
  "A public health official from Nigeria just viewed UNAIDS Conference 2026",
  "A programme officer from Ethiopia just saved SDG Finance Forum",
  "A consultant from Brazil just saved Climate Week NYC 2027",
];

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

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const duration = 1800;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
          start = Math.min(start + step, target);
          setCount(Math.floor(start));
          if (start >= target) clearInterval(timer);
        }, 16);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function EventCard({ event }: { event: EventPreview }) {
  const sdg = event.sdg_goals?.[0];
  const color = sdg ? SDG_COLORS[sdg] : "#3b82f6";
  const formatLabel = event.format === "in_person" ? "In-Person" : event.format === "virtual" ? "Virtual" : event.format === "hybrid" ? "Hybrid" : "";
  const formatColor = event.format === "in_person" ? "bg-green-100 text-green-800" : event.format === "virtual" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";

  return (
    <Link href={`/events/${event.id}`} className="block bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm hover:shadow-md transition-all group overflow-hidden">
      {/* Gradient header */}
      <div className="h-2" style={{ backgroundColor: color }} />
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          {sdg && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: color }}>
              SDG {sdg}
            </span>
          )}
          {formatLabel && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${formatColor}`}>
              {formatLabel}
            </span>
          )}
        </div>
        <h3 className="text-[#0f2a4a] dark:text-white font-semibold text-sm leading-snug group-hover:text-[#4ea8de] transition-colors line-clamp-2">
          {event.title}
        </h3>
        <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-auto">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="shrink-0" />
            {formatDate(event.start_date)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
          {event.organization && (
            <span className="flex items-center gap-1.5">
              <Building2 size={12} className="shrink-0" />
              <span className="truncate">{event.organization}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
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

  useEffect(() => {
    const id = setInterval(() => setActivityIdx(i => (i + 1) % ACTIVITY_FEED.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="flex-1">
      {/* Social proof counters */}
      <section className="bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-[#334155]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: Math.max(totalCount, 1000), suffix: "+", label: t(lang, "home.stats.events") },
              { value: 50, suffix: "+", label: t(lang, "home.stats.countries") },
              { value: 17, suffix: "", label: t(lang, "home.stats.sdg") },
              { value: 1000, suffix: "+", label: t(lang, "home.stats.orgs") },
            ].map(({ value, suffix, label }) => (
              <div key={label}>
                <div className="text-3xl font-extrabold text-[#0f2a4a] dark:text-white">
                  <CountUp target={value} suffix={suffix} />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* This week */}
      {thisWeekEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-orange-500" />
              <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-white">{t(lang, "events.thisweek")}</h2>
            </div>
            <Link href="/events?filter=thisweek" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1">
              {t(lang, "events.viewall")} <ChevronRight size={14} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {thisWeekEvents.map(ev => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="shrink-0 w-64 bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-4 hover:shadow-md transition-shadow"
              >
                {ev.sdg_goals?.[0] && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white mb-2 inline-block"
                    style={{ backgroundColor: SDG_COLORS[ev.sdg_goals[0]] }}
                  >
                    SDG {ev.sdg_goals[0]}
                  </span>
                )}
                <p className="text-sm font-semibold text-[#0f2a4a] dark:text-white line-clamp-2 mt-1">{ev.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <Calendar size={11} /> {formatDate(ev.start_date)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Calendars */}
      <section className="bg-gray-50 dark:bg-[#0f172a] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-white">{t(lang, "calendar.featured")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t(lang, "calendar.subtitle")}</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {FEATURED_ORGS.map(org => (
              <Link
                key={org.name}
                href={`/events?org=${encodeURIComponent(org.full)}`}
                className="shrink-0 w-44 bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-4 text-center hover:shadow-md transition-shadow group"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3"
                  style={{ backgroundColor: SDG_COLORS[org.sdg] }}
                >
                  {org.name[0]}
                </div>
                <p className="text-sm font-semibold text-[#0f2a4a] dark:text-white group-hover:text-[#4ea8de] transition-colors">{org.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{org.full}</p>
                <span className="mt-3 inline-block text-xs px-3 py-1 rounded-full border border-[#4ea8de]/40 text-[#4ea8de] group-hover:bg-[#4ea8de] group-hover:text-white transition-colors">
                  {t(lang, "calendar.follow")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white">{t(lang, "events.upcoming")}</h2>
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

      {/* Browse by SDG */}
      <section className="bg-gray-50 dark:bg-[#0f172a] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-6">{t(lang, "sdg.browse")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 17 }, (_, i) => i + 1).map(sdg => (
              <Link
                key={sdg}
                href={`/events?sdg=${sdg}`}
                className="rounded-xl p-3 text-white text-center hover:scale-105 transition-transform cursor-pointer shadow-sm"
                style={{ backgroundColor: SDG_COLORS[sdg] }}
              >
                <div className="text-xs font-bold opacity-80">SDG {sdg}</div>
                <div className="text-xs font-semibold mt-0.5 leading-tight">{SDG_LABELS[sdg]}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Explore by Region */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-[#0f2a4a] dark:text-white mb-6">{t(lang, "region.explore")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {REGIONS.map(region => (
            <Link
              key={region.name}
              href={`/events?region=${encodeURIComponent(region.query)}`}
              className="relative rounded-xl overflow-hidden h-36 group cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={region.photo}
                alt={region.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-bold text-base">{region.name}</p>
                <p className="text-gray-300 text-xs">{region.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Submit CTA */}
      <section className="bg-[#0f2a4a] py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-2">{t(lang, "home.submit.cta")}</h2>
          <p className="text-blue-200 mb-6">{t(lang, "home.submit.sub")}</p>
          <Link
            href="/events/create"
            className="inline-flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            {t(lang, "home.submit.btn")} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Activity feed */}
      <div className="bg-gray-50 dark:bg-[#0f172a] border-t border-gray-200 dark:border-[#334155] py-3 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-opacity duration-500 truncate">
            🌍 {ACTIVITY_FEED[activityIdx]}
          </p>
        </div>
      </div>
    </main>
  );
}
