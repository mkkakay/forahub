"use client";

// Single-button client action for an already-validated invite. The server
// page does all the eligibility checks; this just POSTs the token to the
// accept endpoint and routes to the manage page on success.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

const FRIENDLY: Record<string, string> = {
  signin_required: "Sign in first, then click the link in the invite email again.",
  invite_not_found: "We couldn't find this invitation. Ask the inviting manager to send a fresh one.",
  invite_expired: "This invitation has expired. Ask the inviting manager to resend it.",
  invite_already_accepted: "This invitation has already been accepted — you can head to the manage page.",
  invite_revoked: "This invitation was revoked. Ask the inviting manager to send a fresh one.",
  invite_not_pending: "This invitation is no longer pending.",
  wrong_account: "You're signed in as the wrong account. Sign in with the invited email to accept.",
  seat_failed: "We couldn't add you as a manager. Please try again, or email admin@forahub.org.",
};

export default function AcceptInviteAction({
  token, orgSlug, orgName,
}: { token: string; orgSlug: string; orgName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orgs/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        const code = json?.error as string | undefined;
        setError(code && FRIENDLY[code] ? FRIENDLY[code] : "Something went wrong. Please try again, or email admin@forahub.org.");
        return;
      }
      const dest = json.manage_url ?? `/orgs/${orgSlug}/manage?invited=1`;
      router.push(dest);
    } catch {
      setError("Something went wrong. Please try again, or email admin@forahub.org.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-md"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
        {busy ? "Accepting…" : `Accept and manage ${orgName} →`}
      </button>
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
          <span className="flex-1">{error}</span>
        </div>
      )}
    </div>
  );
}
