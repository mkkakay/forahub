// POST /api/orgs/[slug]/team/invites/[id]/resend
// Re-mails the same invite. Token is rotated and expiry extended so the
// previous link is invalidated (mirrors the security expectation of a
// "fresh single-use link").

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";
import {
  ORG_INVITE_TTL_DAYS,
  inviteExpiry,
  newInviteToken,
} from "@/lib/orgs/invites";
import { renderOrgInviteEmail } from "@/lib/email/orgInvite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sendInviteEmail(opts: {
  to: string;
  orgName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  note: string | null;
  acceptUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "no_api_key" };
  const { subject, html, text } = renderOrgInviteEmail({
    ...opts,
    expiresInDays: ORG_INVITE_TTL_DAYS,
  });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: "ForaHub <admin@forahub.org>",
      to: opts.to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch {}
    return { sent: false, reason: `resend_${res.status}: ${detail.slice(0, 120)}` };
  }
  return { sent: true };
}

export async function POST(req: NextRequest, ctx: { params: { slug: string; id: string } }) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return NextResponse.json({ error: "signin_required" }, { status: 401 });
  if (!(await isOrgManager(ctx.params.slug, user.id))) {
    return NextResponse.json({ error: "not_a_manager" }, { status: 403 });
  }

  const { data: inviteRow } = await adminSupabase
    .from("org_invites")
    .select("id, org_slug, invited_email, note, status")
    .eq("id", ctx.params.id)
    .maybeSingle();
  const invite = inviteRow as {
    id: string; org_slug: string; invited_email: string; note: string | null; status: string;
  } | null;
  if (!invite || invite.org_slug !== ctx.params.slug) {
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "invite_not_pending" }, { status: 409 });
  }

  const { data: orgRow } = await adminSupabase
    .from("organizations_directory")
    .select("name")
    .eq("slug", ctx.params.slug)
    .maybeSingle();
  if (!orgRow) return NextResponse.json({ error: "org_not_found" }, { status: 404 });
  const orgName = (orgRow as { name: string }).name;

  const newToken = newInviteToken();
  const newExpiry = inviteExpiry();
  const { error: upErr } = await adminSupabase
    .from("org_invites")
    .update({
      token: newToken,
      expires_at: newExpiry,
      invited_by_user_id: user.id,
      invited_by_email: user.email ?? null,
    })
    .eq("id", invite.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const inviterName =
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://forahub.org";
  const acceptUrl = `${appUrl}/orgs/invite/accept?token=${newToken}`;
  const emailRes = await sendInviteEmail({
    to: invite.invited_email,
    orgName,
    inviterName,
    inviterEmail: user.email ?? null,
    note: invite.note,
    acceptUrl,
  });

  return NextResponse.json({
    success: true,
    email_sent: emailRes.sent,
    email_reason: emailRes.reason ?? null,
  });
}
