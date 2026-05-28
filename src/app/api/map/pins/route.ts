// Map pins API — zoom-aware aggregation.
//
// Response shape:
//   {
//     type:  'aggregated' | 'pins',
//     level: 'continent' | 'country' | 'city' | 'pin',
//     items: ClusterItem[] | PinItem[],
//     total: number   // total events matched (after filters)
//   }
//
// ClusterItem: { type:'cluster', key, name|null, lat, lng, count }
// PinItem:     { type:'pin', id, lat, lng, sdg, color? }
//
// At any zoom level the response is bounded — aggregated buckets cap below
// ~50 items so payload stays small regardless of database size.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { getContinentFromLatLng, CONTINENT_CENTROIDS, type Continent } from "@/lib/geo/continents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIN_CAP = 2000;
const TEASER_CAP = 50;

type ColorMode = "sdg" | "date" | "format";

interface PinRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
  sdg_goals: number[] | null;
  start_date: string;
  format: string | null;
}

function parseBbox(value: string | null): { w: number; s: number; e: number; n: number } | null {
  if (!value) return null;
  const parts = value.split(",").map(p => Number(p.trim()));
  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) return null;
  const [w, s, e, n] = parts;
  if (s < -90 || s > 90 || n < -90 || n > 90) return null;
  if (w < -360 || w > 360 || e < -360 || e > 360) return null;
  return { w, s, e, n };
}

function parseSdgList(value: string | null): number[] | null {
  if (!value) return null;
  const nums = value
    .split(",")
    .map(s => Number(s.trim()))
    .filter(n => Number.isInteger(n) && n >= 1 && n <= 17);
  return nums.length > 0 ? nums : null;
}

function colorForPin(row: PinRow, mode: ColorMode, now: Date): string | undefined {
  if (mode === "sdg") return undefined; // client uses SDG palette
  if (mode === "date") {
    const start = new Date(row.start_date);
    const days = (start.getTime() - now.getTime()) / 86_400_000;
    if (days <= 7) return "#dc2626";       // red-600 urgent
    if (days <= 30) return "#f97316";      // orange-500
    if (days <= 90) return "#eab308";      // yellow-500
    return "#60a5fa";                       // blue-400
  }
  if (mode === "format") {
    if (row.format === "in_person") return "#16a34a"; // green-600
    if (row.format === "hybrid") return "#9333ea";    // purple-600
    return "#94a3b8";
  }
  return undefined;
}

function gridKey(lat: number, lng: number, cellDeg: number): string {
  const yi = Math.floor(lat / cellDeg);
  const xi = Math.floor(lng / cellDeg);
  return `${yi}_${xi}`;
}

function levelForZoom(zoom: number): { level: "continent" | "country" | "city" | "pin"; cellDeg: number } {
  if (zoom <= 3) return { level: "continent", cellDeg: 0 };
  // Tighter grids so distinct cities don't collapse into one bubble at moderate zoom.
  if (zoom <= 5) return { level: "country", cellDeg: 4 };
  if (zoom <= 9) return { level: "city", cellDeg: 1 };
  return { level: "pin", cellDeg: 0 };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const bbox = parseBbox(sp.get("bbox"));
  const sdg = parseSdgList(sp.get("sdg"));
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const teaser = sp.get("teaser") === "1";
  const featuredOnly = sp.get("featured") === "true";
  const zoom = Number(sp.get("zoom") ?? "10");
  const colorMode = (sp.get("color_by") === "date" || sp.get("color_by") === "format")
    ? (sp.get("color_by") as ColorMode)
    : ("sdg" as ColorMode);

  const today = new Date().toISOString();

  let query = adminSupabase
    .from("events")
    .select("id, latitude, longitude, sdg_goals, start_date, format")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .in("format", ["in_person", "hybrid"])
    .gte("start_date", dateFrom ?? today)
    .order("start_date", { ascending: true });

  if (dateTo) query = query.lte("start_date", dateTo);
  if (sdg) query = query.overlaps("sdg_goals", sdg);
  if (featuredOnly) query = query.eq("is_featured", true);

  if (bbox && !teaser) {
    query = query.gte("latitude", bbox.s).lte("latitude", bbox.n);
    if (bbox.w <= bbox.e) {
      query = query.gte("longitude", bbox.w).lte("longitude", bbox.e);
    } else {
      query = query.or(`longitude.gte.${bbox.w},longitude.lte.${bbox.e}`);
    }
  }

  const { level, cellDeg } = teaser
    ? { level: "pin" as const, cellDeg: 0 }
    : levelForZoom(zoom);

  // Cap server-side fetch so we never pull more than we need. Aggregation can
  // still produce small response sets even from huge underlying sets.
  const fetchCap = teaser ? TEASER_CAP : level === "pin" ? PIN_CAP + 1 : 10_000;
  const { data, error } = await query.limit(fetchCap);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data ?? []) as PinRow[]).filter(r => r.latitude != null && r.longitude != null);
  const now = new Date();

  if (level === "pin" || teaser) {
    const capped = rows.slice(0, teaser ? TEASER_CAP : PIN_CAP);
    const items = capped.map(r => {
      const color = colorForPin(r, colorMode, now);
      return {
        type: "pin" as const,
        id: r.id,
        lat: r.latitude as number,
        lng: r.longitude as number,
        sdg: r.sdg_goals?.[0] ?? null,
        ...(color ? { color } : {}),
      };
    });
    return jsonOk({
      type: "pins",
      level: "pin",
      items,
      total: rows.length,
      truncated: !teaser && rows.length > PIN_CAP,
    });
  }

  // Continent aggregation — bubbles anchored at the continent's geographic
  // centroid (NOT the event-mass centroid). Event-weighted centroids made the
  // Africa bubble sit on Kenya, which read as "everything is in Kenya".
  if (level === "continent") {
    const counts = new Map<Continent, number>();
    for (const r of rows) {
      const cont = getContinentFromLatLng(r.latitude!, r.longitude!);
      counts.set(cont, (counts.get(cont) ?? 0) + 1);
    }
    const items = Array.from(counts.entries()).map(([cont, count]) => {
      const [lat, lng] = CONTINENT_CENTROIDS[cont].centroid;
      return {
        type: "cluster" as const,
        key: `cont:${cont}`,
        name: cont,
        lat,
        lng,
        count,
      };
    });
    return jsonOk({ type: "aggregated", level: "continent", items, total: rows.length });
  }

  // Grid aggregation (country / city)
  const cells = new Map<string, { sumLat: number; sumLng: number; count: number }>();
  for (const r of rows) {
    const key = gridKey(r.latitude!, r.longitude!, cellDeg);
    const c = cells.get(key);
    if (c) {
      c.count += 1;
      c.sumLat += r.latitude!;
      c.sumLng += r.longitude!;
    } else {
      cells.set(key, { count: 1, sumLat: r.latitude!, sumLng: r.longitude! });
    }
  }
  const aggItems = Array.from(cells.entries()).map(([key, c]) => ({
    type: "cluster" as const,
    key,
    name: null,
    lat: c.sumLat / c.count,
    lng: c.sumLng / c.count,
    count: c.count,
  }));
  // Aggregated payloads are already small; cap as safety.
  const items = aggItems.slice(0, 200);
  return jsonOk({ type: "aggregated", level, items, total: rows.length });
}

function jsonOk(payload: unknown) {
  return new NextResponse(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });
}
