// Public org page — the destination a manager shares to LinkedIn, X,
// Slack, WhatsApp. Server-rendered for SEO + rich link previews.
//
// Source of truth for the org's visual identity:
//   1. organizations_directory row (manager-edited via /orgs/[slug]/manage)
//   2. Curated TS list (src/lib/organizations.ts) — fallback for the ~30
//      historically-curated orgs whose pages should keep working even
//      before they're claimed.
//
// Events query is additive: events.org_slug=$1 OR organization ILIKE %name%.
// Existing map / search / detail reads are untouched.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  BadgeCheck, Calendar, MapPin, Globe, Briefcase, ChevronLeft, Building2,
  ExternalLink, ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { adminSupabase } from "@/lib/supabase/admin";
import { getOrgBySlug } from "@/lib/organizations";
import PastEventsDisclosure from "./PastEventsDisclosure";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const NAVY = "#0f2a4a";
const ACCENT = "#4ea8de";

interface DirectoryRow {
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  domain: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  website_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  is_claimed: boolean | null;
  is_verified: boolean | null;
}

interface EventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  organization: string | null;
  format: string | null;
  status: string | null;
  sdg_goals: number[] | null;
}

interface ResolvedOrg {
  slug: string;
  name: string;
  short: string;
  description: string | null;
  domain: string | null;
  logo: string | null;
  cover: string | null;
  website: string | null;
  twitter: string | null;
  linkedin: string | null;
  isClaimed: boolean;
  isVerified: boolean;
  accent: string;
}

const COLS =
  "id, title, start_date, end_date, location, organization, format, status, sdg_goals";

async function loadDirectoryRow(slug: string): Promise<DirectoryRow | null> {
  const { data } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name, short_name, description, domain, logo_url, cover_image_url, website_url, twitter_url, linkedin_url, is_claimed, is_verified")
    .eq("slug", slug)
    .maybeSingle();
  return (data as DirectoryRow | null) ?? null;
}

/** Merge a directory row + curated fallback into one shape the renderer
 *  uses. DB fields win whenever set; the curated list backfills logo +
 *  brand color for the ~30 historical orgs that the public page has
 *  rendered for a long time and that may not yet have rows. */
function resolveOrg(slug: string, directory: DirectoryRow | null): ResolvedOrg | null {
  const curated = getOrgBySlug(slug);
  if (!directory && !curated) return null;
  const name = directory?.name ?? curated?.name ?? slug;
  return {
    slug,
    name,
    short: directory?.short_name?.trim() || curated?.short || name,
    description: directory?.description?.trim() || curated?.description || null,
    domain: directory?.domain?.trim() || curated?.domain || null,
    logo: directory?.logo_url?.trim() || curated?.logo || null,
    cover: directory?.cover_image_url?.trim() || null,
    website: directory?.website_url?.trim() || null,
    twitter: directory?.twitter_url?.trim() || null,
    linkedin: directory?.linkedin_url?.trim() || null,
    isClaimed: !!directory?.is_claimed,
    isVerified: !!directory?.is_verified,
    accent: curated?.color ?? ACCENT,
  };
}

async function loadEventsForOrg(org: ResolvedOrg): Promise<EventRow[]> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } },
  );

  // Sanitize ILIKE patterns — strip the chars PostgREST would otherwise
  // try to interpret as separators / wildcards we don't want surfacing.
  const safe = (s: string) => s.replace(/[%,_(),]/g, " ").trim();
  const namePattern = safe(org.name);
  const curatedPatterns = (getOrgBySlug(org.slug)?.matchPatterns ?? []).map(safe).filter(Boolean);

  const orClauses: string[] = [`org_slug.eq.${org.slug}`];
  if (namePattern) orClauses.push(`organization.ilike.%${namePattern}%`);
  for (const p of curatedPatterns) orClauses.push(`organization.ilike.%${p}%`);

  // Hard cap: active orgs (WHO, World Bank) can match hundreds of events
  // via the org_slug + name-pattern OR. The public page shows Upcoming +
  // Past sections; 100 covers the typical org and we surface a
  // "Browse all events" link in the UI when we hit the cap.
  // Keep .limit() — do not remove.
  const { data } = await supabase
    .from("events")
    .select(COLS)
    .or(orClauses.join(","))
    .eq("status", "published") // public page = published only; cancelled / pending live in admin
    .order("start_date", { ascending: true })
    .limit(ORG_EVENTS_PAGE_CAP);

  const rows = (data as EventRow[] | null) ?? [];
  // Dedup by id (org_slug + ILIKE can intersect).
  const seen = new Set<string>();
  return rows.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

const ORG_EVENTS_PAGE_CAP = 100;

// ─── SEO + Open Graph + Twitter Card ─────────────────────────────────

export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  const directory = await loadDirectoryRow(params.slug);
  const org = resolveOrg(params.slug, directory);
  if (!org) return { title: "Organization not found" };

  const truncate = (s: string, n: number) =>
    s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";

  const description = org.description
    ? truncate(org.description, 200)
    : `Upcoming and past events from ${org.name} on ForaHub.`;

  // Prefer cover (1200×400+ banner-shaped) over logo. Layout-level OG
  // default applies if neither is set.
  const imageUrl = org.cover ?? org.logo ?? null;
  const images = imageUrl
    ? [{ url: imageUrl, width: 1200, height: 630, alt: org.name }]
    : undefined;

  const canonical = `/organizations/${org.slug}`;

  return {
    title: `${org.name} — Events on ForaHub`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "ForaHub",
      title: `${org.name} — Events on ForaHub`,
      description,
      url: canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${org.name} — Events on ForaHub`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function OrganizationPage({
  params,
}: { params: { slug: string } }) {
  const directory = await loadDirectoryRow(params.slug);
  const org = resolveOrg(params.slug, directory);
  if (!org) notFound();

  const events = await loadEventsForOrg(org);
  const truncated = events.length >= ORG_EVENTS_PAGE_CAP;
  const now = Date.now();
  const upcoming = events.filter(e => new Date(e.end_date ?? e.start_date).getTime() >= now);
  const past = events
    .filter(e => new Date(e.end_date ?? e.start_date).getTime() < now)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />
      <Hero org={org} upcomingCount={upcoming.length} totalCount={events.length} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <UpcomingSection org={org} events={upcoming} />
        <PastEventsDisclosure count={past.length}>
          <EventGrid events={past} accent={org.accent} pastTone />
        </PastEventsDisclosure>
        {truncated && (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            Showing the {ORG_EVENTS_PAGE_CAP} most recent matches for this organization.{" "}
            <Link
              href={`/events?q=${encodeURIComponent(org.name)}`}
              className="font-semibold text-[#0f2a4a] dark:text-white hover:underline"
            >
              View all events on /events →
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────

function Hero({ org, upcomingCount, totalCount }: {
  org: ResolvedOrg;
  upcomingCount: number;
  totalCount: number;
}) {
  return (
    <header className="relative">
      {/* Cover band — gradient fallback when no image */}
      <div
        className="relative h-32 sm:h-44 md:h-56 lg:h-64 w-full overflow-hidden"
        style={{
          background: org.cover
            ? undefined
            : `linear-gradient(135deg, ${NAVY} 0%, ${org.accent} 120%)`,
        }}
      >
        {org.cover && (
          <>
            {/* next/image gives us automatic preload (priority), CLS-safe
                aspect, and a single React-managed surface. `unoptimized`
                because org covers come from arbitrary user-supplied URLs
                we don't want to add to remotePatterns just to proxy. */}
            <Image
              src={org.cover}
              alt=""
              fill
              priority
              sizes="100vw"
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f2a4a]/85 via-[#0f2a4a]/35 to-transparent" />
          </>
        )}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90 bg-black/30 backdrop-blur hover:bg-black/45 rounded-full px-3 py-1.5 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Home
          </Link>
        </div>
      </div>

      {/* Identity card — pulls up into the cover with a negative margin */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 sm:-mt-16 md:-mt-20">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg p-5 md:p-6 flex flex-col md:flex-row gap-5 md:gap-6">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex items-center justify-center p-2.5 shrink-0 shadow-sm">
            {org.logo ? (
              // next/image with explicit dimensions for CLS; `unoptimized`
              // for the same arbitrary-host reason as the cover above.
              <Image
                src={org.logo}
                alt={`${org.name} logo`}
                width={112}
                height={112}
                unoptimized
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <Building2 className="w-9 h-9 text-gray-300" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f2a4a] dark:text-white tracking-tight">
                {org.name}
              </h1>
              {org.isVerified && (
                <span
                  title="Verified organization"
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-2 py-0.5"
                >
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
              {!org.isVerified && org.isClaimed && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full px-2 py-0.5"
                >
                  <ShieldCheck className="w-3 h-3" /> Claimed
                </span>
              )}
            </div>
            {/* Provenance line — only when something concrete to say */}
            {(org.isVerified && org.domain) && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 inline-flex items-center gap-1.5">
                <BadgeCheck className="w-3 h-3" />
                Verified via work-email at <span className="font-mono">@{org.domain}</span>
              </p>
            )}
            {(!org.isVerified && org.isClaimed && org.domain) && (
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" />
                Claimed by a verified manager at <span className="font-mono">@{org.domain}</span>
              </p>
            )}

            {org.description && (
              <p className="text-sm md:text-[15px] text-gray-700 dark:text-gray-300 mt-3 leading-relaxed">
                {org.description}
              </p>
            )}

            {/* Meta row + social links */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {totalCount.toLocaleString()} total event{totalCount === 1 ? "" : "s"}
              </span>
              {upcomingCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: org.accent }} aria-hidden="true" />
                  {upcomingCount.toLocaleString()} upcoming
                </span>
              )}
              <SocialPills
                website={org.website}
                twitter={org.twitter}
                linkedin={org.linkedin}
                domain={org.domain}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function SocialPills({
  website, twitter, linkedin, domain,
}: {
  website: string | null;
  twitter: string | null;
  linkedin: string | null;
  domain: string | null;
}) {
  const pills: { label: string; href: string; Icon: typeof Globe }[] = [];
  if (website) pills.push({ label: "Website", href: website, Icon: Globe });
  // Synthesize a website link from the domain if no explicit website set
  // and there's no risk of a free-mail domain (those won't be on org rows).
  if (!website && domain) pills.push({ label: domain, href: `https://${domain}`, Icon: Globe });
  if (twitter) pills.push({ label: "X", href: twitter, Icon: XIcon as unknown as typeof Globe });
  if (linkedin) pills.push({ label: "LinkedIn", href: linkedin, Icon: Briefcase });
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
      {pills.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0f2a4a] dark:text-white bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-[#4ea8de] hover:text-[#3a95cc] rounded-full px-2.5 py-1 transition-colors"
        >
          <Icon className="w-3 h-3" />
          {label}
          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
        </a>
      ))}
    </div>
  );
}

// X / Twitter glyph — Lucide doesn't ship an X mark in the size we want
// inline with the other social icons, so we inline a simple path.
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2H21l-6.55 7.487L22 22h-6.937l-4.835-6.32L4.6 22H1.84l7.01-8.014L1.5 2h7.092l4.37 5.78L18.244 2zm-2.43 18h1.83L7.275 4H5.36l10.454 16z"
      />
    </svg>
  );
}

// ─── Upcoming / Past sections ────────────────────────────────────────

function UpcomingSection({ org, events }: { org: ResolvedOrg; events: EventRow[] }) {
  return (
    <section>
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-[#0f2a4a] dark:text-white inline-flex items-center gap-2">
          Upcoming events
          <span className="text-xs font-semibold text-gray-500 tabular-nums">({events.length})</span>
        </h2>
        <Link
          href="/events"
          className="text-xs font-semibold text-[#4ea8de] hover:text-[#3a95cc] inline-flex items-center gap-1"
        >
          Browse all events
          <ExternalLink className="w-3 h-3" />
        </Link>
      </header>
      {events.length === 0 ? (
        <EmptyEvents orgName={org.short || org.name} />
      ) : (
        <EventGrid events={events} accent={org.accent} />
      )}
    </section>
  );
}

function EmptyEvents({ orgName }: { orgName: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 p-10 md:p-12 text-center">
      <Calendar className="w-9 h-9 text-gray-300 mx-auto mb-3" aria-hidden="true" />
      <h3 className="text-base font-bold text-[#0f2a4a] dark:text-white">No upcoming events for {orgName} yet</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
        We&apos;ll surface them here as soon as they&apos;re published. In the meantime, browse the wider network.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          Browse all events
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f2a4a] dark:text-slate-100 border border-gray-200 dark:border-slate-700 hover:border-[#4ea8de] hover:text-[#3a95cc] px-5 py-2.5 rounded-xl transition-colors"
        >
          Browse other organizations
        </Link>
      </div>
    </div>
  );
}

function EventGrid({ events, accent, pastTone = false }: {
  events: EventRow[];
  accent: string;
  pastTone?: boolean;
}) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {events.map(ev => (
        <li key={ev.id}>
          <EventCard event={ev} accent={accent} pastTone={pastTone} />
        </li>
      ))}
    </ul>
  );
}

function EventCard({ event, accent, pastTone }: {
  event: EventRow;
  accent: string;
  pastTone: boolean;
}) {
  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : null;
  const dateLabel = formatRange(start, end);
  const dayNum = start.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  const monthShort = start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const isVirtual = event.format === "virtual";
  return (
    <Link
      href={`/events/${event.id}`}
      className={`group block bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 hover:border-[#4ea8de] dark:hover:border-[#4ea8de] hover:shadow-md transition-all p-4 sm:p-5 ${
        pastTone ? "opacity-70 hover:opacity-100" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${NAVY} 35%, ${accent})` }}
          aria-hidden="true"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 -mb-0.5">{monthShort}</span>
          <span className="text-xl font-extrabold leading-none">{dayNum}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm md:text-[15px] font-bold text-[#0f2a4a] dark:text-white line-clamp-2 group-hover:text-[#4ea8de] transition-colors">
            {event.title}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{dateLabel}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-600 dark:text-gray-300">
            {event.location && (
              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
            {isVirtual && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wider text-[10px]">
                Virtual
              </span>
            )}
            {!isVirtual && event.format === "hybrid" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold uppercase tracking-wider text-[10px]">
                Hybrid
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatRange(start: Date, end: Date | null): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  if (!end) return fmt(start);
  const sameDay = start.toUTCString().slice(0, 16) === end.toUTCString().slice(0, 16);
  if (sameDay) return fmt(start);
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} ${start.getUTCDate()}–${end.getUTCDate()}, ${start.getUTCFullYear()}`;
  }
  return `${fmt(start)} → ${fmt(end)}`;
}
