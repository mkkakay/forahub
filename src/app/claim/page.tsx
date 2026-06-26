"use client";

// Account-first claim flow.
//
// The legacy "type your work email + name → wait for verification email"
// form is gone. The only user-facing path is:
//
//   1. Pick the org (or arrive with ?org=slug pre-picked).
//   2. If not signed in → "Sign in / Sign up" panel. The signup confirmation
//      is the only email anyone ever receives.
//   3. If signed in:
//        - email domain matches the org's domain (non-free-mail) → one
//          click grants a manager seat via /api/orgs/request-claim.
//        - otherwise → one click queues the row at pending_admin_review.
//
// /api/orgs/request-claim is the single source of truth — this page only
// renders state; it never bypasses the server's predicate.

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck, Building2, Loader2, AlertCircle, X,
  Sparkles, Info, Zap, Clock, ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import OrgCombobox from "@/app/submit/_components/OrgCombobox";
import type { OrgSuggestion } from "@/app/submit/_components/orgTypes";
import { parseApiResponse } from "@/lib/admin/fetchJson";
import { supabase } from "@/lib/supabase/client";
import { resolveClaimMessage, CLAIM_GENERIC_ERROR, type ClaimMessage } from "@/lib/claim/messages";
import OAuthButtons from "@/components/auth/OAuthButtons";

type Step = "pick" | "decide" | "queued" | "already_owned";

interface RequestResponse {
  success?: boolean;
  email_sent?: boolean;
  error?: string;
  message?: string;
  verification_path?: "domain_match" | "admin_review" | "oauth_session";
  org_slug?: string;
  own_org?: boolean;
  instant?: boolean;
  queued?: boolean;
  manage_url?: string;
}

interface AuthState {
  loading: boolean;
  signedIn: boolean;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

function emailDomainOf(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

function normalizeOrgDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export default function ClaimPage() {
  // Suspense gate keeps the useSearchParams hook compatible with static
  // prerendering — Next 14 fails to export the page otherwise.
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-slate-900" />}>
      <ClaimInner />
    </Suspense>
  );
}

function ClaimInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledSlug = searchParams.get("org");

  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<OrgSuggestion | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ClaimMessage | null>(null);
  const [auth, setAuth] = useState<AuthState>({
    loading: true,
    signedIn: false,
    email: null,
    emailVerified: false,
    displayName: null,
  });

  // Pull the signed-in user once on mount. We trust email_confirmed_at as
  // the proof of mailbox control — same predicate the server applies.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const user = u.user;
        if (!user) {
          if (!cancelled) setAuth({ loading: false, signedIn: false, email: null, emailVerified: false, displayName: null });
          return;
        }
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        let displayName: string | null =
          (typeof meta.name === "string" && meta.name.trim()) ||
          (typeof meta.full_name === "string" && meta.full_name.trim()) ||
          null;
        if (!displayName) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", user.id)
              .maybeSingle();
            displayName = (profile as { full_name: string | null } | null)?.full_name?.trim() || null;
          } catch { /* anonymous read failure — fall through */ }
        }
        if (!cancelled) setAuth({
          loading: false,
          signedIn: true,
          email: user.email ?? null,
          emailVerified: !!user.email_confirmed_at,
          displayName,
        });
      } catch {
        if (!cancelled) setAuth({ loading: false, signedIn: false, email: null, emailVerified: false, displayName: null });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pre-pick from ?org=slug so the auth round-trip lands on the decide step.
  useEffect(() => {
    if (!prefilledSlug || picked) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orgs/search?q=${encodeURIComponent(prefilledSlug)}`);
        if (!res.ok) return;
        const json = await res.json();
        const list = ((json?.data ?? []) as OrgSuggestion[]);
        const match = list.find(o => o.slug === prefilledSlug);
        if (match && !cancelled) {
          setPicked(match);
          setSearch(match.name);
          setStep("decide");
        }
      } catch { /* network failure — user can still pick manually */ }
    })();
    return () => { cancelled = true; };
  }, [prefilledSlug, picked]);

  function chooseOrg(org: OrgSuggestion) {
    setPicked(org);
    setSearch(org.name);
    setFeedback(null);
    setStep("decide");
    // Reflect the pick in the URL so a redirect-after-signin lands us back here.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("org", org.slug);
      window.history.replaceState(null, "", url.toString());
    }
  }

  function resetPick() {
    setPicked(null);
    setStep("pick");
    setFeedback(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("org");
      window.history.replaceState(null, "", url.toString());
    }
  }

  async function submitClaim() {
    if (!picked) return;
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orgs/request-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_slug: picked.slug,
          name: auth.displayName ?? null,
        }),
      });
      const parsed = await parseApiResponse<RequestResponse>(res);
      if (!parsed.ok) {
        const code = parsed.error;
        const orgSlugCtx = picked.slug;
        if (code === "already_owned_by_you") {
          setStep("already_owned");
          return;
        }
        if (code === "signin_required") {
          // Defensive — the UI normally prevents the API call when not
          // signed in, but if we somehow get here, surface a friendly nudge.
          setFeedback({
            kind: "info",
            text: "Sign in first to claim this organization.",
            cta: { label: "Sign in", href: `/auth/signin?next=${encodeURIComponent(`/claim?org=${orgSlugCtx}`)}` },
          });
          return;
        }
        setFeedback(resolveClaimMessage(code, { orgSlug: orgSlugCtx }));
        return;
      }
      if (parsed.data.instant && (parsed.data.manage_url || parsed.data.org_slug)) {
        const target = parsed.data.manage_url ?? `/orgs/${parsed.data.org_slug}/manage`;
        router.push(target);
        return;
      }
      if (parsed.data.queued) {
        setStep("queued");
        return;
      }
      // Successful response without instant/queued shouldn't happen with
      // the new API, but show a graceful info state if it does.
      setFeedback({
        kind: "info",
        text: parsed.data.message ?? "Your request has been received.",
      });
    } catch {
      setFeedback(CLAIM_GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  const orgDomain = useMemo(() => normalizeOrgDomain(picked?.domain), [picked]);
  const authDomain = useMemo(() => emailDomainOf(auth.email), [auth.email]);
  const domainMatch = !!(orgDomain && authDomain && orgDomain === authDomain);

  const claimHref = picked
    ? `/claim?org=${encodeURIComponent(picked.slug)}`
    : "/claim";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10 md:py-16">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mb-4">
            <BadgeCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2a4a] dark:text-slate-100 tracking-tight">
            Claim your organization
          </h1>
          <p className="text-base text-gray-600 dark:text-slate-300 mt-3 max-w-lg mx-auto">
            Sign in with your work email and we&apos;ll grant you manager access in one click.
          </p>
        </header>

        <ol className="flex items-center justify-center gap-2 mb-8 text-xs font-semibold uppercase tracking-wider">
          <StepDot label="Pick org" active={step === "pick"} done={step !== "pick"} />
          <span className="text-gray-300 dark:text-slate-600">—</span>
          <StepDot label="Account" active={step === "decide" && !auth.signedIn} done={step !== "pick" && auth.signedIn} />
          <span className="text-gray-300 dark:text-slate-600">—</span>
          <StepDot label="Claim" active={step === "decide" && auth.signedIn} done={step === "queued" || step === "already_owned"} />
        </ol>

        {step === "pick" && (
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 md:p-6">
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Find your organization
            </label>
            <OrgCombobox
              value={search}
              onChange={setSearch}
              onPicked={chooseOrg}
              placeholder="Start typing your organization name…"
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">
              Don&apos;t see your org? You can still submit events without claiming — head back to{" "}
              <Link href="/submit" className="text-blue-600 hover:underline font-medium">/submit</Link>.
            </p>
          </section>
        )}

        {step === "decide" && picked && (
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 md:p-6">
            <OrgPreviewCard org={picked} onChange={resetPick} />

            {!orgDomain && (
              <div className="mt-4 flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <span>
                  We don&apos;t have a verified domain on file for this organization, so we can&apos;t auto-grant manager access yet. Email{" "}
                  <a href="mailto:admin@forahub.org" className="font-semibold underline">admin@forahub.org</a> and we&apos;ll help.
                </span>
              </div>
            )}

            {auth.loading && (
              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-slate-400 py-6">
                <Loader2 size={14} className="animate-spin" /> Checking your session…
              </div>
            )}

            {!auth.loading && !auth.signedIn && orgDomain && (
              <SignInPrompt orgName={picked.name} orgDomain={orgDomain} next={claimHref} />
            )}

            {!auth.loading && auth.signedIn && !auth.emailVerified && (
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
                Your account email isn&apos;t verified yet. Open the confirmation link we sent at signup, then come back to claim this org.
              </div>
            )}

            {!auth.loading && auth.signedIn && auth.emailVerified && orgDomain && (
              <ClaimAction
                orgName={picked.name}
                orgDomain={orgDomain}
                authEmail={auth.email}
                domainMatch={domainMatch}
                submitting={submitting}
                onSubmit={submitClaim}
                feedback={feedback}
                dismissFeedback={() => setFeedback(null)}
              />
            )}
          </section>
        )}

        {step === "queued" && picked && (
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 shadow-sm p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Clock className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-slate-100">Your claim for {picked.name} is queued for review</h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">
              Your account email isn&apos;t on <span className="font-mono">@{orgDomain ?? picked.domain}</span>, so an admin will review your claim. We&apos;ll email you with the decision — usually within 2 business days.
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">
              Need to add context? Reply to your signup confirmation email or write to{" "}
              <a href="mailto:admin@forahub.org" className="text-blue-700 hover:underline font-medium">admin@forahub.org</a>.
            </p>
            <button
              type="button"
              onClick={resetPick}
              className="mt-6 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              Claim a different org
            </button>
          </section>
        )}

        {step === "already_owned" && picked && (
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 shadow-sm p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0f2a4a] dark:text-slate-100">You already manage {picked.name}</h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">
              You&apos;re signed in as a verified manager. Open the manage page to update the org profile.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/orgs/${picked.slug}/manage`}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                Manage organization →
              </Link>
              <button
                type="button"
                onClick={resetPick}
                className="text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Claim a different org
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const color = done
    ? "text-green-700"
    : active
    ? "text-[#0f2a4a] dark:text-slate-100"
    : "text-gray-400 dark:text-slate-500";
  return <span className={color}>{label}</span>;
}

function OrgPreviewCard({ org, onChange }: { org: OrgSuggestion; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-3">
      <div className="shrink-0 w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt="" className="max-w-full max-h-full object-contain p-1" />
        ) : (
          <Building2 className="w-5 h-5 text-gray-400 dark:text-slate-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100 truncate inline-flex items-center gap-1.5">
          {org.name}
          {org.is_verified && org.is_claimed && (
            <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Verified organization" />
          )}
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          {org.domain ? <>Domain on file: <span className="font-semibold">@{org.domain}</span></> : "No domain on file"}
        </p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800"
      >
        Change
      </button>
    </div>
  );
}

function SignInPrompt({ orgName, orgDomain, next }: { orgName: string; orgDomain: string; next: string }) {
  const nextParam = encodeURIComponent(next);
  return (
    <div className="mt-5 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0f2a4a] dark:text-slate-100">Sign in to claim {orgName}</p>
            <p className="text-xs text-gray-700 dark:text-slate-200 mt-0.5">
              Most users sign in with Google or Microsoft — it&apos;s instant, no email confirmation. Use your <span className="font-mono">@{orgDomain}</span> work account and claiming happens automatically.
            </p>
          </div>
        </div>
      </div>

      <OAuthButtons next={next} />

      <div className="border-t border-gray-100 dark:border-slate-800 pt-3 text-xs text-center text-gray-500 dark:text-slate-400 space-y-1.5">
        <p>
          Prefer email?{" "}
          <Link href={`/auth/signup?next=${nextParam}`} className="text-blue-700 hover:underline font-semibold">
            Sign up with email
          </Link>
        </p>
        <p>
          Already have an account?{" "}
          <Link href={`/auth/signin?next=${nextParam}`} className="text-blue-700 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function ClaimAction({
  orgName, orgDomain, authEmail, domainMatch, submitting, onSubmit, feedback, dismissFeedback,
}: {
  orgName: string;
  orgDomain: string;
  authEmail: string | null;
  domainMatch: boolean;
  submitting: boolean;
  onSubmit: () => void;
  feedback: ClaimMessage | null;
  dismissFeedback: () => void;
}) {
  if (domainMatch) {
    return (
      <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-900">Eligible for one-click claim</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              You&apos;re signed in as <span className="font-semibold break-all">{authEmail}</span> — that&apos;s a verified <span className="font-mono">@{orgDomain}</span> address.
            </p>
          </div>
        </div>
        {feedback && (
          <div className="mt-3">
            <FeedbackPill feedback={feedback} onDismiss={dismissFeedback} />
          </div>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-md transition-all"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {submitting ? "Granting…" : `Claim ${orgName} now`}
        </button>
      </div>
    );
  }
  // Signed in but domain doesn't match (or auth domain is free-mail). Single
  // CTA queues the row for admin review — no second email.
  return (
    <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
          <Info className="w-4 h-4 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">Needs admin review</p>
          <p className="text-xs text-amber-900 mt-0.5">
            Your account email <span className="font-semibold break-all">{authEmail}</span> isn&apos;t on the org&apos;s domain (<span className="font-mono">@{orgDomain}</span>), so an admin will review your request before granting access. We&apos;ll email you with the decision.
          </p>
        </div>
      </div>
      {feedback && (
        <div className="mt-3">
          <FeedbackPill feedback={feedback} onDismiss={dismissFeedback} />
        </div>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-[#0f2a4a] hover:bg-[#1a3f6e] disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-md transition-all"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        {submitting ? "Submitting…" : "Request review"}
      </button>
    </div>
  );
}

function FeedbackPill({ feedback, onDismiss }: { feedback: ClaimMessage; onDismiss: () => void }) {
  const palette =
    feedback.kind === "positive"
      ? { wrap: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: "text-emerald-600", dismiss: "text-emerald-500 hover:text-emerald-700", Icon: Sparkles }
      : feedback.kind === "info"
      ? { wrap: "bg-blue-50 border-blue-200 text-blue-800", icon: "text-blue-600", dismiss: "text-blue-500 hover:text-blue-700", Icon: Info }
      : { wrap: "bg-red-50 border-red-200 text-red-700", icon: "text-red-600", dismiss: "text-red-500 hover:text-red-700", Icon: AlertCircle };
  const Icon = palette.Icon;
  return (
    <div className={`flex items-start gap-2 text-sm border rounded-xl px-3 py-2 ${palette.wrap}`}>
      <Icon size={14} className={`mt-0.5 shrink-0 ${palette.icon}`} />
      <span className="flex-1">
        {feedback.text}
        {feedback.cta && (
          <>
            {" "}
            <Link href={feedback.cta.href} className="font-semibold underline">
              {feedback.cta.label}
            </Link>
          </>
        )}
      </span>
      <button type="button" onClick={onDismiss} className={palette.dismiss}>
        <X size={14} />
      </button>
    </div>
  );
}
