"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar, FileText, Building2, ArrowRight, Loader2, CheckCircle2, X, AlertCircle,
  Sparkles, Rocket, ClipboardList, Paperclip, Link2, BadgeCheck, BarChart3, RefreshCw, Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { parseApiResponse } from "@/lib/admin/fetchJson";

type Feature = { icon: React.ReactNode; label: string };

const SINGLE_FEATURES: Feature[] = [
  { icon: <Sparkles className="w-4 h-4 text-purple-600" />, label: "AI-assisted form" },
  { icon: <Rocket className="w-4 h-4 text-violet-600" />, label: "Takes 2 minutes" },
  { icon: <ClipboardList className="w-4 h-4 text-slate-600" />, label: "Save as draft" },
];

const BULK_FEATURES: Feature[] = [
  { icon: <Paperclip className="w-4 h-4 text-slate-600" />, label: "Upload PDF, Word, CSV, Excel" },
  { icon: <Link2 className="w-4 h-4 text-blue-600" />, label: "Paste any URL" },
  { icon: <Sparkles className="w-4 h-4 text-purple-600" />, label: "AI parses everything" },
];

const ORG_FEATURES: Feature[] = [
  { icon: <BadgeCheck className="w-4 h-4 text-emerald-600" />, label: "Verified org badge" },
  { icon: <BarChart3 className="w-4 h-4 text-violet-600" />, label: "Event analytics" },
  { icon: <RefreshCw className="w-4 h-4 text-blue-500" />, label: "Recurring events" },
  { icon: <Users className="w-4 h-4 text-violet-600" />, label: "Team accounts" },
];

export default function SubmitChooserPage() {
  const [orgModalOpen, setOrgModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10 md:py-16">
        <header className="mb-8 md:mb-12 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#0f2a4a] tracking-tight">
            What would you like to do?
          </h1>
          <p className="text-base md:text-lg text-gray-600 mt-3 max-w-2xl mx-auto">
            Choose how you want to share events with the ForaHub community.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {/* Card 1 — Single event */}
          <ChooserCard
            href="/submit/single"
            icon={<Calendar className="w-12 h-12 text-blue-600" />}
            title="Submit one event"
            description="Quick and easy. AI helps fill the form from a flyer, URL, or by hand."
            features={SINGLE_FEATURES}
            ctaLabel="Start"
          />

          {/* Card 2 — Bulk import */}
          <ChooserCard
            href="/submit/bulk"
            icon={<FileText className="w-12 h-12 text-amber-600" />}
            title="Submit multiple events"
            description="Paste a list, upload a document, or paste a URL. AI detects each event for review."
            features={BULK_FEATURES}
            ctaLabel="Start"
            badge={{ label: "Best for orgs hosting 5+ events", tone: "blue" }}
          />

          {/* Card 3 — Organization account (coming soon) */}
          <ChooserCard
            onClick={() => setOrgModalOpen(true)}
            icon={<Building2 className="w-12 h-12 text-indigo-600" />}
            title="My organization"
            description="Claim your org, manage all your events in one dashboard, and unlock advanced features."
            features={ORG_FEATURES}
            ctaLabel="Join early access"
            ctaSubtitle="Coming soon"
            comingSoon
          />
        </div>

        <p className="text-center text-sm text-gray-500 mt-10">
          Have questions? <Link href="/contact" className="text-blue-600 hover:underline font-medium">Contact us →</Link>
        </p>
      </main>

      {orgModalOpen && <EarlyAccessModal onClose={() => setOrgModalOpen(false)} />}
    </div>
  );
}

function ChooserCard({
  href,
  onClick,
  icon,
  title,
  description,
  features,
  ctaLabel,
  ctaSubtitle,
  badge,
  comingSoon,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: Feature[];
  ctaLabel: string;
  ctaSubtitle?: string;
  badge?: { label: string; tone: "blue" | "amber" };
  comingSoon?: boolean;
}) {
  const cardBase =
    "group relative bg-white rounded-2xl border shadow-sm transition-all duration-200 p-6 md:p-7 flex flex-col h-full";
  const cardHover = comingSoon
    ? "border-gray-200 hover:border-gray-300"
    : "border-gray-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5";

  const inner = (
    <>
      {comingSoon && (
        <span className="absolute top-4 right-4 inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-2 py-0.5">
          Coming soon
        </span>
      )}

      <div className="mb-4">{icon}</div>
      <h2 className="text-xl md:text-2xl font-bold text-[#0f2a4a]">{title}</h2>
      <p className="text-gray-600 mt-2 text-sm md:text-base leading-relaxed">{description}</p>

      <ul className="mt-5 space-y-1.5 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
            <span aria-hidden="true" className="shrink-0">{f.icon}</span>
            <span>{f.label}</span>
          </li>
        ))}
      </ul>

      {badge && (
        <p className={`mt-4 text-[11px] font-semibold uppercase tracking-wider ${
          badge.tone === "blue" ? "text-blue-700" : "text-amber-800"
        }`}>
          {badge.label}
        </p>
      )}

      <div className="mt-6">
        {comingSoon ? (
          <span className="w-full inline-flex items-center justify-center gap-2 border-2 border-[#0f2a4a] text-[#0f2a4a] font-semibold px-4 py-2.5 rounded-xl text-sm group-hover:bg-[#0f2a4a] group-hover:text-white transition-colors">
            {ctaLabel} <ArrowRight size={16} />
          </span>
        ) : (
          <span className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 group-hover:from-blue-700 group-hover:to-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md group-hover:shadow-lg transition-all">
            {ctaLabel} <ArrowRight size={16} />
          </span>
        )}
        {ctaSubtitle && (
          <p className="text-center text-[11px] text-gray-500 mt-2">{ctaSubtitle}</p>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${cardBase} ${cardHover}`}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${cardBase} ${cardHover} text-left`}>
      {inner}
    </button>
  );
}

function EarlyAccessModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), interest: "org_accounts" }),
      });
      const parsed = await parseApiResponse<{ success?: boolean; message?: string; error?: string }>(res);
      if (!parsed.ok) {
        setError(parsed.error || "Could not save signup.");
        return;
      }
      setSuccess(parsed.data.message ?? "You're on the list.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-[#0f2a4a]">You&apos;re on the list</h3>
            <p className="text-sm text-gray-600 mt-2">{success}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex items-center gap-2 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-[#0f2a4a] flex items-center gap-2">
              <Rocket className="w-5 h-5 text-violet-600" />
              Organization accounts launching soon
            </h3>
            <p className="text-sm text-gray-600 mt-2">
              Be the first to know when verified org accounts go live. You&apos;ll get:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
              <li className="flex items-start gap-2"><span>•</span><span>Priority access during beta</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>Free verified badge for the first 100 orgs</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>Direct support to claim your org</span></li>
            </ul>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
              />
              {error && (
                <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 text-white font-semibold px-5 py-3 rounded-xl text-sm shadow-md transition-all"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? "Saving…" : "Notify me when ready"}
              </button>
              <p className="text-[11px] text-gray-500 text-center">
                We&apos;ll only email you when org accounts launch.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
