"use client";

// First-sign-in welcome banner. Lives at the top of /dashboard so a freshly
// signed-up user immediately sees the three things that turn them from a
// reader into a contributor: claim their org, submit an event, share it.
//
// Dismissal is persisted in localStorage (`forahub_welcome_dismissed`) — a
// soft signal, not a security flag. We deliberately skip persisting to
// profiles because the cross-device "show me once more" cost is low and
// the localStorage flow keeps the banner tier-1 client-only without a
// round-trip on every page load.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, Building2, CalendarPlus, Share2, ArrowRight, X } from "lucide-react";

const DISMISS_KEY = "forahub_welcome_dismissed";

export default function WelcomeOnboardingBanner() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (!dismissed) setShow(true);
    } catch {
      // Storage unavailable (private mode, etc.) — show by default; the user
      // can still dismiss for the current session via the X button.
      setShow(true);
    }
  }, []);

  function dismiss() {
    setShow(false);
    try { window.localStorage.setItem(DISMISS_KEY, new Date().toISOString()); } catch {}
  }

  if (!mounted || !show) return null;

  return (
    <section
      aria-labelledby="welcome-onboarding-heading"
      className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-[#0f2a4a] via-[#173a63] to-[#1f4d83] text-white shadow-lg"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome"
        className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>

      <div className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-[#4ea8de]/20 text-[#bfe1ff] border border-[#4ea8de]/40">
            <Sparkles className="w-3 h-3" /> Welcome
          </span>
        </div>
        <h2
          id="welcome-onboarding-heading"
          className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight"
        >
          You&apos;re in. Let&apos;s put your work on the map.
        </h2>
        <p className="mt-2 text-sm md:text-[15px] text-white/80 max-w-2xl">
          ForaHub is the one-stop hub for global development, humanitarian, climate, health, and policy events. Take three short steps and your team becomes part of it.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <StepCard
            number={1}
            icon={<Building2 className="w-4 h-4" />}
            title="Claim your organization"
            body="Verify your work email and get the verified badge. Colleagues can join as co-managers."
            ctaLabel="Claim now"
            href="/claim"
          />
          <StepCard
            number={2}
            icon={<CalendarPlus className="w-4 h-4" />}
            title="Add your first event"
            body="Submit a conference, webinar, or call-for-papers. Pre-fill from a URL or paste an Eventbrite link."
            ctaLabel="Submit event"
            href="/submit"
          />
          <StepCard
            number={3}
            icon={<Share2 className="w-4 h-4" />}
            title="Invite colleagues to join"
            body="Every published event gets a public link. Copy it from the event page to share over email, Slack, WhatsApp, or LinkedIn."
            ctaLabel="See an example"
            href="/events"
          />
        </div>

        <p className="mt-5 text-xs text-white/60">
          You can revisit these any time from <Link href="/claim" className="underline hover:text-white">Claim</Link>,{" "}
          <Link href="/submit" className="underline hover:text-white">Submit</Link>, or{" "}
          <Link href="/profile" className="underline hover:text-white">Profile</Link>.
        </p>
      </div>
    </section>
  );
}

function StepCard({
  number, icon, title, body, ctaLabel, href,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 hover:border-white/30 px-4 py-4 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#4ea8de] text-white text-xs font-bold">
          {number}
        </span>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/10 text-white">
          {icon}
        </span>
      </div>
      <p className="text-sm font-bold text-white mt-1">{title}</p>
      <p className="text-xs text-white/75 leading-snug">{body}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#bfe1ff] group-hover:text-white transition-colors">
        {ctaLabel} <ArrowRight className="w-3 h-3" />
      </span>
    </Link>
  );
}
