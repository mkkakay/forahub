// Map pins API — returns individual event coordinates for client-side
// clustering with leaflet.markercluster. Previously this endpoint did
// server-side hierarchical aggregation (continent → country grid → city grid
// → pins) keyed by a zoom parameter, but the homepage teaser forced
// zoom=DEFAULT_TEASER_ZOOM=2 on every request and the visible "Africa 39 /
// Asia 28" continent bubbles never split on zoom-in. Switching to raw pins
// + a client-side cluster plugin makes zoom actually change what's shown,
// matches the project's ~5,000-event target, and folds the teaser and the
// /map page onto a single, simpler code path.
//
// Response shape (one variant now):
//   { type: 'pins', items: PinItem[], total: number, truncated: boolean }

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { parseCategoryList } from "@/lib/categories";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard cap on returned pins. 5,000 keeps the JSON payload around ~150 KB
// gzipped (id + lat + lng + sdg only) and keeps marker creation under ~100 ms
// even on lower-end mobile. Bump if the dataset grows past this scale.
const PIN_CAP = 5000;

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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const bbox = parseBbox(sp.get("bbox"));
  const sdg = parseSdgList(sp.get("sdg"));
  const category = parseCategoryList(sp.get("category"));
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  // teaser and zoom are accepted for backwards compatibility with cached
  // client bundles, but they no longer change the response — the client
  // now clusters every pin regardless of viewport.
  const featuredOnly = sp.get("featured") === "true";
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
  if (category) {
    const orParts = [
      `category.in.(${category.join(",")})`,
      ...category.map(c => `category_secondary.cs.{${c}}`),
    ];
    query = query.or(orParts.join(","));
  }

  // Bbox is now a polish-only optimisation for the /map page: when the user
  // pans far in we only fetch what's inside the viewport (plus a generous
  // halo handled by the client). The teaser fetches global.
  if (bbox) {
    query = query.gte("latitude", bbox.s).lte("latitude", bbox.n);
    if (bbox.w <= bbox.e) {
      query = query.gte("longitude", bbox.w).lte("longitude", bbox.e);
    } else {
      query = query.or(`longitude.gte.${bbox.w},longitude.lte.${bbox.e}`);
    }
  }

  const { data, error } = await query.limit(PIN_CAP + 1);
  if (error) return sanitizeApiError(error, "map/pins", 500);

  const rows = ((data ?? []) as PinRow[]).filter(r => r.latitude != null && r.longitude != null);
  const now = new Date();

  const capped = rows.slice(0, PIN_CAP);
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

  return new NextResponse(
    JSON.stringify({
      type: "pins",
      items,
      total: rows.length,
      truncated: rows.length > PIN_CAP,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60, s-maxage=60",
      },
    },
  );
}
