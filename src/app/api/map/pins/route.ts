import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIN_CAP = 2000;
const TEASER_CAP = 50;

interface PinRow {
  id: string;
  latitude: number | null;
  longitude: number | null;
  sdg_goals: number[] | null;
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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const bbox = parseBbox(sp.get("bbox"));
  const sdg = parseSdgList(sp.get("sdg"));
  const dateFrom = sp.get("date_from");
  const dateTo = sp.get("date_to");
  const teaser = sp.get("teaser") === "1";

  const today = new Date().toISOString();

  let query = adminSupabase
    .from("events")
    .select("id, latitude, longitude, sdg_goals")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .in("format", ["in_person", "hybrid"])
    .gte("start_date", dateFrom ?? today)
    .order("start_date", { ascending: true });

  if (dateTo) query = query.lte("start_date", dateTo);

  if (bbox) {
    query = query
      .gte("latitude", bbox.s)
      .lte("latitude", bbox.n);
    // Handle the +/-180 antimeridian: if w<=e, single range; otherwise two.
    if (bbox.w <= bbox.e) {
      query = query.gte("longitude", bbox.w).lte("longitude", bbox.e);
    } else {
      query = query.or(`longitude.gte.${bbox.w},longitude.lte.${bbox.e}`);
    }
  }

  if (sdg) {
    query = query.overlaps("sdg_goals", sdg);
  }

  const cap = teaser ? TEASER_CAP : PIN_CAP + 1;
  const { data, error } = await query.limit(cap);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as PinRow[];
  const sliced = teaser ? rows.slice(0, TEASER_CAP) : rows.slice(0, PIN_CAP);
  const pins = sliced
    .filter(r => r.latitude != null && r.longitude != null)
    .map(r => ({
      id: r.id,
      lat: r.latitude as number,
      lng: r.longitude as number,
      sdg: r.sdg_goals?.[0] ?? null,
    }));

  const truncated = !teaser && rows.length > PIN_CAP;

  return new NextResponse(
    JSON.stringify({ pins, count: pins.length, truncated }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=60, s-maxage=60",
      },
    }
  );
}
