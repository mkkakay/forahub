// POST /api/orgs/[slug]/team/invites
//   Body: { email: string, note?: string }
//   Creates an org_invites row, sends a branded invitation email, returns
//   the new invite row. ONLY existing managers of that org can call this —
//   server-side check via isOrgManager(slug, auth.uid()), not just the UI.
//
// GET /api/orgs/[slug]/team/invites
//   Returns the pending invite list for the team panel.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager } from "@/lib/orgs/managers";
import {
  ORG_INVITE_TTL_DAYS,
  inviteExpiry,
  listPendingInvites,
  newInviteToken,
} from "@/lib/orgs/invites";
import { renderOrgInviteEmail } from "@/lib/email/orgInvite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendInviteEmail(opts: {
  to: string;
  orgName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  note: string | null;
  acceptUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[org-invite] RESEND_API_KEY not set. Accept URL for ${opts.to}: ${opts.acceptUrl}`);
    return { sent: false, reason: "no_api_key" };
  }
  const { subject, html, text } = renderOrgInviteEmail({
    to: opts.to,
    orgName: opts.orgName,
    inviterName: opts.inviterName,
    inviterEmail: opts.inviterEmail,
    note: opts.note,
    acceptUrl: opts.acceptUrl,
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
    console.warn(`[org-invite] Resend failed ${res.status}: ${detail.slice(0, 200)}`);
    return { sent: false, reason: `resend_${res.status}` };
  }
  return { sent: true };
}

async function requireManager(
  slug: string,
): Promise<{ ok: true; userId: string; userEmail: string | null; userName: string | null } | { ok: false; status: number; error: string }> {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user) return { ok: false, status: 401, error: "signin_required" };
  if (!(await isOrgManager(slug, user.id))) {
    return { ok: false, status: 403, error: "not_a_manager" };
  }
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    (typeof meta.name === "string" && meta.name.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    null;
  return { ok: true, userId: user.id, userEmail: user.email ?? null, userName: metaName };
}

export async function GET(req: NextRequest, ctx: { params: { slug: string } }) {
  const guard = await requireManager(ctx.params.slug);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const invites = await listPendingInvites(ctx.params.slug);
  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest, ctx: { params: { slug: string } }) {
  const guard = await requireManager(ctx.params.slug);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: { email?: string; note?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const note = (body.note ?? "").trim().slice(0, 500) || null;
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // Fetch org metadata for the email subject + body.
  const { data: orgRow } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name")
    .eq("slug", ctx.params.slug)
    .maybeSingle();
  if (!orgRow) return NextResponse.json({ error: "org_not_found" }, { status: 404 });
  const org = orgRow as { slug: string; name: string };

  // Block inviting someone who's already a manager. Cheaper to check by
  // (slug, email) — user_id isn't always known at invite time.
  const { data: existingMgr } = await adminSupabase
    .from("org_managers")
    .select("id, email")
    .eq("org_slug", org.slug)
    .ilike("email", email)
    .maybeSingle();
  if (existingMgr) {
    return NextResponse.json({ error: "already_a_manager" }, { status: 409 });
  }

  // De-dup pending invites: if a still-pending invite to this email exists,
  // recycle it (re-issue token + extend expiry) rather than inserting another.
  const { data: pendingRow } = await adminSupabase
    .from("org_invites")
    .select("id")
    .eq("org_slug", org.slug)
    .ilike("invited_email", email)
    .eq("status", "pending")
    .maybeSingle();
  const pending = pendingRow as { id: string } | null;

  const token = newInviteToken();
  const expiresAt = inviteExpiry();

  let inviteId: string;
  if (pending) {
    const { error } = await adminSupabase
      .from("org_invites")
      .update({
        token,
        expires_at: expiresAt,
        note,
        invited_by_user_id: guard.userId,
        invited_by_email: guard.userEmail,
      })
      .eq("id", pending.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inviteId = pending.id;
  } else {
    const { data: inserted, error } = await adminSupabase
      .from("org_invites")
      .insert({
        org_slug: org.slug,
        invited_email: email,
        token,
        invited_by_user_id: guard.userId,
        invited_by_email: guard.userEmail,
        note,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inviteId = (inserted as { id: string }).id;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://forahub.org";
  const acceptUrl = `${appUrl}/orgs/invite/accept?token=${token}`;
  const emailRes = await sendInviteEmail({
    to: email,
    orgName: org.name,
    inviterName: guard.userName,
    inviterEmail: guard.userEmail,
    note,
    acceptUrl,
  });

  return NextResponse.json({
    success: true,
    invite_id: inviteId,
    email_sent: emailRes.sent,
    email_reason: emailRes.reason ?? null,
  });
}
