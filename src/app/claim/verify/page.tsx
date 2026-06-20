import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ResendForm from "./ResendForm";

export const dynamic = "force-dynamic";

interface ClaimRow {
  id: string;
  org_slug: string;
  user_email: string;
  status: string;
  token_expires_at: string | null;
  verification_path: string | null;
}

// Plain-language copy — no "token". Distinguishes expired vs. used vs. other.
interface ErrorCopy {
  variant: "expired" | "used" | "missing" | "invalid" | "generic";
  title: string;
  body: string;
}

const ERROR_COPY: Record<string, ErrorCopy> = {
  missing_token: {
    variant: "missing",
    title: "This link is incomplete",
    body: "Open the verification email and click the button there. If the email never arrived, you can request a new one.",
  },
  invalid_token: {
    variant: "invalid",
    title: "This verification link isn't valid",
    body: "It may have been used already, or it may have come from somewhere else. If you still need to verify your organization, you can request a new link.",
  },
  already_verified: {
    variant: "used",
    title: "This link has already been used",
    body: "Your organization is already verified. Sign in to manage it.",
  },
  pending_admin_review: {
    variant: "used",
    title: "Your claim is already pending review",
    body: "We've confirmed your email and your claim is in the review queue. We'll email you with the decision, usually within 2 business days.",
  },
  invalid_status: {
    variant: "invalid",
    title: "This verification link isn't active",
    body: "It may have already been used or been cancelled. Request a new one if you still need to verify.",
  },
  expired: {
    variant: "expired",
    title: "This verification link has expired",
    body: "For security, verification links are valid for a limited time. Enter your work email below to get a fresh one.",
  },
  update_failed: {
    variant: "generic",
    title: "We couldn't complete the verification",
    body: "Something went wrong on our side. Please try again, or email hello@forahub.org if it keeps failing.",
  },
  org_update_failed: {
    variant: "generic",
    title: "We couldn't finish the claim",
    body: "We verified your email but couldn't update the organization record. Please contact hello@forahub.org so we can fix it.",
  },
  lookup_failed: {
    variant: "generic",
    title: "We couldn't read your claim",
    body: "Please try again in a moment. If the problem persists, email hello@forahub.org.",
  },
};

interface VerificationFailure {
  ok: false;
  reason: string;
  /** Set when the link resolved to a row — even an expired or used one — so
   *  the page can offer a one-click resend without asking again. */
  context?: { orgSlug: string; userEmail: string };
}

interface VerificationQueued {
  ok: true;
  outcome: "queued";
  orgSlug: string;
}
interface VerificationApproved {
  ok: true;
  outcome: "approved";
  orgSlug: string;
}
interface VerificationNeedsSignin {
  ok: true;
  outcome: "needs_signin";
  /** Where to send the user after they sign in — back here to retry the
   *  same token. Set by the caller; we don't expose the raw token in the
   *  return value. */
}

async function performVerification(
  token: string,
): Promise<VerificationApproved | VerificationQueued | VerificationNeedsSignin | VerificationFailure> {
  const { data, error } = await adminSupabase
    .from("org_claims")
    .select("id, org_slug, user_email, status, token_expires_at, verification_path")
    .eq("verification_token", token)
    .maybeSingle();
  if (error) return { ok: false, reason: "lookup_failed" };
  const claim = data as ClaimRow | null;
  if (!claim) return { ok: false, reason: "invalid_token" };
  const context = { orgSlug: claim.org_slug, userEmail: claim.user_email };
  if (claim.status === "verified") return { ok: false, reason: "already_verified", context };
  if (claim.status === "pending_admin_review") return { ok: false, reason: "pending_admin_review", context };
  if (claim.status !== "pending_verification") return { ok: false, reason: "invalid_status", context };
  if (!claim.token_expires_at || new Date(claim.token_expires_at).getTime() < Date.now()) {
    await adminSupabase.from("org_claims").update({ status: "expired" }).eq("id", claim.id);
    return { ok: false, reason: "expired", context };
  }

  let userId: string | null = null;
  try {
    const serverSb = createServerSupabaseClient();
    const { data: u } = await serverSb.auth.getUser();
    userId = u.user?.id ?? null;
  } catch {
    // Anonymous read of the session — userId stays null; handled below.
  }

  // Domain-match verifications grant ownership immediately by writing
  // claimed_by_user_id on the org row. If we let that complete with a NULL
  // userId, the manage page (which gates on claimed_by_user_id === auth.uid())
  // will permanently lock the legitimate owner out — exactly what happened
  // to the WHO row. Force sign-in before granting.
  if (claim.verification_path === "domain_match" && !userId) {
    return { ok: true, outcome: "needs_signin" };
  }

  const nowIso = new Date().toISOString();

  // Free-mail or domain-mismatch path: email is now proven but the row goes
  // to the admin queue. Do NOT flip is_claimed / is_verified on the org —
  // an admin grants those after reviewing the supporting context.
  if (claim.verification_path === "admin_review") {
    const { error: claimErr } = await adminSupabase
      .from("org_claims")
      .update({
        status: "pending_admin_review",
        verification_token: null,
        user_id: userId,
      })
      .eq("id", claim.id);
    if (claimErr) return { ok: false, reason: "update_failed", context };
    return { ok: true, outcome: "queued", orgSlug: claim.org_slug };
  }

  // Default / explicit domain_match path: instant grant.
  const { error: claimErr } = await adminSupabase
    .from("org_claims")
    .update({
      status: "verified",
      claimed_at: nowIso,
      verification_token: null,
      user_id: userId,
    })
    .eq("id", claim.id);
  if (claimErr) return { ok: false, reason: "update_failed", context };

  const { error: orgErr } = await adminSupabase
    .from("organizations_directory")
    .update({
      is_claimed: true,
      is_verified: true,
      claimed_at: nowIso,
      claimed_by_user_id: userId,
    })
    .eq("slug", claim.org_slug);
  if (orgErr) return { ok: false, reason: "org_update_failed", context };

  return { ok: true, outcome: "approved", orgSlug: claim.org_slug };
}

export default async function ClaimVerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  if (!searchParams.token && !searchParams.error) {
    return renderError("missing_token", undefined);
  }
  if (searchParams.error) {
    return renderError(searchParams.error, undefined);
  }

  const result = await performVerification(searchParams.token!.trim());
  if (result.ok) {
    if (result.outcome === "approved") {
      redirect(`/orgs/${result.orgSlug}/manage?claimed=1`);
    }
    if (result.outcome === "needs_signin") {
      // Bounce through sign-in so the verification can complete with a real
      // auth.uid(). The same token is re-used; performVerification will
      // re-enter with userId populated and grant ownership.
      const next = `/claim/verify?token=${encodeURIComponent(searchParams.token!.trim())}`;
      redirect(`/auth/signin?next=${encodeURIComponent(next)}`);
    }
    // outcome === "queued": email was just confirmed, but the claim sits in
    // the admin review queue. Don't redirect to the manage page — show a
    // calm "thanks, we'll get back to you" screen instead.
    return renderQueued();
  }
  return renderError(result.reason, result.context);
}

function renderQueued() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a]">Email confirmed — pending review</h1>
          <p className="text-sm text-gray-600 mt-3">
            Thanks for confirming your email. Because your address isn&apos;t on the
            organization&apos;s known domain, we&apos;ll review your claim manually
            before granting access. We&apos;ll email you with the decision — usually
            within 2 business days.
          </p>
          <p className="text-xs text-gray-500 mt-4">
            Need to share more context? Reply to the verification email or write to{" "}
            <a href="mailto:hello@forahub.org" className="text-blue-700 hover:underline font-medium">
              hello@forahub.org
            </a>
            .
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
            >
              Back to ForaHub
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function renderError(
  reason: string,
  context: { orgSlug: string; userEmail: string } | undefined,
) {
  const copy = ERROR_COPY[reason] ?? {
    variant: "generic" as const,
    title: "We couldn't verify this link",
    body: "Please try starting the claim again, or contact hello@forahub.org.",
  };
  const isUsed = copy.variant === "used";
  const canResend = !!context && (copy.variant === "expired" || copy.variant === "invalid");

  const Icon = isUsed ? CheckCircle2 : copy.variant === "expired" ? Clock : AlertCircle;
  const iconBg = isUsed ? "bg-emerald-100" : copy.variant === "expired" ? "bg-amber-100" : "bg-red-100";
  const iconColor = isUsed ? "text-emerald-600" : copy.variant === "expired" ? "text-amber-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <div className={`mx-auto w-14 h-14 rounded-full ${iconBg} flex items-center justify-center mb-4`}>
            <Icon className={`w-7 h-7 ${iconColor}`} />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a]">{copy.title}</h1>
          <p className="text-sm text-gray-600 mt-3">{copy.body}</p>

          {canResend && context && (
            <ResendForm orgSlug={context.orgSlug} prefillEmail={context.userEmail} />
          )}

          {isUsed && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/signin"
                className="inline-flex items-center justify-center bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                Sign in
              </Link>
              {context && (
                <Link
                  href={`/orgs/${context.orgSlug}/manage`}
                  className="inline-flex items-center justify-center bg-white border border-gray-200 text-[#0f2a4a] hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-xl text-sm"
                >
                  Go to manage page →
                </Link>
              )}
            </div>
          )}

          {!canResend && !isUsed && (
            <div className="mt-6">
              <Link
                href="/claim"
                className="inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Start a new claim
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
