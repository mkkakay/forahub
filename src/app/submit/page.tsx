// Submit landing — institutional publishing destination, not a form.
// Server-rendered so every metric and activity card on this page is
// sourced from a real Supabase query at render time. No hardcoded
// numbers, no fabricated activity. Components silently hide when the
// underlying data isn't available.

import Link from "next/link";
import {
  Calendar, Files, Building2, ArrowRight, Sparkles, Clock, Save,
  Paperclip, Link2, Wand2, BadgeCheck, Users, BarChart3, RefreshCw,
  Megaphone, Search, Handshake,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SubmitMetricsStrip from "@/components/discovery/SubmitMetricsStrip";
import RecentEvents from "@/components/discovery/RecentEvents";
import OrganizationLogoMarquee from "@/components/discovery/OrganizationLogoMarquee";
import {
  getDirectoryMetrics,
  getRecentEvents,
  getFeaturedOrgLogos,
  roundedDownLabel,
} from "@/lib/discovery/queries";

export const dynamic = "force-dynamic";

interface Feature { Icon: typeof Sparkles; label: string; }

const SINGLE_FEATURES: Feature[] = [
  { Icon: Wand2, label: "AI-assisted form" },
  { Icon: Clock, label: "Takes about 2 minutes" },
  { Icon: Save,  label: "Save as draft" },
];

const BULK_FEATURES: Feature[] = [
  { Icon: Paperclip, label: "PDF, Word, CSV, Excel" },
  { Icon: Link2,     label: "Paste any URL" },
  { Icon: Wand2,     label: "AI parses each event" },
];

const ORG_FEATURES: Feature[] = [
  { Icon: BadgeCheck, label: "Verified badge" },
  { Icon: Users,      label: "Team accounts" },
  { Icon: BarChart3,  label: "Analytics" },
  { Icon: RefreshCw,  label: "Recurring series" },
];

const ACCENTS = {
  blue:   { tint: "#0f2a4a", iconBg: "rgba(15,42,74,0.06)" },
  purple: { tint: "#5b3fb3", iconBg: "rgba(91,63,179,0.07)" },
  green:  { tint: "#0f6c4a", iconBg: "rgba(15,108,74,0.07)" },
} as const;

export default async function SubmitChooserPage() {
  // Resolve all real-data signals in parallel — single page load, no
  // request waterfalls.
  const [metrics, recentEvents, marqueeOrgs] = await Promise.all([
    getDirectoryMetrics(),
    getRecentEvents(5),
    getFeaturedOrgLogos(),
  ]);

  // Per-card stat — ONLY rendered for the manage-org card and ONLY
  // when the orgs-active number is non-trivial. Rounded down if 10k+,
  // else hidden (we don't want "595 organizations indexed" on a card).
  const orgsLabel = metrics.orgsActive != null && metrics.orgsActive >= 10_000
    ? `${roundedDownLabel(metrics.orgsActive)} organizations indexed`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <main className="relative">
        {/* Soft radial gradient behind the hero — restrained, premium,
            not "marketing splash". Kept absolutely positioned so any
            content sitting above it stays sharp. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[420px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 0%, rgba(78,168,222,0.10), transparent 60%), radial-gradient(ellipse 70% 60% at 50% 0%, rgba(15,42,74,0.06), transparent 70%)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16 lg:py-20 space-y-16 md:space-y-20">
          {/* ── HERO ──────────────────────────────────────────── */}
          <section className="text-center max-w-3xl mx-auto">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4ea8de]">
              <Sparkles className="w-3 h-3" /> Publish events
            </p>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold text-[#0f2a4a] dark:text-slate-100 tracking-tight leading-[1.1]">
              Publish Events to the Global Development Community
            </h1>
            <p className="mt-5 text-base md:text-lg text-gray-600 dark:text-slate-300 leading-relaxed">
              Reach professionals across health, humanitarian response, climate, policy, research, and international development.
            </p>
          </section>

          {/* ── METRICS STRIP ────────────────────────────────── */}
          <section>
            <SubmitMetricsStrip metrics={metrics} />
          </section>

          {/* ── THREE CARDS ──────────────────────────────────── */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            <ChooserCard
              href="/submit/single"
              accent={ACCENTS.blue}
              Icon={Calendar}
              title="Promote one event"
              description="Quickly publish a conference, webinar, summit, or call for papers."
              features={SINGLE_FEATURES}
              cta="Start single event"
            />
            <ChooserCard
              href="/submit/bulk"
              accent={ACCENTS.purple}
              Icon={Files}
              title="Bulk publish events"
              description="Paste a list, upload a document, or import from a URL."
              features={BULK_FEATURES}
              cta="Start bulk import"
              ribbon="Best for 5+ events"
            />
            <ChooserCard
              href="/claim"
              accent={ACCENTS.green}
              Icon={Building2}
              title="Manage my organization"
              description="Claim your page, manage your profile, and publish trusted events instantly."
              features={ORG_FEATURES}
              cta="Claim or manage org"
              stat={orgsLabel}
            />
          </section>

          {/* ── WHY ORGANIZATIONS USE FORAHUB ────────────────── */}
          <section>
            <header className="text-center mb-8 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-[#0f2a4a] dark:text-slate-100 tracking-tight">
                Why organizations use ForaHub
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
                A common surface for the institutions, NGOs, universities, foundations, and partners shaping global development.
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              <PillarCard
                Icon={Megaphone}
                title="Publish"
                body="Create events manually or in bulk, with AI assistance from a PDF, URL, or pasted list."
              />
              <PillarCard
                Icon={Search}
                title="Discoverability"
                body="Reach a targeted professional audience already filtering for health, climate, policy, and SDG work."
              />
              <PillarCard
                Icon={Handshake}
                title="Collaboration"
                body="Manage events with colleagues and teams via verified org pages and shared publishing."
              />
            </div>
          </section>

          {/* ── RECENT ACTIVITY ──────────────────────────────── */}
          {recentEvents.length > 0 && (
            <section className="max-w-3xl mx-auto w-full">
              <RecentEvents events={recentEvents} />
            </section>
          )}

          {/* ── ORG LOGO MARQUEE ─────────────────────────────── */}
          {marqueeOrgs.length >= 8 && (
            <section>
              <OrganizationLogoMarquee orgs={marqueeOrgs} />
            </section>
          )}

          {/* ── Quiet footer line ────────────────────────────── */}
          <section className="text-center max-w-2xl mx-auto pt-4">
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              Built for institutions, NGOs, universities, foundations, and development partners.
            </p>
            <p className="mt-3 text-xs text-gray-600 dark:text-slate-400">
              Questions?{" "}
              <Link href="/contact" className="text-gray-500 dark:text-slate-400 hover:text-[#0f2a4a] dark:hover:text-slate-100 underline-offset-2 hover:underline">
                Contact the team
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

// ─── Card sub-components ────────────────────────────────────────────

function ChooserCard({
  href, Icon, accent, title, description, features, cta, ribbon, stat,
}: {
  href: string;
  Icon: typeof Sparkles;
  accent: { tint: string; iconBg: string };
  title: string;
  description: string;
  features: Feature[];
  cta: string;
  ribbon?: string;
  stat?: string | null;
}) {
  return (
    <Link
      href={href}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-[0_1px_2px_rgba(15,42,74,0.04)] hover:shadow-[0_12px_30px_-12px_rgba(15,42,74,0.18)] hover:-translate-y-0.5 transition-all duration-200 p-7 md:p-8 flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4ea8de]/40 focus-visible:border-[#4ea8de]"
      style={{ borderTopColor: accent.tint, borderTopWidth: 3 }}
    >
      {ribbon && (
        <span className="absolute top-5 right-5 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider bg-[#0f2a4a]/5 border border-[#0f2a4a]/10 text-[#0f2a4a] dark:text-slate-100 rounded-full px-2 py-0.5">
          {ribbon}
        </span>
      )}

      <div
        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: accent.iconBg }}
      >
        <Icon className="w-7 h-7 md:w-8 md:h-8" style={{ color: accent.tint }} aria-hidden="true" />
      </div>

      <h2 className="text-lg md:text-xl font-bold text-[#0f2a4a] dark:text-slate-100 tracking-tight">{title}</h2>
      <p className="text-[14px] text-gray-600 dark:text-slate-300 mt-2 leading-relaxed">{description}</p>

      <ul className="mt-5 space-y-2 flex-1">
        {features.map(({ Icon: FIcon, label }, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[13px] text-gray-700 dark:text-slate-200">
            <FIcon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      {stat && (
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          {stat}
        </p>
      )}

      <div className="mt-7">
        <span
          className="inline-flex w-full items-center justify-center gap-2 text-white font-semibold px-4 py-3 rounded-xl text-[14px] transition-colors"
          style={{ backgroundColor: accent.tint }}
        >
          {cta}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

function PillarCard({
  Icon, title, body,
}: { Icon: typeof Sparkles; title: string; body: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700/70 rounded-2xl p-6 md:p-7 shadow-[0_1px_2px_rgba(15,42,74,0.04)]">
      <div className="w-11 h-11 rounded-xl bg-[#0f2a4a]/5 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#0f2a4a] dark:text-slate-100" aria-hidden="true" />
      </div>
      <h3 className="text-base md:text-lg font-bold text-[#0f2a4a] dark:text-slate-100 tracking-tight">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-slate-300 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
