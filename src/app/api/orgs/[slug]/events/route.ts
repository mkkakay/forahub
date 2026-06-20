// GET /api/orgs/[slug]/events
//   List events attributed to this org for the manage-page Events panel.
//   Restricted to verified managers of the org.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: { slug: string } }) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "signin_required" }, { status: 401 });
  if (!(await isOrgManager(ctx.params.slug, user.id))) {
    return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  }

  const { data, error } = await adminSupabase
    .from("events")
    .select("id, title, start_date, end_date, location, format, status, submission_status, source_type, submission_source, auto_published_at, needs_recheck, needs_recheck_at, needs_recheck_reason, submitted_at, created_at")
    .eq("org_slug", ctx.params.slug)
    .order("start_date", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data ?? [] });
}
