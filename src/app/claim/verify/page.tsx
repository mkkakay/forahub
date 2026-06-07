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

async function performVerification(
  token: string,
): Promise<{ ok: true; orgSlug: string } | VerificationFailure> {
  const { data, error } = await adminSupabase
    .from("org_claims")
    .select("id, org_slug, user_email, status, token_expires_at")
    .eq("verification_token", token)
    .maybeSingle();
  if (error) return { ok: false, reason: "lookup_failed" };
  const claim = data as ClaimRow | null;
  if (!claim) return { ok: false, reason: "invalid_token" };
  const context = { orgSlug: claim.org_slug, userEmail: claim.user_email };
  if (claim.status === "verified") return { ok: false, reason: "already_verified", context };
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
    // Anonymous verification is fine; the claim still binds by email.
  }

  const nowIso = new Date().toISOString();
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

  return { ok: true, orgSlug: claim.org_slug };
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
    redirect(`/orgs/${result.orgSlug}/manage?claimed=1`);
  }
  return renderError(result.reason, result.context);
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
