import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

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
  orgName: string;
  verifyUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn(`[org-claim] RESEND_API_KEY not set. Verify URL for ${opts.to}: ${opts.verifyUrl}`);
    return { sent: false, reason: "no_api_key" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "ForaHub <hello@forahub.org>",
      to: opts.to,
      subject: "Verify your organization claim for ForaHub",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f2a4a;padding:32px;border-radius:12px">
          <h1 style="color:#4ea8de;margin-top:0">Fora<span style="color:#ffffff">Hub</span></h1>
          <h2 style="color:#ffffff">Verify your organization claim</h2>
          <p style="color:#bfdbfe">Hi, you requested to claim <strong style="color:#ffffff">${opts.orgName}</strong> on ForaHub.
          Click the link below to verify your email and complete the claim.</p>
          <p style="color:#bfdbfe">This link expires in 1 hour.</p>
          <a href="${opts.verifyUrl}"
            style="display:inline-block;background:#4ea8de;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">
            Verify and claim →
          </a>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
          <p style="color:#64748b;font-size:12px;margin-top:24px">ForaHub · Global Development Events</p>
        </div>`,
    }),
  });
  if (!res.ok) {
    return { sent: false, reason: `resend_${res.status}` };
  }
  return { sent: true };
}

export async function POST(req: NextRequest) {
  let body: { org_slug?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orgSlug = (body.org_slug ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
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
    const masked = existing ? maskEmail((existing as ClaimRow).user_email) : "***";
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
  const { error: upsertErr } = await adminSupabase
    .from("org_claims")
    .upsert(
      {
        org_slug: org.slug,
        user_email: email,
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
