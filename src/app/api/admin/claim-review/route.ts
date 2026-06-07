// Admin claim-review endpoint. Surfaces the pending_admin_review queue
// joined to the org row, and lets the admin approve (with or without the
// verified badge) or deny (with a required reason — emails the claimant
// on deny).
//
//   GET    → list every claim currently in pending_admin_review, joined
//            to organizations_directory for the org-side context the
//            review panel needs.
//   PATCH  → { id, action: 'approve'|'approve_no_badge'|'deny',
//              denial_reason?, reviewer_notes? }

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { renderClaimDeniedEmail } from "@/lib/email/claimDenied";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminKey = req.headers.get("x-admin-key");
  return !!adminSecret && adminKey === adminSecret;
}

interface PendingClaimRow {
  id: string;
  org_slug: string;
  user_email: string;
  user_id: string | null;
  status: string;
  verification_path: string | null;
  claimant_name: string | null;
  claimant_role: string | null;
  claimant_proof_url: string | null;
  claimant_message: string | null;
  claimed_at: string | null;
  created_at: string;
  // Joined org context:
  org_name: string;
  org_domain: string | null;
  org_source: string;
  org_tier: number | null;
  org_logo_url: string | null;
}

async function sendDenialEmail(opts: {
  to: string;
  recipientName: string | null;
  orgName: string;
  reason: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { sent: false, reason: "no_api_key" };
  const { subject, html, text } = renderClaimDeniedEmail(opts);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "ForaHub <hello@forahub.org>",
      to: opts.to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.text()).slice(0, 200); } catch {}
    return { sent: false, reason: `resend_${res.status}: ${detail}` };
  }
  return { sent: true };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await adminSupabase
    .from("org_claims")
    .select(`
      id, org_slug, user_email, user_id, status, verification_path,
      claimant_name, claimant_role, claimant_proof_url, claimant_message,
      claimed_at, created_at,
      organizations_directory:org_slug (
        name, domain, source, tier, logo_url
      )
    `)
    .eq("status", "pending_admin_review")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: PendingClaimRow[] = ((data ?? []) as Array<Record<string, unknown>>).map(r => {
    const orgRel = (r.organizations_directory ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string,
      org_slug: r.org_slug as string,
      user_email: r.user_email as string,
      user_id: (r.user_id ?? null) as string | null,
      status: r.status as string,
      verification_path: (r.verification_path ?? null) as string | null,
      claimant_name: (r.claimant_name ?? null) as string | null,
      claimant_role: (r.claimant_role ?? null) as string | null,
      claimant_proof_url: (r.claimant_proof_url ?? null) as string | null,
      claimant_message: (r.claimant_message ?? null) as string | null,
      claimed_at: (r.claimed_at ?? null) as string | null,
      created_at: r.created_at as string,
      org_name: (orgRel.name as string) ?? (r.org_slug as string),
      org_domain: (orgRel.domain ?? null) as string | null,
      org_source: (orgRel.source as string) ?? "manual",
      org_tier: (orgRel.tier ?? null) as number | null,
      org_logo_url: (orgRel.logo_url ?? null) as string | null,
    };
  });

  return NextResponse.json({ pending: rows, count: rows.length });
}

interface PatchBody {
  id?: string;
  action?: "approve" | "approve_no_badge" | "deny";
  denial_reason?: string;
  reviewer_notes?: string;
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PatchBody;
  try { body = await req.json(); } catch { body = {}; }
  const id = body.id?.trim();
  const action = body.action;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (action !== "approve" && action !== "approve_no_badge" && action !== "deny") {
    return NextResponse.json({ error: "action must be approve | approve_no_badge | deny" }, { status: 400 });
  }
  if (action === "deny" && !(body.denial_reason && body.denial_reason.trim().length >= 4)) {
    return NextResponse.json({ error: "denial_reason required (min 4 chars)" }, { status: 400 });
  }

  const { data: claimRow, error: lookupErr } = await adminSupabase
    .from("org_claims")
    .select("id, org_slug, user_email, user_id, status, claimant_name")
    .eq("id", id)
    .maybeSingle();
  if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  if (!claimRow) return NextResponse.json({ error: "claim not found" }, { status: 404 });
  if (claimRow.status !== "pending_admin_review") {
    return NextResponse.json({ error: `claim is ${claimRow.status}, not pending_admin_review` }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const reviewer = req.headers.get("x-reviewer-user-id") || null;

  if (action === "deny") {
    const reason = (body.denial_reason ?? "").trim();
    const { error: claimErr } = await adminSupabase
      .from("org_claims")
      .update({
        status: "denied",
        decision: "denied",
        denial_reason: reason,
        reviewer_user_id: reviewer,
        reviewed_at: nowIso,
        reviewer_notes: body.reviewer_notes ?? null,
      })
      .eq("id", id);
    if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 });

    // Fetch org name for the email.
    const { data: org } = await adminSupabase
      .from("organizations_directory")
      .select("name")
      .eq("slug", claimRow.org_slug)
      .maybeSingle();

    const emailRes = await sendDenialEmail({
      to: claimRow.user_email,
      recipientName: claimRow.claimant_name ?? null,
      orgName: (org?.name as string) ?? claimRow.org_slug,
      reason,
    });

    return NextResponse.json({
      ok: true,
      action: "denied",
      email_sent: emailRes.sent,
      email_reason: emailRes.reason ?? null,
    });
  }

  // Approve flow — both variants grant ownership; the difference is the
  // verified badge.
  const grantBadge = action === "approve";
  const claimUpdate = await adminSupabase
    .from("org_claims")
    .update({
      status: "verified",
      decision: grantBadge ? "approved" : "approved_no_badge",
      claimed_at: nowIso,
      reviewer_user_id: reviewer,
      reviewed_at: nowIso,
      reviewer_notes: body.reviewer_notes ?? null,
    })
    .eq("id", id);
  if (claimUpdate.error) {
    return NextResponse.json({ error: claimUpdate.error.message }, { status: 500 });
  }

  const orgUpdate = await adminSupabase
    .from("organizations_directory")
    .update({
      is_claimed: true,
      is_verified: grantBadge,
      claimed_at: nowIso,
      claimed_by_user_id: claimRow.user_id ?? null,
    })
    .eq("slug", claimRow.org_slug);
  if (orgUpdate.error) {
    return NextResponse.json({ error: orgUpdate.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    action: grantBadge ? "approved" : "approved_no_badge",
  });
}
