// POST /api/series/preview
//   Body: { rrule, start_time_local, until_date?, occurrence_count?, count? }
//   Returns the next N occurrence dates without touching the DB. Used by
//   the SeriesBuilder UI to preview before saving. Public read; no auth
//   gate because RRule math is pure compute.

import { NextRequest, NextResponse } from "next/server";
import { previewNextDates } from "@/lib/series/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: {
    rrule?: string;
    start_time_local?: string;
    until_date?: string | null;
    occurrence_count?: number | null;
    count?: number;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const rrule = (body.rrule ?? "").trim();
  const startTime = (body.start_time_local ?? "09:00:00").trim();
  if (!rrule) return NextResponse.json({ error: "rrule_required" }, { status: 400 });

  const count = Math.min(Math.max(1, body.count ?? 5), 20);

  const preview = previewNextDates({
    rrule,
    start_time_local: startTime,
    until_date: body.until_date ?? null,
    occurrence_count: body.occurrence_count ?? null,
    count,
  });

  if (preview.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "rrule_unparseable",
      preview: [],
    });
  }
  return NextResponse.json({ ok: true, preview });
}
