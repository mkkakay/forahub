// DELETE /api/orgs/[slug]/team/invites/[id]
//   Revoke a pending invite. Only managers of the org.
//
// POST   /api/orgs/[slug]/team/invites/[id]/resend  → see ./resend/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireManager(slug: string): Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return { ok: false, status: 401, error: "signin_required" };
  if (!(await isOrgManager(slug, user.id))) {
    return { ok: false, status: 403, error: "not_a_manager" };
  }
  return { ok: true, userId: user.id };
}

export async function DELETE(req: NextRequest, ctx: { params: { slug: string; id: string } }) {
  const guard = await requireManager(ctx.params.slug);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { data: inviteRow } = await adminSupabase
    .from("org_invites")
    .select("id, org_slug, status")
    .eq("id", ctx.params.id)
    .maybeSingle();
  const invite = inviteRow as { id: string; org_slug: string; status: string } | null;
  if (!invite) return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  if (invite.org_slug !== ctx.params.slug) {
    // Cross-org tamper attempt — caller is a manager of `slug` but tried to
    // revoke an invite that belongs to a different org. Refuse cleanly.
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "invite_not_pending" }, { status: 409 });
  }

  const { error } = await adminSupabase
    .from("org_invites")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      token: `revoked-${crypto.randomUUID()}`, // invalidate so the link is dead
    })
    .eq("id", invite.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
