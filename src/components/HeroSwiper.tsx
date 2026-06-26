"use client";

// Swiper carousel only. Split out of HeroSection so the bulky swiper
// runtime (Autoplay + Keyboard + A11y modules + CSS, ~150 kB combined)
// can be dynamically imported. HeroSection renders a static first-slide
// fallback during SSR + while this chunk loads, so the homepage LCP
// image still gets preloaded via priority — the carousel just takes
// over once the JS arrives.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Keyboard, A11y } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";

import type { SlideData } from "./HeroSection";

export default function HeroSwiper({
  slides,
  resolveBg,
}: {
  slides: SlideData[];
  /** Resolve the actual background URL for slide i (admin override vs.
   *  Pexels result vs. local fallback). HeroSection owns the mapping. */
  resolveBg: (slide: SlideData, i: number) => string;
}) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      swiperRef.current?.autoplay.stop();
    }
  }, []);

  return (
    <div className="relative h-[50vh] sm:h-[55vh] lg:h-[70vh]">
      <Swiper
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        onSlideChange={(swiper) => setActiveIdx(swiper.realIndex)}
        modules={[Autoplay, Keyboard, A11y]}
        autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        speed={800}
        loop
        keyboard={{ enabled: true }}
        a11y={{ enabled: true, prevSlideMessage: "Previous slide", nextSlideMessage: "Next slide" }}
        className="w-full h-full"
      >
        {slides.map((slide, i) => {
          const bg = resolveBg(slide, i);
          const remoteBg = bg.startsWith("https://") || bg.startsWith("http://");
          return (
            <SwiperSlide key={i}>
              <div className="relative w-full h-full overflow-hidden">
                <div className="hero-kb-image absolute inset-0">
                  <Image
                    src={bg}
                    alt={slide.headline || `Slide ${i + 1}`}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover object-center"
                    unoptimized={remoteBg}
                  />
                </div>
                {/* Subtle gradient panel behind ONLY the text block (bottom ~45% of slide) */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[45%] pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0) 100%)",
                  }}
                />
                <div className="hero-slide-text absolute bottom-0 left-0 right-0 pb-24 md:pb-28 pl-6 md:pl-10 pr-6 md:pr-10">
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
            </SwiperSlide>
          );
        })}
      </Swiper>

      <button
        onClick={() => swiperRef.current?.slidePrev()}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-black/20 hover:bg-black/50 text-white transition-all duration-200"
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={() => swiperRef.current?.slideNext()}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-black/20 hover:bg-black/50 text-white transition-all duration-200"
      >
        <ChevronRight size={22} />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
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
  );
}
