"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L, { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { SDG_COLORS } from "@/lib/assets/sdgFallbacks";

export type ColorMode = "sdg" | "date" | "format";
export type ShowFilter = "all" | "this-week" | "this-month" | "featured";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  sdg: number | null;
  color?: string;
}

export interface MapCluster {
  type: "cluster";
  key: string;
  name: string | null;
  lat: number;
  lng: number;
  count: number;
}

export interface MapEventDetail {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  banner_image_url: string | null;
  banner_display_mode: "contain" | "cover" | null;
  sdg: number | null;
  format: string | null;
}

export interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
  /** Bump this to re-fire the flyTo effect even with the same coords. */
  nonce: number;
}

export interface EventsMapProps {
  mode: "teaser" | "full";
  height?: number | string;
  initialBounds?: LatLngBoundsExpression;
  initialFilters?: {
    sdg?: number[];
    category?: string[];
    dateFrom?: string | null;
    dateTo?: string | null;
  };
  showFilter?: ShowFilter;
  colorBy?: ColorMode;
  flyToTarget?: FlyToTarget;
  onPinsLoaded?: (pins: MapPin[], total: number) => void;
}

// Label-free CartoDB Positron — our own cluster labels (Africa · 25, etc.)
// sit on top and provide the geographic context.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";
const TILE_SUBDOMAINS = ["a", "b", "c", "d"];
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
// Single-world bounds so the map doesn't repeat the globe horizontally.
const WORLD_BOUNDS: L.LatLngBoundsLiteral = [[-90, -180], [90, 180]];
const FORAHUB_BLUE = "#2563eb";

function pinColor(pin: MapPin): string {
  if (pin.color) return pin.color;
  if (pin.sdg && SDG_COLORS[pin.sdg]) return SDG_COLORS[pin.sdg];
  return "#4ea8de";
}

function buildPinIcon(pin: MapPin, isMobile: boolean): L.DivIcon {
  const color = pinColor(pin);
  const size = isMobile ? 18 : 14;
  const half = size / 2;
  const html = `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.15);transition:transform 120ms ease-out;"></span>`;
  return L.divIcon({
    html,
    className: "forahub-event-pin",
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half],
  });
}

function buildClusterIcon(cluster: MapCluster, level: "continent" | "country" | "city"): L.DivIcon {
  const count = cluster.count;
  let size: number;
  if (count < 10) size = 40;
  else if (count < 50) size = 48;
  else size = 60;
  const fontSize = size <= 40 ? 12 : 13;
  const label = level === "continent" && cluster.name
    ? `<div style="font-size:${fontSize - 2}px;font-weight:500;line-height:1.1;opacity:.95;">${escapeHtml(cluster.name)}</div><div style="font-weight:700;font-size:${fontSize}px;">${count.toLocaleString()}</div>`
    : `<div style="font-weight:700;font-size:${fontSize + 1}px;">${count.toLocaleString()}</div>`;
  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${FORAHUB_BLUE};color:#fff;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      border:2px solid #ffffff;
      box-shadow:0 6px 14px rgba(15,42,74,0.28);
      padding:0 4px;text-align:center;line-height:1.1;
    ">${label}</div>`;
  return L.divIcon({
    html,
    className: "forahub-cluster",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function buildPopupHtml(detail: MapEventDetail): string {
  const banner = detail.banner_image_url
    ? `<div style="height:96px;overflow:hidden;background:#f1f5f9;">
         <img src="${escapeAttr(detail.banner_image_url)}" alt=""
              style="width:100%;height:100%;object-fit:${detail.banner_display_mode === "contain" ? "contain" : "cover"};" />
       </div>`
    : `<div style="height:64px;background:linear-gradient(135deg, #2563eb 0%, #4ea8de 100%);"></div>`;
  return `
    <div style="font-family:Inter,system-ui,sans-serif;width:240px;background:#ffffff;border-radius:16px;overflow:hidden;">
      ${banner}
      <div style="padding:12px;">
        <div style="font-weight:600;font-size:13px;line-height:1.35;color:#0f2a4a;">${escapeHtml(detail.title)}</div>
        ${detail.organization ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${escapeHtml(detail.organization)}</div>` : ""}
        <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:#475569;margin-top:6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          ${fmtDate(detail.start_date)}${detail.end_date ? ` &ndash; ${fmtDate(detail.end_date)}` : ""}
        </div>
        ${detail.location ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${escapeHtml(detail.location)}</div>` : ""}
        <a href="/events/${detail.id}" style="display:inline-block;margin-top:10px;font-size:12px;font-weight:600;color:#2563eb;text-decoration:none;">View event →</a>
      </div>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]);
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/&(?!(amp|lt|gt|quot|#39);)/g, "&amp;");
}

const detailCache = new Map<string, MapEventDetail>();
async function fetchEventDetail(id: string): Promise<MapEventDetail | null> {
  const cached = detailCache.get(id);
  if (cached) return cached;
  try {
    const res = await fetch(`/api/map/event/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as MapEventDetail;
    detailCache.set(id, data);
    return data;
  } catch {
    return null;
  }
}

interface AggregatedResponse {
  type: "aggregated";
  level: "continent" | "country" | "city";
  items: MapCluster[];
  total: number;
}
interface PinsResponse {
  type: "pins";
  level: "pin";
  items: MapPin[];
  total: number;
  truncated?: boolean;
}
type PinsApiResponse = AggregatedResponse | PinsResponse;

export default function EventsMap({
  mode,
  height = 400,
  initialBounds,
  initialFilters,
  showFilter = "all",
  colorBy = "sdg",
  flyToTarget,
  onPinsLoaded,
}: EventsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emptyAfterFilter, setEmptyAfterFilter] = useState(false);

  const filterQS = useMemo(() => {
    const params = new URLSearchParams();
    if (initialFilters?.sdg && initialFilters.sdg.length > 0) {
      params.set("sdg", initialFilters.sdg.join(","));
    }
    if (initialFilters?.category && initialFilters.category.length > 0) {
      params.set("category", initialFilters.category.join(","));
    }
    if (initialFilters?.dateFrom) params.set("date_from", initialFilters.dateFrom);
    if (initialFilters?.dateTo) params.set("date_to", initialFilters.dateTo);

    // Convert showFilter into date_from/date_to/featured params.
    const now = new Date();
    if (showFilter === "this-week") {
      const to = new Date(now.getTime() + 7 * 86_400_000);
      params.set("date_to", to.toISOString());
    } else if (showFilter === "this-month") {
      const to = new Date(now.getTime() + 30 * 86_400_000);
      params.set("date_to", to.toISOString());
    } else if (showFilter === "featured") {
      params.set("featured", "true");
    }

    if (colorBy && colorBy !== "sdg") params.set("color_by", colorBy);

    return params;
  }, [initialFilters, showFilter, colorBy]);

  const fetchData = useCallback(async (map: L.Map | null) => {
    const params = new URLSearchParams(filterQS);
    if (mode === "teaser") params.set("teaser", "1");
    if (mode === "full" && map) {
      const b = map.getBounds();
      params.set("bbox", `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`);
      params.set("zoom", String(map.getZoom()));
    }
    try {
      const res = await fetch(`/api/map/pins?${params.toString()}`);
      if (!res.ok) { setError("Map temporarily unavailable."); return; }
      const json = (await res.json()) as PinsApiResponse;
      setError(null);
      setEmptyAfterFilter(json.total === 0);
      drawData(json);
      if (json.type === "pins") onPinsLoaded?.(json.items, json.total);
      else onPinsLoaded?.([], json.total);
    } catch {
      setError("Map temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [filterQS, mode, onPinsLoaded]);

  // Hold fetchData in a ref so the moveend / zoomend / cluster-click handlers
  // (registered once on mount) always invoke the current version with fresh
  // filterQS + onPinsLoaded closure rather than the stale initial one.
  const fetchDataRef = useRef(fetchData);
  useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

  function drawData(payload: PinsApiResponse) {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const mobile = window.matchMedia("(max-width: 640px)").matches;

    if (payload.type === "pins") {
      for (const p of payload.items) {
        const marker = L.marker([p.lat, p.lng], { icon: buildPinIcon(p, mobile) });
        marker.on("click", async () => {
          const detail = await fetchEventDetail(p.id);
          if (detail) {
            marker.bindPopup(buildPopupHtml(detail), {
              maxWidth: 260, minWidth: 240,
              className: "forahub-event-popup",
              closeButton: true, autoPan: true,
            }).openPopup();
          }
        });
        layer.addLayer(marker);
      }
      return;
    }

    // Aggregated clusters — clicking zooms in toward the cluster center and
    // explicitly schedules a refetch so the next granularity level renders
    // even when the moveend/zoomend chain is unreliable.
    for (const c of payload.items) {
      const marker = L.marker([c.lat, c.lng], { icon: buildClusterIcon(c, payload.level) });
      marker.on("click", () => {
        const currentZoom = map.getZoom();
        const targetZoom = payload.level === "continent" ? 4 : payload.level === "country" ? 7 : 11;
        const newZoom = Math.max(currentZoom + 2, targetZoom);
        map.flyTo([c.lat, c.lng], newZoom, { duration: 0.6 });
        // Belt-and-suspenders: 700 ms after flyTo (just past the 600 ms
        // animation), refetch with the new bounds + zoom directly. Avoids
        // depending on Leaflet emitting moveend at the exact end of flyTo.
        setTimeout(() => fetchDataRef.current(map), 700);
      });
      layer.addLayer(marker);
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const mobile = window.matchMedia("(max-width: 640px)").matches;

    const map = L.map(containerRef.current, {
      worldCopyJump: false,
      attributionControl: true,
      zoomControl: !mobile,
      scrollWheelZoom: true,
      minZoom: 2,
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1.0,
    });

    if (initialBounds) {
      map.fitBounds(initialBounds);
    } else {
      map.setView([20, 0], mobile ? 2 : 2);
    }

    L.tileLayer(TILE_URL, {
      attribution: ATTRIBUTION,
      subdomains: TILE_SUBDOMAINS,
      maxZoom: 19,
      minZoom: 2,
      noWrap: true,
      bounds: WORLD_BOUNDS,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    const onViewEnd = () => {
      if (mode !== "full") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // 250 ms debounce — snappier than 400 ms while still coalescing pan +
      // zoom into a single refetch.
      debounceRef.current = setTimeout(() => fetchDataRef.current(map), 250);
    };
    map.on("moveend", onViewEnd);
    map.on("zoomend", onViewEnd);

    fetchDataRef.current(mode === "full" ? map : null);

    return () => {
      map.off("moveend", onViewEnd);
      map.off("zoomend", onViewEnd);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch on filter changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    fetchData(mode === "full" ? map : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterQS]);

  // Imperative flyTo when the parent bumps the nonce.
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    const z = flyToTarget.zoom ?? 9;
    mapRef.current.flyTo([flyToTarget.lat, flyToTarget.lng], z, { duration: 0.8 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToTarget?.nonce]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 bg-slate-50" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 pointer-events-none">
          <div className="animate-pulse text-xs text-slate-500">Loading map…</div>
        </div>
      )}
      {emptyAfterFilter && !loading && (
        <div className="absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] bg-white border border-slate-200 text-slate-700 text-xs rounded-full px-4 py-2 shadow-md text-center">
          No events match this filter — adjust filters or{" "}
          <a href="/events" className="font-semibold text-blue-600 hover:underline">browse all events</a>.
        </div>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-3 mx-auto w-fit bg-white border border-red-200 text-red-700 text-xs rounded-full px-3 py-1.5 shadow-md flex items-center gap-2">
          {error}
          <button
            type="button"
            onClick={() => { setLoading(true); fetchData(mapRef.current); }}
            className="text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
