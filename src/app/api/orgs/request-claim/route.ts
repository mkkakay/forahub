import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { renderClaimVerificationEmail } from "@/lib/email/claimVerification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface OrgRow {
  slug: string;
  name: string;
  domain: string | null;
  is_claimed: boolean | null;
}

interface ClaimRow {
  user_email: string;
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

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const head = local.slice(0, Math.min(3, local.length));
  return `${head}***@${domain}`;
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
    .select("slug, name, domain, is_claimed")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });
  const org = orgData as OrgRow | null;
  if (!org) return NextResponse.json({ error: "org_not_found" }, { status: 404 });

  if (org.is_claimed) {
    const { data: existing } = await adminSupabase
      .from("org_claims")
      .select("user_email")
      .eq("org_slug", org.slug)
      .eq("status", "verified")
      .limit(1)
      .maybeSingle();
    const ownerEmail = existing ? (existing as ClaimRow).user_email.trim().toLowerCase() : null;
    // `email` is already normalized higher up (trimmed + lowercased on
    // line ~89). If the submitter matches the verified owner, surface a
    // clear "you already own this" message + an own_org flag so the client
    // can route them to sign-in / manage UI instead of showing a masked
    // address back to them.
    if (ownerEmail && ownerEmail === email) {
      return NextResponse.json(
        {
          error: "already_owned_by_you",
          own_org: true,
          org_slug: org.slug,
          message: `You already own ${org.name}. Sign in to manage it.`,
        },
        { status: 409 }
      );
    }
    const masked = ownerEmail ? maskEmail(ownerEmail) : "***";
    return NextResponse.json(
      {
        error: "already_claimed",
        message: `This organization is already claimed by ${masked}. If you believe this is an error, contact support.`,
      },
      { status: 409 }
    );
  }

  const orgDomain = normalizeOrgDomain(org.domain);
  const emailDomain = extractDomain(email);
  if (!orgDomain) {
    return NextResponse.json(
      {
        error: "no_org_domain",
        message: `We don't have a verified domain on file for ${org.name}. To list events, use the standard submission form.`,
      },
      { status: 422 }
    );
  }
  if (!emailDomain || emailDomain !== orgDomain) {
    return NextResponse.json(
      {
        error: "domain_mismatch",
        org_domain: orgDomain,
        message: `Your email domain doesn't match ${org.name}'s verified domain (@${orgDomain}). To list events for this organization, use the standard submission form instead.`,
      },
      { status: 422 }
    );
  }

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
    ...devFallback,
  });
}
