"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L, { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { SDG_COLORS } from "@/lib/assets/sdgFallbacks";

export type ColorMode = "sdg" | "date" | "format";
export type ShowFilter = "all" | "this-week" | "this-month" | "featured";

export interface MapPin {
  id: string;
  /** Accessible name for the marker — Leaflet markers carry
   *  role="button" and need a name to pass aria-command-name. */
  title: string;
  lat: number;
  lng: number;
  sdg: number | null;
  color?: string;
}

export interface MapEventDetail {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  location_inferred?: boolean;
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

// Primary basemap: Stadia Maps. Light = "outdoors", dark = "alidade_smooth_dark".
//
// We started on osm_bright for its vivid blue ocean, but inspecting its
// style JSON showed a `boundary-water` line layer that bakes maritime /
// EEZ borders into the tiles. In the Pacific those follow lat/lng and
// read as a graticule across the ocean. `outdoors` uses the same
// OpenMapTiles vector source and the same hsl(210,60%,80%) blue water,
// but has no maritime boundary layer — clean oceans, same Google-Maps
// feel. `alidade_smooth_dark` (dark variant) was already clean: only
// boundary_state and boundary_country layers, no maritime line.
//
// `lang=en` asks OpenMapTiles to prefer the name:en label field when it
// exists; the rest of the dependency surface (key handling, CARTO
// fallback, theme swap) is identical to the previous version.
const STADIA_KEY =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_STADIA_API_KEY ?? "" : "";
const STADIA_ENABLED = STADIA_KEY.length > 0;
const STADIA_LIGHT = `https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}&lang=en`;
const STADIA_DARK = `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}&lang=en`;
const CARTO_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_SUBDOMAINS = ["a", "b", "c", "d"];
// Stadia ToS requires the Stadia + OpenMapTiles + OSM attribution together.
const STADIA_ATTRIBUTION =
  '&copy; <a href="https://www.stadiamaps.com/" target="_blank" rel="noopener noreferrer">Stadia Maps</a>' +
  ' &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>' +
  ' &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' +
  ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';
const WORLD_BOUNDS: L.LatLngBoundsLiteral = [[-90, -180], [90, 180]];
// ForaHub palette anchors for cluster bubbles + zoom controls.
const BRAND_ACCENT = "#4ea8de";
const BRAND_NAVY = "#0f2a4a";

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function pinColor(pin: MapPin): string {
  if (pin.color) return pin.color;
  if (pin.sdg && SDG_COLORS[pin.sdg]) return SDG_COLORS[pin.sdg];
  return BRAND_ACCENT;
}

// Custom SDG-tinted pin — small dot for the marker body plus a subtle white
// ring so the colour still reads against any basemap. No teardrop.
function buildPinIcon(pin: MapPin, isMobile: boolean): L.DivIcon {
  const color = pinColor(pin);
  const size = isMobile ? 16 : 14;
  const half = size / 2;
  const html =
    `<span class="forahub-pin-dot" style="` +
    `width:${size}px;height:${size}px;background:${color};` +
    `"></span>`;
  return L.divIcon({
    html,
    className: "forahub-event-pin",
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half - 2],
  });
}

// Brand cluster bubble. Size scales with magnitude; colour stays brand-blue
// in light mode, brand-accent in dark mode so it sits well on dark tiles.
// Outer halo + tighter inner ring read as a soft "stack of pins" rather than
// the default flat blob.
function buildClusterIcon(count: number, dark: boolean): L.DivIcon {
  let size: number;
  if (count < 10) size = 38;
  else if (count < 50) size = 46;
  else if (count < 200) size = 54;
  else size = 64;
  const fontSize = size <= 38 ? 12 : 13;
  const innerColor = dark ? BRAND_ACCENT : BRAND_NAVY;
  const haloColor = dark ? "rgba(78,168,222,0.18)" : "rgba(15,42,74,0.12)";
  const html =
    `<div class="forahub-cluster-halo" style="background:${haloColor};">` +
    `  <div class="forahub-cluster-body" style="` +
    `width:${size}px;height:${size}px;background:${innerColor};` +
    `font-size:${fontSize}px;` +
    `">${count.toLocaleString()}</div>` +
    `</div>`;
  return L.divIcon({
    html,
    className: "forahub-cluster",
    iconSize: [size + 12, size + 12],
    iconAnchor: [(size + 12) / 2, (size + 12) / 2],
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function buildPopupHtml(detail: MapEventDetail): string {
  const banner = detail.banner_image_url
    ? `<div class="forahub-popup-banner">
         <img src="${escapeAttr(detail.banner_image_url)}" alt=""
              style="object-fit:${detail.banner_display_mode === "contain" ? "contain" : "cover"};" />
       </div>`
    : `<div class="forahub-popup-banner forahub-popup-banner-fallback"></div>`;
  return `
    <div class="forahub-popup-card">
      ${banner}
      <div class="forahub-popup-body">
        <div class="forahub-popup-title">${escapeHtml(detail.title)}</div>
        ${detail.organization ? `<div class="forahub-popup-org">${escapeHtml(detail.organization)}</div>` : ""}
        <div class="forahub-popup-meta">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          ${fmtDate(detail.start_date)}${detail.end_date ? ` &ndash; ${fmtDate(detail.end_date)}` : ""}
        </div>
        ${detail.location ? `<div class="forahub-popup-meta">${escapeHtml(detail.location)}${detail.location_inferred ? ` <span class="forahub-popup-badge" title="City inferred from event title/organization — not a verified venue">approx.</span>` : ""}</div>` : ""}
        <a href="/events/${detail.id}" class="forahub-popup-cta">View event →</a>
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

interface PinsResponse {
  type: "pins";
  items: MapPin[];
  total: number;
  truncated?: boolean;
}

// `mode` is still on the props contract so HomeMapSection and the /map page
// don't need to be re-touched, but the client-side clusterer makes the same
// global fetch in both cases now — there's no zoom/bbox-aware fetch path.
export default function EventsMap({
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
  // We use a MarkerClusterGroup as the layer host. Adding/removing markers
  // through it is what gives us the animated zoom-split behaviour.
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
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

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams(filterQS);
    try {
      const res = await fetch(`/api/map/pins?${params.toString()}`);
      if (!res.ok) { setError("Map temporarily unavailable."); return; }
      const json = (await res.json()) as PinsResponse;
      setError(null);
      setEmptyAfterFilter(json.total === 0);
      drawPins(json.items);
      onPinsLoaded?.(json.items, json.total);
    } catch {
      setError("Map temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [filterQS, onPinsLoaded]);

  const fetchDataRef = useRef(fetchData);
  useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

  function drawPins(pins: MapPin[]) {
    const cluster = clusterRef.current;
    const map = mapRef.current;
    if (!cluster || !map) return;
    cluster.clearLayers();
    const mobile = window.matchMedia("(max-width: 640px)").matches;

    // Build all markers first, then add as a batch — markercluster does its
    // own bulk-load optimisation when given an array via addLayers().
    //
    // Accessibility note: each marker's icon element is rendered with
    // role="button" by Leaflet. Without an accessible name Lighthouse fails
    // aria-command-name and screen readers announce only "button". We set
    // the marker's `title` (Leaflet writes this to the icon element's
    // title attribute — also gives a hover tooltip) and, after the
    // element exists on the DOM, set `aria-label` directly so the
    // accessible name comes from a stable a11y attribute even when AT
    // doesn't fall back to `title`.
    const markers: L.Marker[] = [];
    for (const p of pins) {
      const marker = L.marker([p.lat, p.lng], {
        icon: buildPinIcon(p, mobile),
        title: p.title,
        alt: p.title,
        keyboard: true,
      });
      marker.on("add", () => {
        const el = marker.getElement();
        if (el) el.setAttribute("aria-label", p.title);
      });
      marker.on("click", async () => {
        const detail = await fetchEventDetail(p.id);
        if (detail) {
          marker.bindPopup(buildPopupHtml(detail), {
            maxWidth: 280, minWidth: 240,
            className: "forahub-event-popup",
            closeButton: true, autoPan: true,
          }).openPopup();
        }
      });
      markers.push(marker);
    }
    cluster.addLayers(markers);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    const mobile = window.matchMedia("(max-width: 640px)").matches;

    // World tiles are 256 * 2^Z CSS pixels per side (square). To kill the
    // gray bands at low zoom we need the rendered world to be at least as
    // big as the container in BOTH dimensions — width was enough on the
    // homepage card but /map's 70vh container can leave a vertical gap.
    function computeMinZoom(): number {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      const needWidth  = Math.ceil(Math.log2(w / 256));
      const needHeight = Math.ceil(Math.log2(h / 256));
      return Math.max(2, needWidth, needHeight);
    }

    const initialMinZoom = computeMinZoom();
    const map = L.map(container, {
      worldCopyJump: false,
      attributionControl: true,
      zoomControl: !mobile,
      scrollWheelZoom: true,
      minZoom: initialMinZoom,
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1.0,
    });

    if (initialBounds) {
      map.fitBounds(initialBounds);
    } else {
      map.setView([20, 0], initialMinZoom);
    }

    const buildTileLayer = () => {
      const dark = isDarkTheme();
      if (STADIA_ENABLED) {
        return L.tileLayer(dark ? STADIA_DARK : STADIA_LIGHT, {
          attribution: STADIA_ATTRIBUTION,
          maxZoom: 20,
          minZoom: 2,
          noWrap: true,
          bounds: WORLD_BOUNDS,
        });
      }
      // No Stadia key — fall back to CARTO Positron so the map still renders.
      return L.tileLayer(dark ? CARTO_DARK : CARTO_LIGHT, {
        attribution: CARTO_ATTRIBUTION,
        subdomains: CARTO_SUBDOMAINS,
        maxZoom: 19,
        minZoom: 2,
        noWrap: true,
        bounds: WORLD_BOUNDS,
      });
    };

    tileLayerRef.current = buildTileLayer().addTo(map);

    const themeObserver = typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => {
          const current = tileLayerRef.current;
          if (!current || !mapRef.current) return;
          map.removeLayer(current);
          tileLayerRef.current = buildTileLayer().addTo(map);
          // Rebuild cluster icons in the new theme too.
          if (clusterRef.current) clusterRef.current.refreshClusters();
        })
      : null;
    themeObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const cluster = L.markerClusterGroup({
      // chunkedLoading keeps the main thread responsive when adding ~5K
      // markers in one shot — adds them in batches of ~200 per frame.
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 25,
      // Show coverage shape on hover only at higher zooms — at world view it's
      // a screen-filling polygon for every continent and adds nothing.
      showCoverageOnHover: false,
      // Pixel radius at which markers cluster. Default is 80; tightened so
      // distinct cities don't collapse into mega-bubbles too aggressively.
      maxClusterRadius: 60,
      // Animations on, but spiderfy capped so a hundred-event venue doesn't
      // explode into spaghetti at max zoom — instead it stays a single
      // cluster the user must click to zoom into.
      spiderfyOnMaxZoom: true,
      animate: true,
      iconCreateFunction: (c) =>
        buildClusterIcon(c.getChildCount(), isDarkTheme()),
    });
    cluster.addTo(map);
    mapRef.current = map;
    clusterRef.current = cluster;

    // Belt-and-suspenders for "tiles don't fill the rectangle". Two things
    // can leave Leaflet thinking the container is smaller than it really is:
    //   1. The map mounts before its parent finished layout (e.g. when the
    //      IntersectionObserver fires mid-paint). One invalidateSize on the
    //      next frame catches that.
    //   2. The window — or the parent column — resizes after mount.
    //      ResizeObserver re-runs invalidateSize and recomputes minZoom so
    //      no new gray bands appear at the new width.
    // Two-pass invalidate: the rAF catches the post-mount layout, the timeout
    // catches the case where the parent's height value (e.g. "70vh") settles
    // a tick later. Cheap insurance against the "world doesn't fill height"
    // first-paint flash some browsers show.
    requestAnimationFrame(() => {
      map.invalidateSize();
      const z = computeMinZoom();
      if (z !== map.getMinZoom()) {
        map.setMinZoom(z);
        if (map.getZoom() < z) map.setZoom(z);
      }
    });
    setTimeout(() => {
      if (!mapRef.current) return;
      map.invalidateSize();
      const z = computeMinZoom();
      if (z !== map.getMinZoom()) {
        map.setMinZoom(z);
        if (map.getZoom() < z) map.setZoom(z);
      }
    }, 250);
    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          const newMin = computeMinZoom();
          if (newMin !== map.getMinZoom()) {
            map.setMinZoom(newMin);
            if (map.getZoom() < newMin) map.setZoom(newMin);
          }
          map.invalidateSize();
        })
      : null;
    resizeObserver?.observe(container);

    fetchDataRef.current();

    return () => {
      themeObserver?.disconnect();
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch on filter changes.
  useEffect(() => {
    if (!mapRef.current) return;
    fetchData();
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
      <div ref={containerRef} className="absolute inset-0 bg-slate-50 dark:bg-slate-900" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 pointer-events-none">
          <div className="animate-pulse text-xs text-slate-500 dark:text-slate-300">Loading map…</div>
        </div>
      )}
      {emptyAfterFilter && !loading && (
        <div className="absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-full px-4 py-2 shadow-md text-center">
          No events match this filter — adjust filters or{" "}
          <a href="/events" className="font-semibold text-blue-600 hover:underline">browse all events</a>.
        </div>
      )}
      {error && (
        <div className="absolute inset-x-0 bottom-3 mx-auto w-fit bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-full px-3 py-1.5 shadow-md flex items-center gap-2">
          {error}
          <button
            type="button"
            onClick={() => { setLoading(true); fetchData(); }}
            className="text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
