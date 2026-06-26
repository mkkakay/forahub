// DELETE /api/orgs/[slug]/team/managers/[id]
//
// Per-org manager removal. Distinct from the admin endpoint at
// /api/admin/managers which uses ADMIN_SECRET and can remove anyone — this
// route is user-facing and enforces:
//
//   1. The caller must be a verified manager of the SAME org (server-side
//      isOrgManager check, not just the UI).
//   2. The org can never reach zero managers (last seat is locked).
//   3. The founder seat (lowest added_at for the org) is locked from
//      everyone except admins (who use the admin endpoint, not this one).
//
// Otherwise, a manager can remove peers AND remove themselves (subject to
// the two locks above).

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, ctx: { params: { slug: string; id: string } }) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "signin_required" }, { status: 401 });
  if (!(await isOrgManager(ctx.params.slug, user.id))) {
    return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  }

  // Pull every seat for the org in chronological order. The first row is
  // the founder; the count gives us the last-manager guard. One query.
  const { data: seatRows, error: seatErr } = await adminSupabase
    .from("org_managers")
    .select("id, user_id, email, added_at")
    .eq("org_slug", ctx.params.slug)
    .order("added_at", { ascending: true });
  if (seatErr) return sanitizeApiError(seatErr, "orgs/:slug/team/managers/:id", 500);
  const seats = (seatRows as Array<{ id: string; user_id: string; email: string; added_at: string }>) ?? [];
  if (seats.length === 0) {
    return NextResponse.json({ error: "manager_not_found" }, { status: 404 });
  }

  const target = seats.find(s => s.id === ctx.params.id);
  if (!target) return NextResponse.json({ error: "manager_not_found" }, { status: 404 });

  // Last-manager guard. Always enforced — even on self-removal.
  if (seats.length === 1) {
    return NextResponse.json({ error: "last_manager" }, { status: 409 });
  }

  // Founder protection. The founder is the earliest seat. Admins use the
  // separate /api/admin/managers DELETE endpoint to override this.
  const founder = seats[0];
  if (target.id === founder.id) {
    return NextResponse.json({ error: "founder_protected" }, { status: 409 });
  }

  const { error: delErr } = await adminSupabase
    .from("org_managers")
    .delete()
    .eq("id", target.id);
  if (delErr) return sanitizeApiError(delErr, "orgs/:slug/team/managers/:id", 500);

  return NextResponse.json({
    success: true,
    removed_self: target.user_id === user.id,
  });
}
