import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addOrgManager, isOrgManager } from "@/lib/orgs/managers";
import { renderClaimVerificationEmail } from "@/lib/email/claimVerification";
import { isFreeMailDomain } from "@/lib/email/freeMailDomains";

type VerificationPath = "domain_match" | "admin_review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface OrgRow {
  slug: string;
  name: string;
  domain: string | null;
}

function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

function normalizeOrgDomain(domain: string | null): string | null {
  if (!domain) return null;
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

async function sendVerificationEmail(opts: {
  to: string;
  recipientName: string | null;
  orgName: string;
  verifyUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn(`[org-claim] RESEND_API_KEY not set. Verify URL for ${opts.to}: ${opts.verifyUrl}`);
    return { sent: false, reason: "no_api_key" };
  }
  const { subject, html, text } = renderClaimVerificationEmail({
    to: opts.to,
    recipientName: opts.recipientName,
    orgName: opts.orgName,
    verifyUrl: opts.verifyUrl,
  });
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
    try { detail = await res.text(); } catch {}
    console.warn(`[org-claim] Resend failed ${res.status}: ${detail.slice(0, 200)}`);
    return { sent: false, reason: `resend_${res.status}` };
  }
  return { sent: true };
}

export async function POST(req: NextRequest) {
  let body: { org_slug?: string; email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orgSlug = (body.org_slug ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  // Names are not required at the API layer (the resend flow on the verify
  // page reuses an already-stored row that may pre-date the name capture),
  // but the /claim page enforces "name required when not signed in".
  const claimantName = ((body.name ?? "").trim()) || null;
  if (!orgSlug) return NextResponse.json({ error: "org_slug required" }, { status: 400 });
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }

  const { data: orgData, error: orgErr } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name, domain")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });
  const org = orgData as OrgRow | null;
  if (!org) return NextResponse.json({ error: "org_not_found" }, { status: 404 });

  // Resolve the signed-in user from the session cookie. We pull email +
  // email_confirmed_at as well: the instant-grant path below trusts a verified
  // Supabase auth email as proof of mailbox control, so we can skip the
  // second (claim-side) verification email entirely.
  let currentUserId: string | null = null;
  let currentUserEmail: string | null = null;
  let currentUserEmailVerified = false;
  try {
    const sb = createServerSupabaseClient();
    const { data: u } = await sb.auth.getUser();
    currentUserId = u.user?.id ?? null;
    currentUserEmail = u.user?.email ?? null;
    currentUserEmailVerified = !!u.user?.email_confirmed_at;
  } catch {
    // Anonymous request — currentUserId stays null, no short-circuit.
  }

  if (currentUserId && (await isOrgManager(org.slug, currentUserId))) {
    return NextResponse.json(
      {
        error: "already_owned_by_you",
        own_org: true,
        org_slug: org.slug,
        message: `You already manage ${org.name}.`,
      },
      { status: 409 },
    );
  }

  const orgDomain = normalizeOrgDomain(org.domain);

  // ── One-step instant-grant path ─────────────────────────────────────────
  // If the signed-in user's *verified* Supabase auth email already qualifies
  // for this org (same domain, non-free-mail), Supabase already proved they
  // control that mailbox at sign-in time (OAuth provider, or email-signup
  // confirmation). Sending a second claim-verification email just to land
  // back at the same fact is pure friction — grant the seat now.
  if (
    currentUserId &&
    currentUserEmail &&
    currentUserEmailVerified &&
    orgDomain
  ) {
    const authDomain = extractDomain(currentUserEmail);
    if (
      authDomain &&
      authDomain === orgDomain &&
      !isFreeMailDomain(authDomain)
    ) {
      const nowIso = new Date().toISOString();
      const seat = await addOrgManager({
        orgSlug: org.slug,
        userId: currentUserId,
        email: currentUserEmail,
        verifiedAt: nowIso,
        addedVia: "oauth_session",
      });
      if (seat) {
        // Audit-trail row in org_claims so the admin review history and
        // /manage's "verified via" labels stay coherent — the seat itself
        // is the source of truth for access.
        await adminSupabase
          .from("org_claims")
          .upsert(
            {
              org_slug: org.slug,
              user_email: currentUserEmail,
              user_id: currentUserId,
              claimant_name: claimantName,
              status: "verified",
              verification_path: "oauth_session",
              verification_token: null,
              token_expires_at: null,
              claimed_at: nowIso,
            },
            { onConflict: "org_slug,user_email" },
          );
        await adminSupabase
          .from("organizations_directory")
          .update({
            is_claimed: true,
            is_verified: true,
            claimed_at: nowIso,
          })
          .eq("slug", org.slug);
        return NextResponse.json({
          success: true,
          instant: true,
          email_sent: false,
          verification_path: "oauth_session",
          org_slug: org.slug,
          manage_url: `/orgs/${org.slug}/manage`,
          message: `You now manage ${org.name}.`,
        });
      }
      // If the seat insert failed, fall through to the email-verification
      // path rather than silently swallowing — better to ask the user to
      // verify than to leave them confused.
    }
  }

  // Decide the verification path.
  //
  // AUTO ("domain_match") requires BOTH:
  //   - the submitted email's host equals the org's known domain on file, AND
  //   - that host is NOT on the free-mail / personal-provider list.
  //
  // Everything else — free-mail domains, custom-domain mismatch, or org with
  // no domain on file — falls to ADMIN REVIEW. Never hard-reject. The user
  // still email-verifies the address (proves ownership) but the row lands
  // in the queue at status='pending_admin_review' until a human approves.
  const emailDomain = extractDomain(email);
  const emailIsFreeMail = isFreeMailDomain(emailDomain);
  const verificationPath: VerificationPath =
    !!orgDomain &&
    !!emailDomain &&
    emailDomain === orgDomain &&
    !emailIsFreeMail
      ? "domain_match"
      : "admin_review";

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  // Preserve any previously-captured claimant_name across resend cycles —
  // if the caller didn't supply one (e.g. resend flow on /claim/verify),
  // fall back to whatever is already on the row.
  const { data: prior } = await adminSupabase
    .from("org_claims")
    .select("claimant_name")
    .eq("org_slug", org.slug)
    .eq("user_email", email)
    .maybeSingle();
  const priorName = (prior as { claimant_name: string | null } | null)?.claimant_name ?? null;
  const finalName = claimantName ?? priorName;

  const { error: upsertErr } = await adminSupabase
    .from("org_claims")
    .upsert(
      {
        org_slug: org.slug,
        user_email: email,
        claimant_name: finalName,
        status: "pending_verification",
        // verification_path is decided here and locked in for the rest of
        // the flow. /claim/verify reads it on token-click to decide whether
        // to auto-approve (domain_match) or send the row to the admin
        // review queue (admin_review).
        verification_path: verificationPath,
        verification_token: token,
        token_expires_at: expiresAt,
        claimed_at: null,
      },
      { onConflict: "org_slug,user_email" }
    );
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://forahub.org";
  const verifyUrl = `${appUrl}/claim/verify?token=${token}`;

  const emailResult = await sendVerificationEmail({
    to: email,
    recipientName: finalName,
    orgName: org.name,
    verifyUrl,
  });

  // Production guard: never leak the raw verification URL to the client. The
  // dev-mode fallback link only ships when the server is running in a
  // non-production NODE_ENV — local `npm run dev`, preview deploys with
  // VERCEL_ENV=preview behave like production, so we explicitly check both.
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (!emailResult.sent && isProd) {
    // Email failed in production — return a clean failure the client can
    // render as "couldn't send, please try again". The org_claims row is
    // already inserted so the user can re-request and we'll re-use the
    // same token until it expires.
    return NextResponse.json(
      {
        success: false,
        email_sent: false,
        error: "email_send_failed",
        message:
          "We couldn't send the verification email. Please try again in a few minutes, or contact hello@forahub.org if it keeps failing.",
        reason: emailResult.reason,
      },
      { status: 502 },
    );
  }

  const devFallback =
    !emailResult.sent && !isProd ? { dev_verify_url: verifyUrl } : {};
  return NextResponse.json({
    success: true,
    message: "Check your email",
    email_sent: emailResult.sent,
    verification_path: verificationPath,
    ...devFallback,
  });
}
