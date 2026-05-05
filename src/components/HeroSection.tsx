"use client";

// EXPO: Replace hero section with static HeroImage component for React Native

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";

const SLIDES = [
  {
    photo: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=1920&q=95",
    mobilePhoto: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80",
    headline: "Where Global Health Decisions Are Made",
    subtext: "World Health Assembly · Geneva · May 2026",
    accent: "#4C9F38",
  },
  {
    photo: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1920&q=95",
    mobilePhoto: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
    headline: "Driving Climate Action Across Every Nation",
    subtext: "COP31 · Climate Conference · 2026",
    accent: "#3F7E44",
  },
  {
    photo: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=95",
    mobilePhoto: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    headline: "Every Side Event. Every Deadline. One Platform.",
    subtext: "1,000+ Events · 50+ Countries · All 17 SDGs",
    accent: "#26BDE2",
  },
  {
    photo: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1920&q=95",
    mobilePhoto: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80",
    headline: "Built for the Global Development Community",
    subtext: "WHO · UNICEF · Gates Foundation · and 1,000+ organizations",
    accent: "#E5243B",
  },
  {
    photo: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1920&q=95",
    mobilePhoto: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&q=80",
    headline: "Representing Every Region on Earth",
    subtext: "Africa · Asia · Middle East · Americas · Pacific",
    accent: "#DDA63A",
  },
  {
    photo: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&q=95",
    mobilePhoto: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
    headline: "Find Travel Grants and Funded Opportunities",
    subtext: "Scholarships · Fellowships · Sponsored Attendance",
    accent: "#FD6925",
  },
] as const;

const SDG_OPTIONS = Array.from({ length: 17 }, (_, i) => ({ value: String(i + 1), label: `SDG ${i + 1}` }));
const FORMAT_OPTIONS = [
  { value: "in_person", label: "In-Person" },
  { value: "virtual",   label: "Virtual" },
  { value: "hybrid",    label: "Hybrid" },
];
const POPULAR_CHIPS = ["Health", "Climate", "WHA", "SDG 3", "Water"];

export default function HeroSection() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [textKey, setTextKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [sdgFilter, setSdgFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    setTextKey(k => k + 1);
  }, []);

  const advance = useCallback(() => {
    setActive(a => (a + 1) % SLIDES.length);
    setTextKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(advance, 6000);
    return () => clearInterval(intervalRef.current);
  }, [paused, advance]);

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

  const slide = SLIDES[active];

  return (
    /* data-hero-mode="slideshow" applies on desktop; data-mobile-hero-mode="static" applies on mobile */
    <div className="relative" data-hero-mode="slideshow" data-mobile-hero-mode="static">

      {/* ───────────── DESKTOP + TABLET SLIDESHOW (md and above) ───────────── */}
      <div
        className="hidden md:block relative md:h-[65vh] lg:h-screen overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Photo slides — crossfade via opacity */}
        {SLIDES.map((s, i) => (
          <div
            key={i}
            aria-hidden={active !== i}
            className="absolute inset-0"
            style={{
              opacity: active === i ? 1 : 0,
              transition: "opacity 1.5s ease",
              zIndex: active === i ? 1 : 0,
            }}
          >
            {/* Ken Burns applied to this wrapper; opacity on parent keeps them separate */}
            <div className={`relative w-full h-full ${active === i ? "ken-burns-active" : ""}`}>
              <Image
                src={s.photo}
                alt={s.headline}
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover object-center"
                style={{ filter: "brightness(0.75) saturate(0.85)" }}
              />
            </div>
          </div>
        ))}

        {/* Cinematic gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(15,42,74,0.88) 100%)",
            zIndex: 2,
          }}
        />

        {/* Text — bottom-left */}
        <div
          className="absolute bottom-0 left-0 right-24 pb-24 md:pb-28 lg:pb-32 pl-8 md:pl-10 lg:pl-14"
          style={{ zIndex: 3 }}
        >
          <div key={textKey} className="hero-text-enter">
            <div
              className="rounded-full mb-4"
              style={{ height: 3, width: 60, backgroundColor: slide.accent }}
            />
            <h1
              className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight max-w-3xl"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
            >
              {slide.headline}
            </h1>
            <p
              className="text-sm md:text-base lg:text-lg text-white/70 mt-3 font-medium tracking-widest uppercase"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
            >
              {slide.subtext}
            </p>
          </div>
        </div>

        {/* Dot indicators — bottom center */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5"
          style={{ zIndex: 3 }}
        >
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className="rounded-full transition-all duration-300 focus:outline-none"
              style={{
                width:  active === i ? 8 : 6,
                height: active === i ? 8 : 6,
                backgroundColor: active === i ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>

        {/* Arrow navigation — desktop (lg) only */}
        <button
          onClick={() => goTo((active - 1 + SLIDES.length) % SLIDES.length)}
          aria-label="Previous slide"
          className="absolute left-5 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          style={{ zIndex: 3 }}
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => goTo((active + 1) % SLIDES.length)}
          aria-label="Next slide"
          className="absolute right-5 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          style={{ zIndex: 3 }}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* ───────────── FLOATING SEARCH BAR (md and above) ─────────────────── */}
      <div
        className="hidden md:block absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-full px-4 md:px-6 lg:px-0 lg:max-w-4xl"
        style={{ zIndex: 20 }}
      >
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
          <div className="flex items-center px-5 py-4 gap-3">
            <Search className="text-gray-400 shrink-0" size={20} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search events, organizations, or SDG goals…"
              className="flex-1 min-w-0 text-sm text-gray-800 dark:text-gray-100 bg-transparent placeholder-gray-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors">
                <X size={15} />
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
              className="bg-[#0f2a4a] hover:bg-[#1a3f6e] dark:bg-[#4ea8de] dark:hover:bg-[#3a95cc] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* ───────────── MOBILE STATIC HERO (below md) ───────────────────────── */}
      <div className="md:hidden relative h-[70vh] overflow-hidden">
        <Image
          src={SLIDES[0].mobilePhoto}
          alt={SLIDES[0].headline}
          fill
          sizes="100vw"
          priority
          className="object-cover object-center"
          style={{ filter: "brightness(0.75) saturate(0.85)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(15,42,74,0.88) 100%)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 pb-20 pl-5 pr-5">
          <div
            className="rounded-full mb-3"
            style={{ height: 3, width: 40, backgroundColor: SLIDES[0].accent }}
          />
          <h1
            className="text-3xl font-extrabold text-white max-w-xs leading-tight"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
          >
            {SLIDES[0].headline}
          </h1>
          <p className="text-xs text-white/70 uppercase tracking-widest mt-2 font-medium">
            {SLIDES[0].subtext}
          </p>
        </div>
      </div>

      {/* ───────────── MOBILE INLINE SEARCH BAR ────────────────────────────── */}
      <div
        className="md:hidden mx-4 -mt-5 relative bg-white dark:bg-[#1e293b] rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden"
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
