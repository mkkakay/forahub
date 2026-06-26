// POST /api/orgs/request-claim
//
// Account-first claim endpoint. The caller MUST be signed in with a verified
// Supabase auth email — that signup-time verification is the only proof of
// mailbox control we accept. There is no second "claim verification" email
// path anymore; if the legacy /claim/verify route is still hit by an
// inbox-aged token, it continues to work, but new claims never generate
// tokens or send Resend mail.
//
// Outcomes:
//   - already_owned_by_you  : caller already holds an org_managers seat.
//   - instant grant         : caller's verified auth email's domain equals
//                             org.domain and is not on the free-mail list.
//                             org_managers seat written immediately.
//   - admin review queued   : caller is signed in but their auth email
//                             doesn't qualify (domain mismatch or free-mail).
//                             org_claims row written at status='pending_admin_review';
//                             admin approves (or denies) from /admin.

import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { addOrgManager, isOrgManager } from "@/lib/orgs/managers";
import { isFreeMailDomain } from "@/lib/email/freeMailDomains";
import { sanitizeApiError } from "@/lib/security/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  let body: { org_slug?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orgSlug = (body.org_slug ?? "").trim();
  const claimantName = ((body.name ?? "").trim()) || null;
  if (!orgSlug) return NextResponse.json({ error: "org_slug required" }, { status: 400 });

  // Require a signed-in user with a verified email. The /claim UI prompts
  // sign-in/sign-up before ever calling this endpoint, so a 401 here is a
  // last-line safety net — not a normal user-facing flow.
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;
  if (!user || !user.email || !user.email_confirmed_at) {
    return NextResponse.json(
      {
        error: "signin_required",
        message: "Sign in with your work email to claim this organization.",
      },
      { status: 401 },
    );
  }
  const authEmail = user.email.trim().toLowerCase();
  const authDomain = extractDomain(authEmail);

  const { data: orgData, error: orgErr } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name, domain")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (orgErr) return sanitizeApiError(orgErr, "orgs/request-claim", 500);
  const org = orgData as OrgRow | null;
  if (!org) return NextResponse.json({ error: "org_not_found" }, { status: 404 });

  // Already a manager? Short-circuit — same predicate /manage gates on, so
  // a positive answer here always means /manage will let them in too.
  if (await isOrgManager(org.slug, user.id)) {
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
  const qualifies = !!(
    orgDomain &&
    authDomain &&
    authDomain === orgDomain &&
    !isFreeMailDomain(authDomain)
  );

  const nowIso = new Date().toISOString();

  if (qualifies) {
    // Instant grant. Supabase already proved mailbox control at signup.
    const seat = await addOrgManager({
      orgSlug: org.slug,
      userId: user.id,
      email: authEmail,
      verifiedAt: nowIso,
      addedVia: "oauth_session",
    });
    if (!seat) return NextResponse.json({ error: "seat_failed" }, { status: 500 });
    // Audit row in org_claims so the manage page's "verified via" copy and
    // the admin history stay coherent. The seat itself is authoritative.
    await adminSupabase
      .from("org_claims")
      .upsert(
        {
          org_slug: org.slug,
          user_email: authEmail,
          user_id: user.id,
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
      verification_path: "oauth_session",
      org_slug: org.slug,
      manage_url: `/orgs/${org.slug}/manage`,
      message: `You now manage ${org.name}.`,
    });
  }

  // Admin-review path. No email is sent — the signed-in user's verified
  // Supabase email is already proof of identity; an admin still has to
  // approve because their domain doesn't auto-match. The org_claims row
  // carries everything the review queue needs.
  const { error: upsertErr } = await adminSupabase
    .from("org_claims")
    .upsert(
      {
        org_slug: org.slug,
        user_email: authEmail,
        user_id: user.id,
        claimant_name: claimantName,
        status: "pending_admin_review",
        verification_path: "admin_review",
        verification_token: null,
        token_expires_at: null,
        claimed_at: null,
      },
      { onConflict: "org_slug,user_email" },
    );
  if (upsertErr) return sanitizeApiError(upsertErr, "orgs/request-claim", 500);

  return NextResponse.json({
    success: true,
    queued: true,
    verification_path: "admin_review",
    org_slug: org.slug,
    message: `We'll review your claim for ${org.name} and email you with the decision.`,
  });
}
