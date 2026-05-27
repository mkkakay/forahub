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
  /** Notifies the parent when the viewport changes — used by /map to update
   *  the "events visible in viewport" list. */
  onPinsLoaded?: (pins: MapPin[]) => void;
}

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const DEFAULT_HEIGHT = 320;
const FETCH_DEBOUNCE_MS = 500;

function pinColor(sdg: number | null): string {
  if (sdg && SDG_COLORS[sdg]) return SDG_COLORS[sdg];
  return "#4ea8de";
}

function buildPinIcon(sdg: number | null): L.DivIcon {
  const color = pinColor(sdg);
  const html = `
    <span style="
      display:inline-block;width:20px;height:20px;border-radius:9999px;
      background:${color};border:2px solid #ffffff;
      box-shadow:0 1px 4px rgba(0,0,0,0.45);
    "></span>`;
  return L.divIcon({
    html,
    className: "forahub-event-pin",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
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
    ? `<div style="height:96px;overflow:hidden;border-radius:8px 8px 0 0;margin:-8px -10px 8px -10px;background:#0f2a4a;">
         <img src="${detail.banner_image_url}" alt="" style="width:100%;height:100%;object-fit:${detail.banner_display_mode === "contain" ? "contain" : "cover"};" />
       </div>`
    : "";
  const sdgPill = detail.sdg
    ? `<span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 6px;border-radius:9999px;background:${pinColor(detail.sdg)}1a;color:${pinColor(detail.sdg)};">SDG ${detail.sdg}</span>`
    : "";
  return `
    <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;max-width:240px;">
      ${banner}
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">${sdgPill}</div>
      <a href="/events/${detail.id}"
         style="display:block;color:#0f2a4a;font-weight:600;font-size:13px;line-height:1.3;text-decoration:none;margin-bottom:6px;">${escapeHtml(detail.title)}</a>
      <div style="font-size:11px;color:#6b7280;line-height:1.4;">
        ${detail.organization ? `<div>${escapeHtml(detail.organization)}</div>` : ""}
        <div>${fmtDate(detail.start_date)}${detail.end_date ? ` – ${fmtDate(detail.end_date)}` : ""}</div>
        ${detail.location ? `<div>${escapeHtml(detail.location)}</div>` : ""}
      </div>
      <a href="/events/${detail.id}"
         style="display:inline-block;margin-top:8px;font-size:11px;font-weight:600;color:#4ea8de;text-decoration:none;">View event →</a>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>
  )[c]);
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
  height = DEFAULT_HEIGHT,
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
      params.set(
        "bbox",
        `${bbox.getWest()},${bbox.getSouth()},${bbox.getEast()},${bbox.getNorth()}`
      );
    }
    try {
      const res = await fetch(`/api/map/pins?${params.toString()}`);
      if (!res.ok) {
        setError("Map temporarily unavailable.");
        return;
      }
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
    for (const p of pins) {
      const marker = L.marker([p.lat, p.lng], { icon: buildPinIcon(p.sdg) });
      marker.on("click", async () => {
        const detail = await fetchEventDetail(p.id);
        if (detail) {
          marker.bindPopup(buildPopupHtml(detail), {
            maxWidth: 260,
            className: "forahub-event-popup",
          }).openPopup();
        }
      });
      cluster.addLayer(marker);
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      worldCopyJump: true,
      attributionControl: true,
      zoomControl: true,
    });

    if (initialBounds) {
      map.fitBounds(initialBounds);
    } else {
      map.setView([20, 0], mode === "teaser" ? 1 : 2);
    }

    L.tileLayer(TILE_URL, {
      attribution: ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
    });
    map.addLayer(cluster);

    mapRef.current = map;
    clusterRef.current = cluster;

    const onMoveEnd = () => {
      if (mode !== "full") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchPins(map.getBounds());
      }, FETCH_DEBOUNCE_MS);
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

  // Re-fetch when filter inputs change (only meaningful in full mode).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    fetchPins(mode === "full" ? map.getBounds() : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterQS]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 pointer-events-none">
          <div className="animate-pulse text-xs text-gray-500">Loading map…</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-3 mx-auto w-fit bg-white border border-red-200 text-red-700 text-xs rounded-full px-3 py-1.5 shadow-md flex items-center gap-2">
          {error}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchPins(mapRef.current?.getBounds() ?? null);
            }}
            className="text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
