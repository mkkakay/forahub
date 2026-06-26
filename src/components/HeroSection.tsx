"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

// Swiper is heavy (~150 kB combined runtime + CSS). Dynamic-import it
// with ssr:false so the homepage's initial JS payload stays slim. While
// the chunk loads we render a static first-slide image with `priority`
// — same Next/Image element the carousel would render — so the LCP
// element is still preloaded by the framework.
const HeroSwiper = dynamic(() => import("./HeroSwiper"), {
  ssr: false,
  loading: () => null, // The static first-slide block below handles paint.
});

// Static first slide — rendered server-side AND while the Swiper chunk
// loads. Uses the same Image + overlay + text JSX the carousel would
// render for slide 0, so the swap to the live carousel is invisible.
// LCP-critical: `priority` on this Image is what Next/Image preloads.
function HeroFirstSlide({ slide, bg }: { slide: SlideData; bg: string }) {
  const remoteBg = bg.startsWith("https://") || bg.startsWith("http://");
  return (
    <div className="relative h-[50vh] sm:h-[55vh] lg:h-[70vh]">
      <div className="relative w-full h-full overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={bg}
            alt={slide.headline || "Slide 1"}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
            unoptimized={remoteBg}
          />
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-[45%] pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0) 100%)",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 pb-24 md:pb-28 pl-6 md:pl-10 pr-6 md:pr-10">
          {slide.badge && (
            <span
              className="text-xs font-bold text-white px-3 py-1 rounded-full mb-3 inline-block"
              style={{ backgroundColor: slide.badge.color }}
            >
              {slide.badge.text}
            </span>
          )}
          {slide.org && (
            <p
              className="text-xs text-white/80 uppercase tracking-widest mb-1 font-medium"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
            >
              {slide.org}
            </p>
          )}
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight max-w-3xl"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,0.55), 0 4px 24px rgba(0,0,0,0.65)" }}
          >
            {slide.headline}
          </h2>
          <p
            className="text-base md:text-lg text-white mt-3 max-w-xl font-medium"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.55), 0 2px 12px rgba(0,0,0,0.55)" }}
          >
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
    </div>
  );
}

export type HeroPanelEvent = {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  location: string | null;
  sdg_goals: number[];
  region: string | null;
};

export type SlideData = {
  bg: string;
  badge: { text: string; color: string } | null;
  org: string | null;
  headline: string;
  subtext: string;
  cta: { text: string; href: string; solid?: boolean };
};

export type HeroImageRow = {
  id: string;
  public_url: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  display_order: number;
};

const SLIDES: SlideData[] = [
  {
    // LCP-critical: pre-converted to WebP (518kB jpg → 245kB webp @1920w).
    // Next/Image still emits responsive variants via /_next/image.
    bg: "/images/hero/un-hlpf-1920.webp",
    badge: { text: "SDG 17 Partnerships", color: "#19486A" },
    org: "UN DESA",
    headline: "SDG High Level Political Forum",
    subtext: "Reviewing progress on the 2030 Agenda. New York, July 2027.",
    cta: { text: "View Event", href: "/events" },
  },
  {
    bg: "/images/hero/global-events.jpg",
    badge: null,
    org: null,
    headline: "Never Miss a Global Development Event Again",
    subtext: "From Nairobi to Geneva. Every summit, side event, and convening in one place.",
    cta: { text: "Explore Events", href: "/events" },
  },
  {
    bg: "/images/hero/ai-assistant.jpg",
    badge: null,
    org: null,
    headline: "Your AI Assistant for Global Events",
    subtext: "Ask anything. Find the right conference, deadline, or opportunity instantly.",
    cta: { text: "Try AI Assistant", href: "/assistant" },
  },
  {
    bg: "/images/hero/global-regions.jpg",
    badge: null,
    org: null,
    headline: "Built for Every Region on Earth",
    subtext: "Africa. Asia. Middle East. Americas. Pacific. 194 countries covered.",
    cta: { text: "Browse by Region", href: "/events" },
  },
  {
    bg: "/images/hero/track-events.jpg",
    badge: null,
    org: null,
    headline: "Track global development events from Nairobi to Geneva",
    subtext: "From local forums to major summits. Every region. Every SDG. Every convening that matters.",
    cta: { text: "Browse Organizations", href: "/events" },
  },
  {
    bg: "/images/hero/submit-event.jpg",
    badge: null,
    org: null,
    headline: "Organizing a Global Development Event?",
    subtext: "List it on ForaHub and reach 10,000+ professionals across 194 countries.",
    cta: { text: "Submit Your Event", href: "/events/create", solid: true },
  },
  {
    bg: "/images/hero/sdg-goals.jpg",
    badge: null,
    org: null,
    headline: "Covering All 17 SDG Goals",
    subtext: "Health. Climate. Education. Gender. Water. Energy. Every goal. Every event.",
    cta: { text: "Browse by SDG", href: "/events" },
  },
];

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health and Well-being",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water and Sanitation",
  7: "Affordable and Clean Energy",
  8: "Decent Work and Economic Growth",
  9: "Industry, Innovation and Infrastructure",
  10: "Reduced Inequalities",
  11: "Sustainable Cities and Communities",
  12: "Responsible Consumption and Production",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace, Justice and Strong Institutions",
  17: "Partnerships for the Goals",
};

const TOPIC_OPTIONS = Array.from({ length: 17 }, (_, i) => ({
  value: String(i + 1),
  label: `SDG ${i + 1}: ${SDG_LABELS[i + 1]}`,
}));

const REGION_OPTIONS = [
  { value: "global",         label: "Global" },
  { value: "africa",         label: "Africa" },
  { value: "americas_north", label: "Americas (North)" },
  { value: "americas_latin", label: "Americas (Latin)" },
  { value: "asia_pacific",   label: "Asia & Pacific" },
  { value: "europe",         label: "Europe" },
  { value: "mena",           label: "MENA" },
];

const FORMAT_OPTIONS = [
  { value: "virtual",   label: "Online" },
  { value: "in_person", label: "In-Person" },
  { value: "hybrid",    label: "Hybrid" },
];

const DATE_OPTIONS = [
  { value: "week",          label: "This Week" },
  { value: "month",         label: "This Month" },
  { value: "next_3_months", label: "Next 3 Months" },
  { value: "next_6_months", label: "Next 6 Months" },
  { value: "year",          label: "This Year" },
];

export default function HeroSection({
  slideImages,
  heroImages,
}: {
  slideImages?: string[];
  heroImages?: HeroImageRow[];
}) {
  const adminSlides: SlideData[] = (heroImages ?? []).map(h => ({
    bg: h.public_url,
    badge: null,
    org: null,
    headline: h.title ?? "",
    subtext: h.subtitle ?? "",
    cta: { text: h.cta_text ?? "Explore Events", href: h.cta_url ?? "/events" },
  }));
  const useAdmin = adminSlides.length > 0;
  const slides: SlideData[] = useAdmin ? adminSlides : SLIDES;
  const router = useRouter();
  const [isSticky, setIsSticky] = useState(false);
  const [swiperReady, setSwiperReady] = useState(false);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [region, setRegion] = useState("");
  const [format, setFormat] = useState("");
  const [dateRange, setDateRange] = useState("");

  // After the static first slide paints, queue the heavy carousel.
  // requestIdleCallback (with a setTimeout fallback) defers loading
  // until the main thread is quiet, so the LCP image isn't fighting
  // Swiper for bandwidth.
  useEffect(() => {
    const idle =
      "requestIdleCallback" in window
        ? (cb: () => void) => (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb)
        : (cb: () => void) => window.setTimeout(cb, 200);
    idle(() => setSwiperReady(true));
  }, []);

  const resolveBg = (slide: SlideData, i: number): string =>
    useAdmin ? slide.bg : (slideImages?.[i] ?? slide.bg);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerWidth < 768 ? 320 : 560;
      setIsSticky(window.scrollY > threshold);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (topic) params.set("sdg", topic);
    if (region) params.set("region", region);
    if (format) params.set("format", format);
    if (dateRange) params.set("date", dateRange);
    router.push(`/events${params.toString() ? `?${params}` : ""}`);
  }

  const labelClass =
    "block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5";
  const fieldClass =
    "w-full h-11 px-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f2a4a]/30 focus:border-[#0f2a4a] transition-colors";
  const selectClass = `${fieldClass} appearance-none pr-9 cursor-pointer`;
  const selectStyle: React.CSSProperties = {
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.75rem center",
    backgroundSize: "12px",
  };

  const renderFilterBar = (idPrefix: string) => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div className="md:col-span-3">
        <label htmlFor={`${idPrefix}-q`} className={labelClass}>Search</label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            size={16}
          />
          <input
            id={`${idPrefix}-q`}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search events, organizations, or topics..."
            className={`${fieldClass} pl-9`}
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <label htmlFor={`${idPrefix}-topic`} className={labelClass}>Topic</label>
        <select
          id={`${idPrefix}-topic`}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">All Topics</option>
          {TOPIC_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor={`${idPrefix}-region`} className={labelClass}>Region</label>
        <select
          id={`${idPrefix}-region`}
          value={region}
          onChange={e => setRegion(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">All Regions</option>
          {REGION_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor={`${idPrefix}-format`} className={labelClass}>Format</label>
        <select
          id={`${idPrefix}-format`}
          value={format}
          onChange={e => setFormat(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">All Formats</option>
          {FORMAT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor={`${idPrefix}-date`} className={labelClass}>Date</label>
        <select
          id={`${idPrefix}-date`}
          value={dateRange}
          onChange={e => setDateRange(e.target.value)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">Any Date</option>
          {DATE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-1">
        <button
          onClick={handleSearch}
          aria-label="Apply filters and search events"
          className="w-full h-11 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <Search size={16} />
          <span>Search</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── STICKY FILTER BAR (slides in on scroll) ─────────────────── */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg transition-transform duration-300 ease-in-out ${
          isSticky ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
          {renderFilterBar("sticky")}
        </div>
      </div>

      <div className="relative">
        {/* Hero carousel.
            Until the Swiper chunk loads, the static `<HeroFirstSlide>`
            below renders the first slide with `priority` so the LCP
            image is preloaded. Once Swiper is mounted it takes over
            (the static layer is unmounted). Both render the same
            background image at the same dimensions so the swap is
            invisible. */}
        {!swiperReady ? (
          <HeroFirstSlide slide={slides[0]} bg={resolveBg(slides[0], 0)} />
        ) : (
          <HeroSwiper slides={slides} resolveBg={resolveBg} />
        )}
      </div>

      {/* ── FLOATING FILTER BAR (overlaps hero bottom) ──────────────── */}
      <div className="relative z-30 -mt-16 md:-mt-20 mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 md:p-5">
          {renderFilterBar("floating")}
        </div>
      </div>
    </>
  );
}
