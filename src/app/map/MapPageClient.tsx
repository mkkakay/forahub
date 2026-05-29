"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapPin, Tag, Calendar, Globe, AlertCircle } from "lucide-react";
import type { ShowFilter, ColorMode, FlyToTarget } from "@/components/EventsMap";
import { ShowFilterPills, ColorByPills } from "@/components/MapFilterPills";
import { EVENT_CATEGORIES, type CategoryKey } from "@/lib/categories";
import CitySearchInput, { type ResolvedCity } from "@/components/CitySearchInput";
import UseMyLocationButton, { type GeolocationOutcome } from "@/components/UseMyLocationButton";

const EventsMap = dynamic(() => import("@/components/EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
  ),
});

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
};

interface NearestEvent {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  banner_image_url: string | null;
  banner_display_mode: "contain" | "cover" | null;
  sdg_goals: number[] | null;
  distance_km: number;
}

interface NearestResponse {
  events: NearestEvent[];
  origin: { lat: number; lng: number };
  radius_used_km: number;
  expanded: boolean;
}

interface MapPinShape { id: string; lat: number; lng: number; sdg: number | null; }

const VISIBLE_LIMIT = 20;

function distancePillClass(km: number): string {
  if (km < 50) return "bg-emerald-100 text-emerald-700";
  if (km <= 200) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function MapPageClient() {
  const searchParams = useSearchParams();
  const nearMeParam = searchParams.get("near") === "me";

  const [sdgs, setSdgs] = useState<Set<number>>(new Set());
  const [categories, setCategories] = useState<Set<CategoryKey>>(new Set());
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showFilter, setShowFilter] = useState<ShowFilter>("all");
  const [colorBy, setColorBy] = useState<ColorMode>("sdg");

  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string | null } | null>(null);
  const [nearest, setNearest] = useState<NearestResponse | null>(null);
  const [nearestLoading, setNearestLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyToTarget | null>(null);

  const filters = useMemo(() => ({
    sdg: sdgs.size > 0 ? Array.from(sdgs).sort((a, b) => a - b) : undefined,
    category: categories.size > 0 ? Array.from(categories) : undefined,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  }), [sdgs, categories, dateFrom, dateTo]);

  function toggleSdg(n: number) {
    setSdgs(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }
  function toggleCategory(key: CategoryKey) {
    setCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  function clearFilters() {
    setSdgs(new Set());
    setCategories(new Set());
    setDateFrom("");
    setDateTo("");
  }

  async function loadNearest(lat: number, lng: number, label: string | null) {
    setNearestLoading(true);
    setGeoMessage(null);
    try {
      const catQs = categories.size > 0 ? `&category=${Array.from(categories).join(",")}` : "";
      const res = await fetch(`/api/map/nearest?lat=${lat}&lng=${lng}&limit=20${catQs}`);
      if (!res.ok) {
        setNearest(null);
        return;
      }
      const data = (await res.json()) as NearestResponse;
      setNearest(data);
      setOrigin({ lat, lng, label });
      setFlyTarget({ lat, lng, zoom: 8, nonce: Date.now() });
    } finally {
      setNearestLoading(false);
    }
  }

  function handleCityResolved(city: ResolvedCity) {
    const label = city.display_name.split(",").slice(0, 2).join(", ");
    loadNearest(city.lat, city.lng, label);
  }

  function handleGeolocation(outcome: GeolocationOutcome) {
    if (outcome.ok) {
      loadNearest(outcome.lat, outcome.lng, "you");
      return;
    }
    if (outcome.reason === "denied") {
      setGeoMessage("Location access denied. Search your city above instead.");
    } else if (outcome.reason === "timeout") {
      setGeoMessage("Couldn't detect location in time. Try searching your city.");
    } else if (outcome.reason === "unavailable") {
      setGeoMessage("Couldn't detect location. Try searching your city.");
    }
    // 'unsupported' → button is already hidden; do nothing
  }

  // Auto-trigger geolocation when arriving via /map?near=me
  useEffect(() => {
    if (!nearMeParam) return;
    // Only auto-trigger if browser supports it. If denied/timeout the
    // standard error handling fires.
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoMessage("Your browser doesn't support geolocation. Search your city instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => loadNearest(pos.coords.latitude, pos.coords.longitude, "you"),
      err => {
        if (err.code === err.PERMISSION_DENIED) setGeoMessage("Location access denied. Search your city above instead.");
        else if (err.code === err.TIMEOUT) setGeoMessage("Couldn't detect location in time. Try searching your city.");
        else setGeoMessage("Couldn't detect location. Try searching your city.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [visibleDetails, setVisibleDetails] = useState<VisibleEvent[]>([]);

  async function handlePinsLoaded(pins: MapPinShape[]) {
    const ids = pins.slice(0, VISIBLE_LIMIT).map(p => p.id);
    setVisibleIds(ids);
    if (ids.length === 0) { setVisibleDetails([]); return; }
    const details = await Promise.all(
      ids.map(async id => {
        try {
          const res = await fetch(`/api/map/event/${encodeURIComponent(id)}`);
          if (!res.ok) return null;
          return (await res.json()) as VisibleEvent;
        } catch { return null; }
      })
    );
    setVisibleDetails(details.filter((d): d is VisibleEvent => d !== null));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          {/* Location bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex-1 min-w-0">
              <CitySearchInput onResolved={handleCityResolved} />
            </div>
            <UseMyLocationButton onLocate={handleGeolocation} />
          </div>
          {geoMessage && (
            <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-600" />
              <span>{geoMessage}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
            <MapPin size={16} className="text-emerald-600" />
            <span>Showing in-person events. Pan and zoom to refine — pins update for the visible area.</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4">
            <ShowFilterPills value={showFilter} onChange={setShowFilter} />
            <ColorByPills value={colorBy} onChange={setColorBy} />
          </div>
          <EventsMap
            mode="full"
            height="70vh"
            initialFilters={filters}
            showFilter={showFilter}
            colorBy={colorBy}
            flyToTarget={flyTarget ?? undefined}
            onPinsLoaded={handlePinsLoaded}
          />
        </div>

        {/* Nearest events ranked list */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          {origin ? (
            <NearestList
              title={`Nearest events to ${origin.label ?? "you"}`}
              loading={nearestLoading}
              data={nearest}
              onPick={ev => setFlyTarget({ lat: ev.latitude, lng: ev.longitude, zoom: 13, nonce: Date.now() })}
            />
          ) : (
            <div className="text-sm text-slate-600 inline-flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              Search your city or use your location to find events near you.
            </div>
          )}
        </div>

        {/* Existing "events in current viewport" list */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-[#0f2a4a] mb-3">
            Events in this view{" "}
            <span className="text-sm font-normal text-gray-500">
              · showing first {Math.min(visibleIds.length, VISIBLE_LIMIT)}
            </span>
          </h2>
          {visibleDetails.length === 0 ? (
            <p className="text-sm text-gray-500">No events in this view. Pan or zoom out to find more.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visibleDetails.map(ev => (
                <li key={ev.id} className="py-2">
                  <Link href={`/events/${ev.id}`} className="flex items-start justify-between gap-3 group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0f2a4a] group-hover:text-[#4ea8de] line-clamp-1">{ev.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {ev.organization && <span>{ev.organization}</span>}
                        {ev.organization && ev.location && <span> · </span>}
                        {ev.location && <span>{ev.location}</span>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">{fmtDate(ev.start_date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div>
          <h2 className="text-sm font-bold text-[#0f2a4a] uppercase tracking-wider mb-3">
            Category
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const active = categories.has(cat.key);
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => toggleCategory(cat.key)}
                  title={cat.description}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded border transition-colors ${
                    active
                      ? "text-white border-transparent"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                  style={active ? { backgroundColor: cat.color } : undefined}
                >
                  <Icon size={11} style={!active ? { color: cat.color } : undefined} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-[#0f2a4a] uppercase tracking-wider mb-3 inline-flex items-center gap-1.5">
            <Tag size={14} className="text-violet-600" /> SDGs
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 17 }, (_, i) => i + 1).map(n => {
              const active = sdgs.has(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleSdg(n)}
                  title={SDG_LABELS[n]}
                  className={`text-xs font-semibold px-2 py-1 rounded border transition-colors ${
                    active
                      ? "bg-blue-100 text-blue-700 border-blue-300"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-[#0f2a4a] uppercase tracking-wider mb-3 inline-flex items-center gap-1.5">
            <Calendar size={14} className="text-blue-600" /> Date range
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40"
              />
            </label>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Format: <span className="font-semibold text-gray-700">In-person only</span>
          <p className="text-[11px] text-gray-400 mt-0.5">Online events don&apos;t have a location and aren&apos;t shown on the map.</p>
        </div>

        {(sdgs.size > 0 || categories.size > 0 || dateFrom || dateTo) && (
          <button
            type="button"
            onClick={clearFilters}
            className="w-full text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg py-1.5"
          >
            Clear filters
          </button>
        )}
      </aside>
    </div>
  );
}

interface VisibleEvent {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  location: string | null;
  sdg: number | null;
}

function NearestList({
  title,
  loading,
  data,
  onPick,
}: {
  title: string;
  loading: boolean;
  data: NearestResponse | null;
  onPick: (event: NearestEvent) => void;
}) {
  return (
    <>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-[#0f2a4a]">{title}</h2>
        {data && (
          <p className="text-xs text-slate-500 mt-0.5">
            {data.expanded
              ? `Expanded search — nearest events within ${data.radius_used_km} km`
              : `Within ${data.radius_used_km} km`}
          </p>
        )}
      </div>
      {loading && <p className="text-sm text-slate-500">Finding events near you…</p>}
      {!loading && data && data.events.length === 0 && (
        <p className="text-sm text-slate-600">
          No in-person events found nearby.{" "}
          <Link href="/events" className="text-blue-600 hover:underline font-semibold">Browse all events →</Link>
        </p>
      )}
      {!loading && data && data.events.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.events.map(ev => (
            <li key={ev.id} className="py-2">
              <button
                type="button"
                onClick={() => onPick(ev)}
                className="w-full flex items-center gap-3 text-left group"
              >
                <div className="w-[60px] h-[60px] shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  {ev.banner_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ev.banner_image_url}
                      alt=""
                      className={ev.banner_display_mode === "contain" ? "w-full h-full object-contain bg-white" : "w-full h-full object-cover"}
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0f2a4a] group-hover:text-[#4ea8de] line-clamp-1">{ev.title}</p>
                  {ev.organization && <p className="text-xs text-slate-500 line-clamp-1">{ev.organization}</p>}
                  <p className="text-xs text-slate-600 mt-0.5 inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    {fmtDate(ev.start_date)}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${distancePillClass(ev.distance_km)}`}>
                  {ev.distance_km} km
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
