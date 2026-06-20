import Link from "next/link";
import {
  Calendar, Files, Building2, ArrowRight, Sparkles, Clock, Save,
  Paperclip, Link2, Wand2, BadgeCheck, Users, BarChart3, RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";

// Outcome-driven submit landing. Three cards with stronger hierarchy,
// a small trust line, and a quieter contact link. Visual polish only —
// no underlying route or behaviour changed.

interface Feature { Icon: typeof Sparkles; label: string; }

const SINGLE_FEATURES: Feature[] = [
  { Icon: Wand2,  label: "AI-assisted form" },
  { Icon: Clock,  label: "Takes about 2 minutes" },
  { Icon: Save,   label: "Save as draft" },
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

export default function SubmitChooserPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        <header className="mb-10 md:mb-14 text-center">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#4ea8de] mb-3">
            <Sparkles className="w-3 h-3" /> Publish events
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-[#0f2a4a] tracking-tight leading-[1.1]">
            How would you like to share events?
          </h1>
          <p className="text-base md:text-lg text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
            Publish, import, or manage events across the global development community.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          <ChooserCard
            href="/submit/single"
            iconColor="#4ea8de"
            Icon={Calendar}
            title="Promote one event"
            description="Quickly publish a conference, webinar, summit, or call for papers."
            features={SINGLE_FEATURES}
            cta="Start single event"
          />
          <ChooserCard
            href="/submit/bulk"
            iconColor="#0f2a4a"
            Icon={Files}
            title="Bulk publish events"
            description="Paste a list, upload a document, or import from a URL."
            features={BULK_FEATURES}
            cta="Start bulk import"
            ribbon="Best for 5+ events"
          />
          <ChooserCard
            href="/claim"
            iconColor="#0f2a4a"
            Icon={Building2}
            title="Manage my organization"
            description="Claim your page, manage your profile, and publish trusted events instantly."
            features={ORG_FEATURES}
            cta="Claim or manage org"
          />
        </div>

        <p className="mt-12 md:mt-14 text-center text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto">
          Built for institutions, NGOs, universities, foundations, and development partners.
        </p>
        <p className="mt-3 text-center text-xs text-gray-400">
          Questions?{" "}
          <Link href="/contact" className="text-gray-500 hover:text-[#0f2a4a] underline-offset-2 hover:underline">
            Contact the team
          </Link>
        </p>
      </main>
    </div>
  );
}

function ChooserCard({
  href, Icon, iconColor, title, description, features, cta, ribbon,
}: {
  href: string;
  Icon: typeof Sparkles;
  iconColor: string;
  title: string;
  description: string;
  features: Feature[];
  cta: string;
  ribbon?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative bg-white rounded-2xl border border-gray-200/80 shadow-[0_1px_2px_rgba(15,42,74,0.04)] hover:shadow-[0_8px_24px_-6px_rgba(15,42,74,0.12)] hover:border-[#4ea8de]/40 hover:-translate-y-0.5 transition-all duration-200 p-7 md:p-8 flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4ea8de]/50 focus-visible:border-[#4ea8de]"
    >
      {ribbon && (
        <span className="absolute top-5 right-5 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider bg-[#0f2a4a]/5 border border-[#0f2a4a]/10 text-[#0f2a4a] rounded-full px-2 py-0.5">
          {ribbon}
        </span>
      )}

      {/* Larger icon area */}
      <div
        className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: `${iconColor}14` }}
      >
        <Icon className="w-7 h-7 md:w-8 md:h-8" style={{ color: iconColor }} aria-hidden="true" />
      </div>

      <h2 className="text-lg md:text-xl font-bold text-[#0f2a4a] tracking-tight">{title}</h2>
      <p className="text-[14px] text-gray-600 mt-2 leading-relaxed">{description}</p>

      {/* Feature list — clean icons, consistent spacing */}
      <ul className="mt-5 space-y-2 flex-1">
        {features.map(({ Icon: FIcon, label }, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[13px] text-gray-700">
            <FIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <span className="inline-flex w-full items-center justify-center gap-2 bg-[#0f2a4a] group-hover:bg-[#1a3f6e] text-white font-semibold px-4 py-3 rounded-xl text-[14px] transition-colors">
          {cta}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}
