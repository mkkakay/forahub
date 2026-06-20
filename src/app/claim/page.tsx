"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Building2, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, X, User, Sparkles, Info, Zap, LogIn,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import OrgCombobox from "@/app/submit/_components/OrgCombobox";
import type { OrgSuggestion } from "@/app/submit/_components/orgTypes";
import { parseApiResponse } from "@/lib/admin/fetchJson";
import { supabase } from "@/lib/supabase/client";
import { isFreeMailDomain } from "@/lib/email/freeMailDomains";
import { resolveClaimMessage, CLAIM_GENERIC_ERROR, type ClaimMessage } from "@/lib/claim/messages";

type Step = "pick" | "email" | "submitted" | "already_owned";

interface RequestResponse {
  success?: boolean;
  email_sent?: boolean;
  dev_verify_url?: string;
  error?: string;
  message?: string;
  org_domain?: string;
  verification_path?: "domain_match" | "admin_review" | "oauth_session";
  /** Present when the server returns already_owned_by_you OR an instant
   *  grant — both flows surface a Manage CTA. */
  org_slug?: string;
  own_org?: boolean;
  /** Server signals instant=true when the signed-in user's verified auth
   *  email already qualifies for this org (one-step path). */
  instant?: boolean;
  manage_url?: string;
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
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<OrgSuggestion | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  // `signedInName` is non-null when we successfully read a name from the
  // current session (OAuth user_metadata or the profiles row). In that case
  // we skip the "Your name" form field and pass the captured name through.
  const [signedInName, setSignedInName] = useState<string | null>(null);
  // Auth email + verified state drive the one-step instant-grant UI: if the
  // signed-in account already has a verified qualifying email, the form is
  // replaced with a single "Claim instantly" button.
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [signedInEmailVerified, setSignedInEmailVerified] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [step, setStep] = useState<Step>("pick");
  const [submitting, setSubmitting] = useState(false);
  // `feedback` carries the resolved ClaimMessage — never a raw error code.
  // The renderer below switches on feedback.kind, so positive states aren't
  // styled as errors.
  const [feedback, setFeedback] = useState<ClaimMessage | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [verificationPath, setVerificationPath] = useState<"domain_match" | "admin_review" | null>(null);
  const [ownedOrgSlug, setOwnedOrgSlug] = useState<string | null>(null);

  // Pull the signed-in user's identity once on mount. We capture:
  // - email + email_confirmed_at: drives the instant-grant button (same
  //   predicate the server uses; matches feel snappier if the UI agrees).
  // - display name: from user_metadata (OAuth) or profiles.full_name. If
  //   neither is set we render the "Your name" field as before.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const user = u.user;
        if (!user) { if (!cancelled) setAuthReady(true); return; }
        if (!cancelled) {
          setSignedInEmail(user.email ?? null);
          setSignedInEmailVerified(!!user.email_confirmed_at);
        }
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const fromMeta = (typeof meta.name === "string" && meta.name.trim()) ||
                         (typeof meta.full_name === "string" && meta.full_name.trim()) ||
                         null;
        if (fromMeta) { if (!cancelled) setSignedInName(fromMeta); return; }
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        const fromProfile = (profile as { full_name: string | null } | null)?.full_name?.trim() || null;
        if (fromProfile && !cancelled) setSignedInName(fromProfile);
      } catch {
        // Anonymous browse — fine, the form will ask for the name.
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function chooseOrg(org: OrgSuggestion) {
    setPicked(org);
    setSearch(org.name);
    setFeedback(null);
    setStep("email");
  }

  function resetPick() {
    setPicked(null);
    setStep("pick");
    setEmail("");
    setFeedback(null);
    setDevUrl(null);
    setEmailSent(null);
    setVerificationPath(null);
    setOwnedOrgSlug(null);
  }

  /** Submit a claim request. `opts.useAuthEmail` flips the request into the
   *  one-step instant-grant path: we send the auth email (and skip the form
   *  validation that requires a typed-in email + name). The server
   *  authoritatively decides whether the grant is instant; this is just a
   *  fast path for the UI. */
  async function submitRequest(opts: { useAuthEmail?: boolean } = {}, e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!picked) return;
    setFeedback(null);

    const submittedEmail = opts.useAuthEmail
      ? (signedInEmail ?? "").trim()
      : email.trim();
    if (!opts.useAuthEmail) {
      if (!submittedEmail || !submittedEmail.includes("@")) {
        setFeedback({ kind: "error", text: "Please enter a valid email address." });
        return;
      }
    }
    const finalName = signedInName ?? name.trim();
    if (!opts.useAuthEmail && !signedInName && finalName.length < 2) {
      setFeedback({
        kind: "error",
        text: "Please enter your name so the verification email reads cleanly.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orgs/request-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_slug: picked.slug,
          email: submittedEmail,
          name: finalName,
        }),
      });
      const parsed = await parseApiResponse<RequestResponse>(res);
      if (!parsed.ok) {
        const code = parsed.error;
        const orgSlugCtx = picked?.slug ?? null;
        const msg = resolveClaimMessage(code, { orgSlug: orgSlugCtx });
        if (code === "already_owned_by_you") {
          setOwnedOrgSlug(orgSlugCtx);
          setStep("already_owned");
          return;
        }
        setFeedback(msg);
        return;
      }
      // One-step grant: the signed-in user's verified email qualifies; the
      // server already seated them. Go straight to /manage.
      if (parsed.data.instant && (parsed.data.manage_url || parsed.data.org_slug)) {
        const target = parsed.data.manage_url ?? `/orgs/${parsed.data.org_slug}/manage`;
        router.push(target);
        return;
      }
      setEmailSent(!!parsed.data.email_sent);
      setDevUrl(parsed.data.dev_verify_url ?? null);
      const path = parsed.data.verification_path;
      setVerificationPath(path === "domain_match" || path === "admin_review" ? path : null);
      setStep("submitted");
    } catch {
      // Network-level failure: fall back to the generic friendly sentence
      // — never surface the raw Error message string.
      setFeedback(CLAIM_GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  const orgDomain = normalizeOrgDomain(picked?.domain);
  const authDomain = emailDomainOf(signedInEmail);
  // Does the signed-in account's verified email qualify for this org? The
  // server is the authority — this is just to swap the UI between the
  // "Claim instantly" panel and the email-verification form.
  const oneStepEligible = !!(
    picked &&
    orgDomain &&
    signedInEmail &&
    signedInEmailVerified &&
    authDomain &&
    authDomain === orgDomain &&
    !isFreeMailDomain(authDomain)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10 md:py-16">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 mb-4">
            <BadgeCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2a4a] tracking-tight">
            Claim your organization
          </h1>
          <p className="text-base text-gray-600 mt-3 max-w-lg mx-auto">
            Verify your email to unlock the verified badge and manage your org&apos;s presence on ForaHub.
          </p>
        </header>

        <ol className="flex items-center justify-center gap-2 mb-8 text-xs font-semibold uppercase tracking-wider">
          <StepDot label="Pick org" active={step === "pick"} done={step !== "pick"} />
          <span className="text-gray-300">—</span>
          <StepDot label="Enter email" active={step === "email"} done={step === "submitted"} />
          <span className="text-gray-300">—</span>
          <StepDot label="Verify" active={step === "submitted"} done={false} />
        </ol>

        {step === "pick" && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Find your organization
            </label>
            <OrgCombobox
              value={search}
              onChange={setSearch}
              onPicked={chooseOrg}
              placeholder="Start typing your organization name…"
            />
            <p className="text-xs text-gray-500 mt-3">
              Don&apos;t see your org? You can still submit events without claiming — head back to{" "}
              <Link href="/submit" className="text-blue-600 hover:underline font-medium">
                /submit
              </Link>
              .
            </p>
          </section>
        )}

        {step === "email" && picked && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
            <OrgPreviewCard org={picked} onChange={resetPick} />

            {!orgDomain && (
              <div className="mt-4 flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <span>
                  We don&apos;t have a verified domain on file for this organization, so we can&apos;t complete the claim
                  by email yet. To list events, use the{" "}
                  <Link href="/submit" className="font-semibold underline">standard submission form</Link>.
                </span>
              </div>
            )}

            {/* One-step instant-grant panel: the signed-in account already
                holds a verified email at the org's domain (OAuth or
                confirmed signup), so a second verification email would just
                re-prove a fact Supabase already knows. */}
            {oneStepEligible && orgDomain && (
              <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-900">One-step claim available</p>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      You&apos;re signed in as <span className="font-semibold break-all">{signedInEmail}</span> — that&apos;s a verified <span className="font-mono">@{orgDomain}</span> address, so no second email is needed.
                    </p>
                  </div>
                </div>
                {feedback && (
                  <div className="mt-3">
                    <FeedbackPill feedback={feedback} onDismiss={() => setFeedback(null)} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => submitRequest({ useAuthEmail: true })}
                  disabled={submitting}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-md transition-all"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {submitting ? "Granting…" : `Claim ${picked.name} now`}
                </button>
                <button
                  type="button"
                  onClick={() => setSignedInEmailVerified(false) /* lets the user fall through to the email form if they want a different work email */}
                  className="mt-2 w-full text-xs text-emerald-700 hover:text-emerald-900"
                >
                  Use a different work email instead
                </button>
              </div>
            )}

            {/* Sign-in nudge for the anonymous case — Google = zero extra
                emails, email-signup = the single Supabase confirmation. */}
            {authReady && !signedInEmail && orgDomain && !oneStepEligible && (
              <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <LogIn className="w-4 h-4 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#0f2a4a]">Skip the extra email</p>
                    <p className="text-xs text-gray-700 mt-0.5">
                      Sign in with your <span className="font-mono">@{orgDomain}</span> work email and we&apos;ll grant manager access in one step — no second verification needed.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/auth/signin?next=${encodeURIComponent(`/claim`)}`}
                  className="mt-4 inline-flex items-center justify-center gap-2 w-full bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
                >
                  <LogIn size={14} /> Sign in to claim instantly
                </Link>
                <p className="mt-2 text-[11px] text-gray-500 text-center">
                  Or keep going with email verification below.
                </p>
              </div>
            )}

            <form
              onSubmit={(e) => submitRequest({}, e)}
              className={`mt-5 space-y-3 ${oneStepEligible ? "hidden" : ""}`}
            >
              {signedInName ? (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  Signed in as <span className="font-semibold">{signedInName}</span>. We&apos;ll use this on your claim.
                </p>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Your name
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      minLength={2}
                      className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] transition-colors"
                    />
                  </div>
                </>
              )}

              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider pt-1">
                Your work email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={orgDomain ? `you@${orgDomain}` : "you@yourorg.org"}
                  required
                  className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] transition-colors"
                />
              </div>
              <p className="text-xs text-gray-500">
                {orgDomain ? (
                  <>Must be a work email at <span className="font-semibold">@{orgDomain}</span>.</>
                ) : (
                  <>We&apos;ll only allow claims when the email domain matches the org&apos;s verified domain on file.</>
                )}
              </p>

              {/* Feedback pill — switches styling on `kind` so positive /
                  info states never render as a red error. */}
              {feedback && <FeedbackPill feedback={feedback} onDismiss={() => setFeedback(null)} />}

              <button
                type="submit"
                disabled={submitting || !orgDomain}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-md transition-all"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                {submitting ? "Sending…" : "Send verification link"}
              </button>
            </form>
          </section>
        )}

        {step === "submitted" && picked && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0f2a4a]">We&apos;ve sent a verification link to {email}</h2>
            <p className="text-sm text-gray-600 mt-2">
              It usually arrives within a minute, but some corporate email systems can take a few minutes to deliver the first message from a new sender.
            </p>
            {verificationPath === "admin_review" && (
              <p className="text-sm text-gray-600 mt-2">
                After you click the link, we&apos;ll review your request and follow up by email — usually within 2 business days.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-3">
              The link is valid for 1 hour. If it doesn&apos;t show up, check your spam folder — and ask your IT team to allow mail from <span className="font-mono">hello@forahub.org</span> if your inbox filters it.
            </p>

            {/* Belt-and-suspenders: the server already withholds dev_verify_url
                in production, but also gate the UI on NODE_ENV so a stray
                response can't surface the raw token in a prod build. */}
            {process.env.NODE_ENV !== "production" && emailSent === false && devUrl && (
              <div className="mt-5 text-left bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-900 font-semibold mb-1">
                  Dev mode: email service is not configured
                </p>
                <p className="text-xs text-amber-800 mb-2">
                  Use this link to complete verification:
                </p>
                <a href={devUrl} className="text-xs text-blue-700 hover:underline break-all">
                  {devUrl}
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={resetPick}
              className="mt-6 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              Start over
            </button>
          </section>
        )}

        {/* Positive end-state: the submitter already owns the org. NOT an
            error — green styling, action-oriented CTA. */}
        {step === "already_owned" && picked && (
          <section className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0f2a4a]">You already manage {picked.name}</h2>
            <p className="text-sm text-gray-600 mt-2">
              You&apos;re signed in as a verified manager. Open the manage page to update the org profile.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/orgs/${ownedOrgSlug ?? picked.slug}/manage`}
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

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  const color = done
    ? "text-green-700"
    : active
    ? "text-[#0f2a4a]"
    : "text-gray-400";
  return <span className={color}>{label}</span>;
}

function OrgPreviewCard({ org, onChange }: { org: OrgSuggestion; onChange: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3">
      <div className="shrink-0 w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt="" className="max-w-full max-h-full object-contain p-1" />
        ) : (
          <Building2 className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#0f2a4a] truncate inline-flex items-center gap-1.5">
          {org.name}
          {org.is_verified && org.is_claimed && (
            <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Verified organization" />
          )}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
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
