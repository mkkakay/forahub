"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, MapPin, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export type HeroPanelEvent = {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  location: string | null;
  sdg_goals: number[];
  region: string | null;
};

// Fixed photos by panel position — ensures three visually distinct panels every time
const PANEL_PHOTOS = [
  "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=85",
  "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&q=85",
  "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=85",
];

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

const MESSAGES = [
  "Never miss a global development event again",
  "From Nairobi to Geneva. Every summit. Every side event.",
  "WHA. COP. UNGA. And 10,000 more events you should know about.",
  "Built for the global development community. Every region. Every SDG.",
  "Your AI assistant for global events. Ask anything. Find everything.",
];

const SDG_OPTIONS = Array.from({ length: 17 }, (_, i) => ({ value: String(i + 1), label: `SDG ${i + 1}` }));
const FORMAT_OPTIONS = [
  { value: "in_person", label: "In-Person" },
  { value: "virtual",   label: "Virtual" },
  { value: "hybrid",    label: "Hybrid" },
];
const POPULAR_CHIPS = ["Health", "Climate", "WHA", "SDG 3", "Water"];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function HeroSection({ heroEvents }: { heroEvents: HeroPanelEvent[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sdgFilter, setSdgFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [msgIdx, setMsgIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [activeSet, setActiveSet] = useState(0);
  const [panelVisible, setPanelVisible] = useState(true);

  const numSets = Math.max(1, Math.ceil(heroEvents.length / 3));
  const currentPanels = heroEvents.slice(activeSet * 3, activeSet * 3 + 3);

  // Rotate message every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % MESSAGES.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Rotate panel set every 8 seconds
  useEffect(() => {
    if (numSets <= 1) return;
    const timer = setInterval(() => {
      setPanelVisible(false);
      setTimeout(() => {
        setActiveSet(s => (s + 1) % numSets);
        setPanelVisible(true);
      }, 1000);
    }, 8000);
    return () => clearInterval(timer);
  }, [numSets]);

  function buildUrl(q: string) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (sdgFilter) params.set("sdg", sdgFilter);
    if (formatFilter) params.set("format", formatFilter);
    return `/events${params.toString() ? `?${params}` : ""}`;
  }

  function handleSearch(overrideQuery?: string) {
    router.push(buildUrl(overrideQuery ?? query));
  }

  return (
    <div className="relative">

      {/* ── HERO PANELS ─────────────────────────────────────────────────────── */}
      <div className="relative h-[45vh] md:h-[55vh] overflow-hidden flex">

        {/* Top gradient for value prop text readability */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/60 via-black/40 to-transparent z-10 pointer-events-none" />

        {/* Value proposition — large, centered, desktop only */}
        <div className="absolute inset-0 z-20 hidden md:flex flex-col items-center justify-center pointer-events-none px-4">
          <p
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white text-center drop-shadow-2xl"
            style={{ opacity: fade ? 1 : 0, transition: "opacity 300ms ease" }}
          >
            {MESSAGES[msgIdx]}
          </p>
          <p className="text-base md:text-lg text-white/80 font-medium mt-3 text-center drop-shadow-lg">
            The global development events platform for every professional everywhere
          </p>
        </div>

        {/* Panels — fade between sets */}
        <div
          className="flex h-full w-full"
          style={{ opacity: panelVisible ? 1 : 0, transition: "opacity 1s ease" }}
        >
          {currentPanels.map((event, i) => {
            const photo    = PANEL_PHOTOS[i] ?? PANEL_PHOTOS[0];
            const sdg      = event.sdg_goals?.[0];
            const sdgColor = sdg ? (SDG_COLORS[sdg] ?? "#3b82f6") : null;

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className={`group relative overflow-hidden flex-1 ${i > 0 ? "hidden md:block" : "block"}`}
              >
                <Image
                  src={photo}
                  alt={event.title}
                  fill
                  sizes={i === 0 ? "(max-width: 768px) 100vw, 33vw" : "33vw"}
                  priority={i === 0}
                  className="object-cover object-center transition-transform duration-[400ms] group-hover:scale-[1.03]"
                  style={{ filter: "brightness(0.8) saturate(0.85)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/75 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  {sdgColor && (
                    <span
                      className="inline-block text-xs font-bold text-white px-2 py-0.5 rounded-full mb-2"
                      style={{ backgroundColor: sdgColor }}
                    >
                      SDG {sdg}
                    </span>
                  )}
                  <h2 className="text-lg font-bold text-white leading-tight line-clamp-2 mb-1">
                    {event.title}
                  </h2>
                  {event.organization && (
                    <p className="text-xs text-white/70 uppercase tracking-wide mb-1.5">
                      {event.organization}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-white/60">
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar size={10} />
                      {formatDate(event.start_date)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1 min-w-0">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {currentPanels.length === 0 && (
            <div className="relative flex-1 overflow-hidden">
              <Image
                src={PANEL_PHOTOS[0]}
                alt="Global development events"
                fill
                sizes="100vw"
                priority
                className="object-cover object-center"
                style={{ filter: "brightness(0.8) saturate(0.85)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/75" />
            </div>
          )}
        </div>

        {/* Set dot indicators */}
        {numSets > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-30">
            {Array.from({ length: numSets }).map((_, i) => (
              <button
                key={i}
                onClick={() => { setActiveSet(i); setPanelVisible(true); }}
                aria-label={`Show set ${i + 1}`}
                className="rounded-full transition-all duration-300 focus:outline-none"
                style={{
                  width:  activeSet === i ? 8 : 6,
                  height: activeSet === i ? 8 : 6,
                  backgroundColor: activeSet === i ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── SUBMIT EVENT BANNER ──────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-[#0f2a4a] to-[#1a3a5c] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Organizing a global development event?
            </h2>
            <p className="text-sm md:text-base text-white/70 mt-1">
              List it on ForaHub and reach 10,000+ professionals across 194 countries and all 17 SDG goals
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <Link
              href="/events/create"
              className="w-full md:w-auto bg-white text-[#0f2a4a] rounded-xl px-8 py-3 font-semibold text-base hover:bg-gray-100 transition-colors text-center"
            >
              Submit Your Event
            </Link>
            <span className="text-white/50 text-xs">Free to list. No account required to browse.</span>
          </div>
        </div>
      </div>

      {/* ── FLOATING SEARCH BAR (md and above) ──────────────────────────────── */}
      <div
        className="hidden md:block absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-full px-4 md:px-6 lg:px-0 lg:max-w-5xl"
        style={{ zIndex: 20 }}
      >
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
          <div className="flex items-center px-6 py-5 gap-3">
            <Search className="text-gray-400 shrink-0" size={22} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search events, organizations, or SDG goals…"
              className="flex-1 min-w-0 text-base lg:text-lg text-gray-800 dark:text-gray-100 bg-transparent placeholder-gray-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors">
                <X size={16} />
              </button>
            )}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <select
                value={sdgFilter}
                onChange={e => setSdgFilter(e.target.value)}
                className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-[#475569] rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-[#4ea8de] cursor-pointer"
              >
                <option value="">All SDGs</option>
                {SDG_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={formatFilter}
                onChange={e => setFormatFilter(e.target.value)}
                className="hidden lg:block text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#334155] border border-gray-200 dark:border-[#475569] rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-[#4ea8de] cursor-pointer"
              >
                <option value="">All Formats</option>
                {FORMAT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => handleSearch()}
              className="bg-[#0f2a4a] hover:bg-[#1a3f6e] dark:bg-[#4ea8de] dark:hover:bg-[#3a95cc] text-white font-semibold px-6 py-3 rounded-xl text-base transition-colors shrink-0"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE INLINE SEARCH BAR ─────────────────────────────────────────── */}
      <div
        className="md:hidden mx-4 mt-2 relative bg-white dark:bg-[#1e293b] rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden"
        style={{ zIndex: 10 }}
      >
        <div className="flex items-center px-4 border-b border-gray-100 dark:border-[#334155]">
          <Search className="text-gray-400 shrink-0" size={18} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search events or organizations…"
            className="flex-1 px-3 py-4 text-sm text-gray-800 dark:text-gray-100 bg-transparent placeholder-gray-400 focus:outline-none min-w-0"
          />
          <button
            onClick={() => handleSearch()}
            className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shrink-0 my-2"
          >
            Search
          </button>
        </div>
        <div className="flex gap-2 px-4 py-3 flex-wrap">
          {POPULAR_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => handleSearch(chip)}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#334155] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#475569] transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
