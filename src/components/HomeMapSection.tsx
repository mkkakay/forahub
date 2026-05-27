"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Globe } from "lucide-react";
import type { MapPin, ShowFilter } from "./EventsMap";
import { ShowFilterPills } from "./MapFilterPills";

// Lazy-loaded so leaflet's window-dependent module only runs in the browser.
const EventsMap = dynamic(() => import("./EventsMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="w-full h-[320px] sm:h-[400px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
  );
}

// Bin pins into ~5° lat/lng buckets to give a quick "regions covered" count
// without needing a country_code column on the events table.
function distinctRegions(pins: MapPin[]): number {
  const bins = new Set<string>();
  for (const p of pins) {
    bins.add(`${Math.round(p.lat / 5)}_${Math.round(p.lng / 5)}`);
  }
  return bins.size;
}

export default function HomeMapSection({ totalWithCoords }: { totalWithCoords: number }) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [pinsVisible, setPinsVisible] = useState<number | null>(null);
  const [regionsCovered, setRegionsCovered] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState<ShowFilter>("all");

  useEffect(() => {
    if (!sectionRef.current || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handlePinsLoaded = useMemo(() => (pins: MapPin[], total: number) => {
    setPinsVisible(total);
    setRegionsCovered(distinctRegions(pins));
  }, []);

  return (
    <section ref={sectionRef} className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header row matching other homepage sections */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight inline-flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              Events around the world
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {totalWithCoords.toLocaleString()} upcoming in-person event{totalWithCoords === 1 ? "" : "s"}
              {regionsCovered != null && regionsCovered > 0 && (
                <> across {regionsCovered} region{regionsCovered === 1 ? "" : "s"}</>
              )}
            </p>
          </div>
          <Link
            href="/map"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 shrink-0"
          >
            Explore the full map <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Toggle filters above the map (homepage = simple, Show only) */}
        <div className="mb-4">
          <ShowFilterPills value={showFilter} onChange={setShowFilter} />
        </div>

        {/* Map card — matches design system */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-[#334155] shadow-sm bg-white dark:bg-[#1e293b]">
          <div className="h-[320px] sm:h-[400px]">
            {shouldLoad ? (
              <EventsMap mode="teaser" height="100%" showFilter={showFilter} onPinsLoaded={handlePinsLoaded} />
            ) : (
              <MapSkeleton />
            )}
          </div>
        </div>

        {/* Stats row below the map */}
        <div className="flex items-center gap-6 mt-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {pinsVisible != null ? `${pinsVisible} events visible` : "Loading events…"}
          </span>
          <span className="hidden sm:inline">Click any pin to view event details</span>
        </div>
      </div>
    </section>
  );
}
