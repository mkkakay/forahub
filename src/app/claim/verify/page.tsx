import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ClaimRow {
  id: string;
  org_slug: string;
  user_email: string;
  status: string;
  token_expires_at: string | null;
}

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  missing_token: {
    title: "Missing verification token",
    body: "This link is incomplete. Open the verification email and click the button again.",
  },
  invalid_token: {
    title: "Invalid or used token",
    body: "This verification link is no longer valid. It may have already been used.",
  },
  already_verified: {
    title: "Claim already verified",
    body: "This organization has already been verified by your email. Visit the manage page or contact support.",
  },
  invalid_status: {
    title: "Claim not pending",
    body: "This claim isn't pending verification. It may have expired or been rejected.",
  },
  expired: {
    title: "Link expired",
    body: "This verification link expired after 1 hour. Start the claim again to receive a fresh link.",
  },
  update_failed: {
    title: "Could not complete verification",
    body: "Something went wrong on our side. Please try again, or contact support if it persists.",
  },
  org_update_failed: {
    title: "Could not finalize claim",
    body: "We verified your email but couldn't update the organization record. Contact support so we can fix this.",
  },
  lookup_failed: {
    title: "Verification lookup failed",
    body: "We couldn't read your claim. Please try again in a moment.",
  },
};

async function performVerification(token: string): Promise<{ ok: true; orgSlug: string } | { ok: false; reason: string }> {
  const { data, error } = await adminSupabase
    .from("org_claims")
    .select("id, org_slug, user_email, status, token_expires_at")
    .eq("verification_token", token)
    .maybeSingle();
  if (error) return { ok: false, reason: "lookup_failed" };
  const claim = data as ClaimRow | null;
  if (!claim) return { ok: false, reason: "invalid_token" };
  if (claim.status === "verified") return { ok: false, reason: "already_verified" };
  if (claim.status !== "pending_verification") return { ok: false, reason: "invalid_status" };
  if (!claim.token_expires_at || new Date(claim.token_expires_at).getTime() < Date.now()) {
    await adminSupabase.from("org_claims").update({ status: "expired" }).eq("id", claim.id);
    return { ok: false, reason: "expired" };
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
  if (claimErr) return { ok: false, reason: "update_failed" };

  const { error: orgErr } = await adminSupabase
    .from("organizations_directory")
    .update({
      is_claimed: true,
      is_verified: true,
      claimed_at: nowIso,
      claimed_by_user_id: userId,
    })
    .eq("slug", claim.org_slug);
  if (orgErr) return { ok: false, reason: "org_update_failed" };

  return { ok: true, orgSlug: claim.org_slug };
}

export default async function ClaimVerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  // If the page is loaded with an existing ?error= (e.g. retry), just render the error.
  if (!searchParams.token && !searchParams.error) {
    return renderError("missing_token");
  }
  if (searchParams.error) {
    return renderError(searchParams.error);
  }

  const result = await performVerification(searchParams.token!.trim());
  if (result.ok) {
    redirect(`/orgs/${result.orgSlug}/manage?claimed=1`);
  }
  return renderError(result.reason);
}

function renderError(reason: string) {
  const copy = ERROR_COPY[reason] ?? {
    title: "Verification failed",
    body: "We couldn't complete this verification. Try starting the claim again.",
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a]">{copy.title}</h1>
          <p className="text-sm text-gray-600 mt-3">{copy.body}</p>
          <div className="mt-6">
            <Link
              href="/claim"
              className="inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to claim flow
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
