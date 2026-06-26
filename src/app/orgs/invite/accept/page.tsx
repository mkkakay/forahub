// Server-rendered landing for invitation links. We perform all token /
// expiry / wrong-account / already-accepted checks here so the page reads
// exactly the same as the API does — there's no client-only branch where a
// stale UI claim can drift from the server's predicate. When the invite is
// valid AND the signed-in user matches the invited_email, we render a
// minimal client component that calls the accept endpoint and routes to
// the manage page.

import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, LogIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findInviteByToken } from "@/lib/orgs/invites";
import { isOrgManager } from "@/lib/orgs/managers";
import AcceptInviteAction from "./AcceptInviteAction";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { token?: string };
}

interface ErrorCopy {
  icon: "expired" | "error" | "ok";
  title: string;
  body: string;
}

const ERROR_COPY: Record<string, ErrorCopy> = {
  missing_token: {
    icon: "error",
    title: "This invitation link is incomplete",
    body: "Open the invitation email and click the button there. If the email never arrived, ask the inviting manager to resend it.",
  },
  invite_not_found: {
    icon: "error",
    title: "This invitation isn't valid",
    body: "It may have been revoked or never existed. Ask the inviting manager to send a fresh invitation.",
  },
  invite_revoked: {
    icon: "error",
    title: "This invitation was revoked",
    body: "The team manager cancelled this invitation. Ask them to send a new one if you still need access.",
  },
  invite_expired: {
    icon: "expired",
    title: "This invitation has expired",
    body: "Invitations are valid for 7 days. Ask the inviting manager to resend it.",
  },
  invite_already_accepted: {
    icon: "ok",
    title: "This invitation has already been accepted",
    body: "You're already a manager of this organization — head to the manage page to continue.",
  },
};

export default async function AcceptInvitePage({ searchParams }: Props) {
  const token = (searchParams.token ?? "").trim();
  if (!token) return renderError("missing_token", null);

  const invite = await findInviteByToken(token);
  if (!invite) return renderError("invite_not_found", null);

  const { data: orgRow } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name")
    .eq("slug", invite.org_slug)
    .maybeSingle();
  const orgName = (orgRow as { name: string } | null)?.name ?? invite.org_slug;

  if (invite.status === "revoked") return renderError("invite_revoked", { orgSlug: invite.org_slug, orgName });
  if (invite.status === "expired") return renderError("invite_expired", { orgSlug: invite.org_slug, orgName });
  if (invite.status === "accepted") return renderError("invite_already_accepted", { orgSlug: invite.org_slug, orgName });
  if (invite.status !== "pending") return renderError("invite_not_found", { orgSlug: invite.org_slug, orgName });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return renderError("invite_expired", { orgSlug: invite.org_slug, orgName });
  }

  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const user = u.user;

  // Not signed in → bounce through sign-in with next= so we re-enter this
  // page once the session cookie is set. OAuth-primary signin handles the
  // happy path; email/password still works.
  if (!user || !user.email_confirmed_at) {
    return renderSignInGate({
      orgName,
      invitedEmail: invite.invited_email,
      token,
    });
  }

  const authEmail = (user.email ?? "").trim().toLowerCase();
  const invitedEmail = invite.invited_email.trim().toLowerCase();
  if (authEmail !== invitedEmail) {
    return renderWrongAccount({
      orgName,
      invitedEmail: invite.invited_email,
      currentEmail: user.email ?? "(unknown)",
      token,
    });
  }

  // If they're already a manager (e.g. they joined via domain-match earlier),
  // skip the accept step and send them straight to manage.
  if (await isOrgManager(invite.org_slug, user.id)) {
    redirect(`/orgs/${invite.org_slug}/manage?invited=1`);
  }

  // Happy path: render the accept button. The client action calls
  // /api/orgs/invite/accept and on success routes to /manage.
  return renderAcceptCta({
    orgName,
    orgSlug: invite.org_slug,
    invitedEmail: invite.invited_email,
    inviterEmail: invite.invited_by_email,
    note: invite.note,
    token,
  });
}

function renderError(
  code: string,
  ctx: { orgSlug: string; orgName: string } | null,
) {
  const copy = ERROR_COPY[code] ?? ERROR_COPY.invite_not_found;
  const bgClasses =
    copy.icon === "expired" ? "bg-amber-100" :
    copy.icon === "ok" ? "bg-emerald-100" : "bg-red-100";
  const fgClasses =
    copy.icon === "expired" ? "text-amber-700" :
    copy.icon === "ok" ? "text-emerald-700" : "text-red-700";
  const Icon = copy.icon === "expired" ? Clock : copy.icon === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 text-center">
          <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${bgClasses}`}>
            <Icon className={`w-7 h-7 ${fgClasses}`} />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-slate-100">{copy.title}</h1>
          {ctx?.orgName && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Organization: <span className="font-semibold">{ctx.orgName}</span></p>
          )}
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-3">{copy.body}</p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {ctx?.orgSlug && copy.icon === "ok" ? (
              <Link
                href={`/orgs/${ctx.orgSlug}/manage`}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                Go to manage page →
              </Link>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to ForaHub
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function renderSignInGate(opts: { orgName: string; invitedEmail: string; token: string }) {
  const next = encodeURIComponent(`/orgs/invite/accept?token=${opts.token}`);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <LogIn className="w-7 h-7 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-slate-100">Sign in to accept your invitation</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-3">
            You&apos;ve been invited to co-manage <span className="font-semibold">{opts.orgName}</span> on ForaHub. Sign in with <span className="font-mono break-all text-[#0f2a4a] dark:text-slate-100">{opts.invitedEmail}</span> to accept — Google or Microsoft if you have a work account, otherwise email + password.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/auth/signup?next=${next}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-md"
            >
              Sign in or create account →
            </Link>
            <Link
              href={`/auth/signin?next=${next}`}
              className="text-xs text-blue-700 hover:underline font-semibold"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function renderWrongAccount(opts: {
  orgName: string;
  invitedEmail: string;
  currentEmail: string;
  token: string;
}) {
  const next = encodeURIComponent(`/orgs/invite/accept?token=${opts.token}`);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 shadow-sm p-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-amber-700" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-slate-100">You&apos;re signed in as the wrong account</h1>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-3">
            This invitation was sent to <span className="font-mono text-[#0f2a4a] dark:text-slate-100 break-all">{opts.invitedEmail}</span>, but you&apos;re currently signed in as <span className="font-mono break-all">{opts.currentEmail}</span>. Sign out and sign back in with the invited email to accept.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/auth/signin?next=${next}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-md"
            >
              Sign in as {opts.invitedEmail.slice(0, 32)}{opts.invitedEmail.length > 32 ? "…" : ""} →
            </Link>
            <Link
              href="/"
              className="text-xs text-blue-700 hover:underline font-semibold"
            >
              Back to ForaHub
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function renderAcceptCta(opts: {
  orgName: string;
  orgSlug: string;
  invitedEmail: string;
  inviterEmail: string | null;
  note: string | null;
  token: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 shadow-sm p-6 md:p-8">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f2a4a] dark:text-slate-100 text-center">
            Join {opts.orgName} as a co-manager
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-300 mt-3 text-center">
            You&apos;re signed in as <span className="font-mono text-[#0f2a4a] dark:text-slate-100 break-all">{opts.invitedEmail}</span>.
            {opts.inviterEmail && (
              <> Invited by <span className="font-mono text-[#0f2a4a] dark:text-slate-100 break-all">{opts.inviterEmail}</span>.</>
            )}
          </p>
          {opts.note && (
            <div className="mt-5 bg-gray-50 dark:bg-slate-900 border-l-4 border-[#4ea8de] rounded-r-md px-4 py-3 text-left">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">Note from inviter</p>
              <p className="text-sm text-gray-800 dark:text-slate-100 italic">&quot;{opts.note}&quot;</p>
            </div>
          )}
          <div className="mt-6">
            <AcceptInviteAction token={opts.token} orgSlug={opts.orgSlug} orgName={opts.orgName} />
          </div>
        </div>
      </main>
    </div>
  );
}
