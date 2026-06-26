"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Globe } from "lucide-react";
import type { MapPin, ShowFilter, FlyToTarget } from "./EventsMap";
import { ShowFilterPills } from "./MapFilterPills";
import UseMyLocationButton, { type GeolocationOutcome } from "./UseMyLocationButton";
import CitySearchInput, { type ResolvedCity } from "./CitySearchInput";

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
  const [flyTarget, setFlyTarget] = useState<FlyToTarget | null>(null);
  const [nearMeCount, setNearMeCount] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

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

  async function handleNearMe(outcome: GeolocationOutcome) {
    if (!outcome.ok) {
      if (outcome.reason === "denied") setGeoError("Location access denied. Try searching for a city instead.");
      else if (outcome.reason === "timeout") setGeoError("Couldn't detect location. Try searching for a city instead.");
      else if (outcome.reason === "unavailable") setGeoError("Couldn't detect location. Try searching for a city.");
      return;
    }
    setGeoError(null);
    setFlyTarget({ lat: outcome.lat, lng: outcome.lng, zoom: 7, nonce: Date.now() });
    try {
      const res = await fetch(`/api/map/nearest?lat=${outcome.lat}&lng=${outcome.lng}&limit=20`);
      if (res.ok) {
        const data = (await res.json()) as { events: unknown[] };
        setNearMeCount(data.events.length);
      }
    } catch {
      // ignore — the count is a nicety, not a blocker
    }
  }

  // City search — typed city resolved through /api/geo/resolve, then map flies
  // to it and the same /api/map/nearest call backs the "events near" count so
  // the UX matches "Find events near me" once resolved.
  async function handleCityPicked(city: ResolvedCity) {
    setGeoError(null);
    setFlyTarget({ lat: city.lat, lng: city.lng, zoom: 7, nonce: Date.now() });
    try {
      const res = await fetch(`/api/map/nearest?lat=${city.lat}&lng=${city.lng}&limit=20`);
      if (res.ok) {
        const data = (await res.json()) as { events: unknown[] };
        setNearMeCount(data.events.length);
      }
    } catch {
      // ignore
    }
  }

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
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ShowFilterPills value={showFilter} onChange={setShowFilter} />
          <UseMyLocationButton onLocate={handleNearMe} label="Find events near me" compact />
          {/* City search — typed city flies the map there, independent of geolocation. */}
          <div className="w-full sm:w-64">
            <CitySearchInput
              onResolved={handleCityPicked}
              placeholder="Search a city (e.g. Geneva)…"
            />
          </div>
        </div>
        {geoError && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">{geoError}</p>
        )}
        {nearMeCount != null && !geoError && (
          <p className="text-xs text-slate-600 mb-3 inline-flex items-center gap-2">
            <span className="font-semibold text-emerald-700">{nearMeCount}</span> events near you ·{" "}
            <Link href="/map?near=me" className="text-blue-600 hover:underline font-medium">See nearest →</Link>
          </p>
        )}

        {/* Map card — matches design system */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800">
          <div className="h-[320px] sm:h-[400px]">
            {shouldLoad ? (
              <EventsMap
                mode="teaser"
                height="100%"
                showFilter={showFilter}
                flyToTarget={flyTarget ?? undefined}
                onPinsLoaded={handlePinsLoaded}
              />
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
