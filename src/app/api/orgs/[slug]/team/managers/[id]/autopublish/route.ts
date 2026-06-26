// PATCH /api/orgs/[slug]/team/managers/[id]/autopublish
//   Body: { can_autopublish: boolean }
//
// Grants (or revokes) instant-publish privilege for an invited/admin-reviewed
// manager. The caller must themselves be a domain-verified manager of the
// same org — i.e. the trust comes from someone whose work-email is on the
// org's domain. This is checked server-side, not just hidden in the UI.
//
// Domain-verified seats can never have this toggled (they always autopublish
// by virtue of added_via). Attempts to flip the flag on those seats are a
// no-op success — the rule lives in lib/orgs/managers.ts:effectiveAutoPublish.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isDomainVerified, isOrgManager } from "@/lib/orgs/managers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SeatRow {
  id: string;
  org_slug: string;
  user_id: string;
  added_via: string | null;
  can_autopublish: boolean;
}

export async function PATCH(req: NextRequest, ctx: { params: { slug: string; id: string } }) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "signin_required" }, { status: 401 });

  // Explicit gate: must be a manager of THIS org before we touch any seat.
  // The deeper "must be domain-verified" check still runs below; this is
  // belt-and-suspenders so non-managers can't probe the seat list.
  if (!(await isOrgManager(ctx.params.slug, user.id))) {
    return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  }

  let body: { can_autopublish?: unknown };
  try { body = await req.json(); } catch { body = {}; }
  const desired = body.can_autopublish === true ? true : body.can_autopublish === false ? false : null;
  if (desired === null) {
    return NextResponse.json({ error: "can_autopublish_required" }, { status: 400 });
  }

  // Load BOTH the caller's seat and the target seat in one round-trip so
  // we authorize against the same snapshot we mutate. Caller must be a
  // domain-verified manager of THIS org.
  const { data: seats, error: seatsErr } = await adminSupabase
    .from("org_managers")
    .select("id, org_slug, user_id, added_via, can_autopublish")
    .eq("org_slug", ctx.params.slug);
  if (seatsErr) return NextResponse.json({ error: seatsErr.message }, { status: 500 });
  const rows = (seats as SeatRow[]) ?? [];

  const caller = rows.find(s => s.user_id === user.id);
  if (!caller) return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  if (!isDomainVerified(caller.added_via)) {
    return NextResponse.json({ error: "not_domain_verified" }, { status: 403 });
  }

  const target = rows.find(s => s.id === ctx.params.id);
  if (!target) return NextResponse.json({ error: "manager_not_found" }, { status: 404 });
  if (target.org_slug !== ctx.params.slug) {
    return NextResponse.json({ error: "manager_not_found" }, { status: 404 });
  }

  // Domain-verified targets always autopublish — the flag is meaningless
  // for them. Don't error; treat as no-op success.
  if (isDomainVerified(target.added_via)) {
    return NextResponse.json({ success: true, no_op: true, effective: true });
  }

  const patch: Record<string, unknown> = { can_autopublish: desired };
  if (desired) {
    patch.autopublish_granted_by = user.id;
    patch.autopublish_granted_at = new Date().toISOString();
  } else {
    patch.autopublish_granted_by = null;
    patch.autopublish_granted_at = null;
  }

  const { error: upErr } = await adminSupabase
    .from("org_managers")
    .update(patch)
    .eq("id", target.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ success: true, can_autopublish: desired });
}
