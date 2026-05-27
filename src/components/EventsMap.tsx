"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L, { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { SDG_COLORS } from "@/lib/assets/sdgFallbacks";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  sdg: number | null;
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

export interface EventsMapProps {
  mode: "teaser" | "full";
  height?: number | string;
  initialBounds?: LatLngBoundsExpression;
  initialFilters?: {
    sdg?: number[];
    dateFrom?: string | null;
    dateTo?: string | null;
  };
  onPinsLoaded?: (pins: MapPin[]) => void;
}

// CartoDB Positron — clean light basemap that integrates with white card UI.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_SUBDOMAINS = ["a", "b", "c", "d"];
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
const FETCH_DEBOUNCE_MS = 500;

const FORAHUB_BLUE = "#4ea8de";

function pinColor(sdg: number | null): string {
  if (sdg && SDG_COLORS[sdg]) return SDG_COLORS[sdg];
  return FORAHUB_BLUE;
}

function buildPinIcon(sdg: number | null, isMobile: boolean): L.DivIcon {
  const color = pinColor(sdg);
  const size = isMobile ? 18 : 14;
  const hoverSize = isMobile ? 22 : 18;
  const half = size / 2;
  const html = `
    <span class="forahub-pin-dot" style="
      display:block;width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:2px solid #ffffff;
      box-shadow:0 2px 4px rgba(0,0,0,0.15);
      transition:transform 120ms ease-out;
    "
    data-hover-size="${hoverSize}"
    ></span>`;
  return L.divIcon({
    html,
    className: "forahub-event-pin",
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half],
  });
}

function buildClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  let size: number;
  let label: string;
  if (count < 10) { size = 30; label = String(count); }
  else if (count < 50) { size = 36; label = String(count); }
  else { size = 44; label = String(count); }

  // Pick the dominant SDG among children for color.
  const counts = new Map<number, number>();
  cluster.getAllChildMarkers().forEach(m => {
    const sdg = (m as L.Marker & { __sdg?: number }).__sdg;
    if (sdg) counts.set(sdg, (counts.get(sdg) ?? 0) + 1);
  });
  let dominant: number | null = null;
  let max = 0;
  counts.forEach((c, sdg) => { if (c > max) { max = c; dominant = sdg; } });
  const bg = dominant ? pinColor(dominant) : "#0f2a4a";

  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;
      font-weight:600;font-size:${size <= 30 ? 12 : 13}px;
      border:2px solid #ffffff;
      box-shadow:0 4px 10px rgba(15,42,74,0.25);
    ">${label}</div>`;
  return L.divIcon({
    html,
    className: "forahub-cluster",
    iconSize: [size, size],
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildPopupHtml(detail: MapEventDetail): string {
  const banner = detail.banner_image_url
    ? `<div style="height:96px;overflow:hidden;background:#f1f5f9;">
         <img src="${escapeAttr(detail.banner_image_url)}" alt=""
              style="width:100%;height:100%;object-fit:${detail.banner_display_mode === "contain" ? "contain" : "cover"};" />
       </div>`
    : `<div style="height:64px;background:linear-gradient(135deg, ${pinColor(detail.sdg)}cc, ${pinColor(detail.sdg)}88);"></div>`;
  return `
    <div style="font-family:Inter,system-ui,sans-serif;width:240px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,42,74,0.12);">
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

export default function EventsMap({
  mode,
  height = 400,
  initialBounds,
  initialFilters,
  onPinsLoaded,
}: EventsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const filterQS = useMemo(() => {
    const params = new URLSearchParams();
    if (initialFilters?.sdg && initialFilters.sdg.length > 0) {
      params.set("sdg", initialFilters.sdg.join(","));
    }
    if (initialFilters?.dateFrom) params.set("date_from", initialFilters.dateFrom);
    if (initialFilters?.dateTo) params.set("date_to", initialFilters.dateTo);
    return params;
  }, [initialFilters]);

  const fetchPins = useCallback(async (bbox: L.LatLngBounds | null) => {
    const params = new URLSearchParams(filterQS);
    if (mode === "teaser") params.set("teaser", "1");
    if (bbox && mode === "full") {
      params.set("bbox", `${bbox.getWest()},${bbox.getSouth()},${bbox.getEast()},${bbox.getNorth()}`);
    }
    try {
      const res = await fetch(`/api/map/pins?${params.toString()}`);
      if (!res.ok) { setError("Map temporarily unavailable."); return; }
      const json = (await res.json()) as { pins: MapPin[] };
      setError(null);
      drawPins(json.pins);
      onPinsLoaded?.(json.pins);
    } catch {
      setError("Map temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [filterQS, mode, onPinsLoaded]);

  function drawPins(pins: MapPin[]) {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    for (const p of pins) {
      const marker = L.marker([p.lat, p.lng], { icon: buildPinIcon(p.sdg, mobile) }) as L.Marker & { __sdg?: number };
      if (p.sdg) marker.__sdg = p.sdg;
      marker.on("click", async () => {
        const detail = await fetchEventDetail(p.id);
        if (detail) {
          marker.bindPopup(buildPopupHtml(detail), {
            maxWidth: 260,
            minWidth: 240,
            className: "forahub-event-popup",
            closeButton: true,
            autoPan: true,
          }).openPopup();
        }
      });
      cluster.addLayer(marker);
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    setIsMobile(mobile);

    const map = L.map(containerRef.current, {
      worldCopyJump: true,
      attributionControl: true,
      zoomControl: !mobile, // hide +/- controls on mobile for a cleaner look
      scrollWheelZoom: true,
    });

    if (initialBounds) {
      map.fitBounds(initialBounds);
    } else {
      map.setView([20, 0], mobile ? 1 : 2);
    }

    L.tileLayer(TILE_URL, {
      attribution: ATTRIBUTION,
      subdomains: TILE_SUBDOMAINS,
      maxZoom: 19,
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      iconCreateFunction: buildClusterIcon,
    });
    map.addLayer(cluster);

    mapRef.current = map;
    clusterRef.current = cluster;

    const onMoveEnd = () => {
      if (mode !== "full") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchPins(map.getBounds()), FETCH_DEBOUNCE_MS);
    };
    map.on("moveend", onMoveEnd);

    fetchPins(mode === "full" ? map.getBounds() : null);

    return () => {
      map.off("moveend", onMoveEnd);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    fetchPins(mode === "full" ? map.getBounds() : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterQS]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 bg-slate-50" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 pointer-events-none">
          <div className="animate-pulse text-xs text-slate-500">Loading map…</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-3 mx-auto w-fit bg-white border border-red-200 text-red-700 text-xs rounded-full px-3 py-1.5 shadow-md flex items-center gap-2">
          {error}
          <button
            type="button"
            onClick={() => { setLoading(true); fetchPins(mapRef.current?.getBounds() ?? null); }}
            className="text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
      {/* Mobile-only hint that pins are larger */}
      {isMobile && mode === "teaser" && (
        <span className="sr-only">Touch any pin to view event details</span>
      )}
    </div>
  );
}
