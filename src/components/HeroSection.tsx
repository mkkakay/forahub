"use client";

import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Keyboard, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import "swiper/css";

// Keep type export — consumed by any external callers
export type HeroPanelEvent = {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  location: string | null;
  sdg_goals: number[];
  region: string | null;
};

type SlideData = {
  bg: string;
  badge: { text: string; color: string } | null;
  org: string | null;
  headline: string;
  subtext: string;
  cta: { text: string; href: string; solid?: boolean };
};

const SLIDES: SlideData[] = [
  // — Event slides —
  {
    bg: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1920&q=95",
    badge: { text: "SDG 3 Good Health", color: "#4C9F38" },
    org: "WHO",
    headline: "World Health Assembly 2027",
    subtext: "The world's highest health policy forum. Geneva, May 2027.",
    cta: { text: "View Event", href: "/events" },
  },
  {
    bg: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1920&q=95",
    badge: { text: "SDG 13 Climate Action", color: "#3F7E44" },
    org: "UNFCCC",
    headline: "COP31 Climate Conference",
    subtext: "Global climate action. Belem, Brazil, November 2026.",
    cta: { text: "View Event", href: "/events" },
  },
  {
    bg: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=95",
    badge: { text: "SDG 17 Partnerships", color: "#19486A" },
    org: "UN DESA",
    headline: "SDG High Level Political Forum",
    subtext: "Reviewing progress on the 2030 Agenda. New York, July 2027.",
    cta: { text: "View Event", href: "/events" },
  },
  // — Value proposition slides —
  {
    bg: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1920&q=95",
    badge: null,
    org: null,
    headline: "Never Miss a Global Development Event Again",
    subtext: "From Nairobi to Geneva. Every summit, side event, and convening in one place.",
    cta: { text: "Explore Events", href: "/events" },
  },
  {
    bg: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1920&q=95",
    badge: null,
    org: null,
    headline: "Your AI Assistant for Global Events",
    subtext: "Ask anything. Find the right conference, deadline, or opportunity instantly.",
    cta: { text: "Try AI Assistant", href: "/assistant" },
  },
  {
    bg: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1920&q=95",
    badge: null,
    org: null,
    headline: "Built for Every Region on Earth",
    subtext: "Africa. Asia. Middle East. Americas. Pacific. 194 countries covered.",
    cta: { text: "Browse by Region", href: "/events" },
  },
  {
    bg: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1920&q=95",
    badge: null,
    org: null,
    headline: "Track Every WHO, UNICEF, and Gates Foundation Event",
    subtext: "1,000+ organizations monitored. Every major convening captured automatically.",
    cta: { text: "Browse Organizations", href: "/events" },
  },
  {
    bg: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1920&q=95",
    badge: null,
    org: null,
    headline: "Organizing a Global Development Event?",
    subtext: "List it on ForaHub and reach 10,000+ professionals across 194 countries.",
    cta: { text: "Submit Your Event", href: "/events/create", solid: true },
  },
  {
    bg: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1920&q=95",
    badge: null,
    org: null,
    headline: "Covering All 17 SDG Goals",
    subtext: "Health. Climate. Education. Gender. Water. Energy. Every goal. Every event.",
    cta: { text: "Browse by SDG", href: "/events" },
  },
];

const SDG_OPTIONS = Array.from({ length: 17 }, (_, i) => ({ value: String(i + 1), label: `SDG ${i + 1}` }));
const FORMAT_OPTIONS = [
  { value: "in_person", label: "In-Person" },
  { value: "virtual",   label: "Virtual" },
  { value: "hybrid",    label: "Hybrid" },
];
const POPULAR_CHIPS = ["Health", "Climate", "WHA", "SDG 3", "Water"];

export default function HeroSection() {
  const router = useRouter();
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [sdgFilter, setSdgFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");

  // Stop autoplay for users who prefer reduced motion
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      swiperRef.current?.autoplay.stop();
    }
  }, []);

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

      {/* ── SWIPER CAROUSEL ─────────────────────────────────────────────────── */}
      <div className="relative h-[50vh] sm:h-[55vh] lg:h-[70vh]">
        <Swiper
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onSlideChange={(swiper) => setActiveIdx(swiper.realIndex)}
          modules={[Autoplay, Keyboard, A11y]}
          autoplay={{ delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true }}
          speed={1000}
          loop
          keyboard={{ enabled: true }}
          a11y={{ enabled: true, prevSlideMessage: "Previous slide", nextSlideMessage: "Next slide" }}
          className="w-full h-full"
        >
          {SLIDES.map((slide, i) => (
            <SwiperSlide key={i}>
              <div className="relative w-full h-full overflow-hidden">
                {/* Background image with Ken Burns */}
                <div className="hero-kb-image absolute inset-0">
                  <Image
                    src={slide.bg}
                    alt={slide.headline}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover object-center"
                    style={{ filter: "brightness(0.65) saturate(0.9)" }}
                  />
                </div>

                {/* Cinematic gradient overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(15,42,74,0.85) 100%)",
                  }}
                />

                {/* Text content — animates in on slide active */}
                <div className="hero-slide-text absolute bottom-0 left-0 right-0 pb-20 md:pb-24 pl-6 md:pl-10 pr-6 md:pr-10">
                  {slide.badge && (
                    <span
                      className="text-xs font-bold text-white px-3 py-1 rounded-full mb-3 inline-block"
                      style={{ backgroundColor: slide.badge.color }}
                    >
                      {slide.badge.text}
                    </span>
                  )}
                  {slide.org && (
                    <p className="text-xs text-white/60 uppercase tracking-widest mb-1 font-medium">
                      {slide.org}
                    </p>
                  )}
                  <h2
                    className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight max-w-3xl"
                    style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}
                  >
                    {slide.headline}
                  </h2>
                  <p className="text-base md:text-lg text-white/80 mt-3 max-w-xl font-medium">
                    {slide.subtext}
                  </p>
                  <Link
                    href={slide.cta.href}
                    className={`mt-6 inline-block px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      slide.cta.solid
                        ? "bg-white text-[#0f2a4a] hover:bg-gray-100"
                        : "border-2 border-white text-white hover:bg-white hover:text-[#0f2a4a]"
                    }`}
                  >
                    {slide.cta.text}
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Left arrow — desktop only */}
        <button
          onClick={() => swiperRef.current?.slidePrev()}
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-black/20 hover:bg-black/50 text-white transition-all duration-200"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Right arrow — desktop only */}
        <button
          onClick={() => swiperRef.current?.slideNext()}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-black/20 hover:bg-black/50 text-white transition-all duration-200"
        >
          <ChevronRight size={22} />
        </button>

        {/* Dot indicators — bottom center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => swiperRef.current?.slideTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 focus:outline-none ${
                activeIdx === i
                  ? "w-6 h-2 bg-white"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── FLOATING SEARCH BAR (md and above) ──────────────────────────────── */}
      <div
        className="hidden md:block absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-full px-4 md:px-6 lg:px-0 lg:max-w-5xl"
        style={{ zIndex: 30 }}
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
              <button
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
              >
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
