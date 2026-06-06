import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  location_inferred: boolean | null;
  banner_image_url: string | null;
  banner_display_mode: "contain" | "cover" | null;
  sdg_goals: number[] | null;
  format: string | null;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, organization, start_date, end_date, location, location_inferred, banner_image_url, banner_display_mode, sdg_goals, format")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const row = data as EventRow;
  return NextResponse.json({
    id: row.id,
    title: row.title,
    organization: row.organization,
    start_date: row.start_date,
    end_date: row.end_date,
    location: row.location,
    location_inferred: !!row.location_inferred,
    banner_image_url: row.banner_image_url,
    banner_display_mode: row.banner_display_mode,
    sdg: row.sdg_goals?.[0] ?? null,
    format: row.format,
  });
}
