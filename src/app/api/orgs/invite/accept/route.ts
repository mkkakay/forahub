// POST /api/orgs/invite/accept
//   Body: { token: string }
//   Requires a signed-in user whose verified Supabase auth email matches
//   the invited_email on the token row (case-insensitive). On success,
//   writes an org_managers seat with added_via='invitation' and marks
//   the invite accepted.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addOrgManager, isOrgManager } from "@/lib/orgs/managers";
import { findInviteByToken } from "@/lib/orgs/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try { body = await req.json(); } catch { body = {}; }
  const token = (body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user || !user.email || !user.email_confirmed_at) {
    return NextResponse.json({ error: "signin_required" }, { status: 401 });
  }
  const authEmail = user.email.trim().toLowerCase();

  const invite = await findInviteByToken(token);
  if (!invite) return NextResponse.json({ error: "invite_not_found" }, { status: 404 });

  if (invite.status === "accepted") {
    return NextResponse.json({ error: "invite_already_accepted" }, { status: 409 });
  }
  if (invite.status === "revoked") {
    return NextResponse.json({ error: "invite_revoked" }, { status: 409 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "invite_not_pending" }, { status: 409 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await adminSupabase
      .from("org_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return NextResponse.json({ error: "invite_expired" }, { status: 409 });
  }

  // Targeted invite: the signed-in user's auth email must match the email
  // the invitation was sent to. This stops the link from being forwarded.
  if (invite.invited_email.trim().toLowerCase() !== authEmail) {
    return NextResponse.json(
      {
        error: "wrong_account",
        invited_email: invite.invited_email,
      },
      { status: 403 },
    );
  }

  // Idempotent: if the signed-in user is already a manager (e.g. via a
  // prior domain-match path), accept the invite as a no-op grant.
  const already = await isOrgManager(invite.org_slug, user.id);
  if (!already) {
    const seat = await addOrgManager({
      orgSlug: invite.org_slug,
      userId: user.id,
      email: authEmail,
      verifiedAt: new Date().toISOString(),
      addedVia: "invitation",
    });
    if (!seat) return NextResponse.json({ error: "seat_failed" }, { status: 500 });
  }

  const { error: markErr } = await adminSupabase
    .from("org_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_user_id: user.id,
      token: `accepted-${crypto.randomUUID()}`, // burn the token
    })
    .eq("id", invite.id);
  if (markErr) return NextResponse.json({ error: markErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    org_slug: invite.org_slug,
    manage_url: `/orgs/${invite.org_slug}/manage`,
  });
}
