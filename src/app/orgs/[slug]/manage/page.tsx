// Manage page — server entry. All data fetching + permission checks
// stay here (unchanged from before). The visual layout now wraps the
// existing five panels + a Settings tab in a sectioned tab nav so the
// page no longer feels like an overwhelming scroll. NO functional
// changes — same APIs, same isOrgManager gate, same data flows.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BadgeCheck, ArrowLeft, Lock, ShieldCheck, Calendar as CalendarIcon, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager, isDomainVerified, effectiveAutoPublish, listOrgManagers } from "@/lib/orgs/managers";
import { listPendingInvites } from "@/lib/orgs/invites";
import { AUTOPUBLISH_CAP_PER_24H, AUTOPUBLISH_WINDOW_HOURS } from "@/lib/orgs/autoPublish";
import { loadOrgAnalytics } from "@/lib/analytics/aggregate";
import ManageOrgForm from "./ManageOrgForm";
import TeamPanel, { type ManagerView, type InviteView } from "./TeamPanel";
import EventsPanel, { type EventView } from "./EventsPanel";
import SeriesPanel from "./SeriesPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import ManageTabs from "./ManageTabs";
import OrgSetupChecklist, { type OrgSetupSignals } from "./OrgSetupChecklist";

export const dynamic = "force-dynamic";

interface OrgRow {
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
  claimed_at: string | null;
  solo_acknowledged_at: string | null;
}

export default async function ManageOrgPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { claimed?: string; invited?: string; tab?: string };
}) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const userId = u.user?.id ?? null;

  if (!userId) {
    redirect(`/auth/signin?next=${encodeURIComponent(`/orgs/${params.slug}/manage`)}`);
  }

  const { data, error } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name, short_name, description, domain, logo_url, cover_image_url, website_url, twitter_url, linkedin_url, is_claimed, is_verified, claimed_at, solo_acknowledged_at")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error || !data) {
    redirect(`/?error=org_not_found`);
  }
  const org = data as OrgRow;

  // Authoritative access check — same predicate /claim short-circuits on.
  if (!(await isOrgManager(org.slug, userId!))) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#0f2a4a]">You don&apos;t have access to manage this org</h1>
            <p className="text-sm text-gray-600 mt-2">
              Only verified managers can edit <span className="font-semibold">{org.name}</span>. If you&apos;re a colleague, claim it with your work email.
            </p>
            <div className="mt-6">
              <Link
                href="/claim"
                className="inline-flex items-center gap-1.5 bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Start a claim
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 24h auto-publish cap counter — same as before.
  const sinceIso = new Date(Date.now() - AUTOPUBLISH_WINDOW_HOURS * 3600 * 1000).toISOString();
  const [
    managerRows, inviteRows, eventsRes, autoPublishedCountRes, analytics30, analytics90,
  ] = await Promise.all([
    listOrgManagers(org.slug),
    listPendingInvites(org.slug),
    adminSupabase
      .from("events")
      .select("id, title, start_date, end_date, location, format, status, submission_status, source_type, submission_source, auto_published_at, needs_recheck, needs_recheck_at, needs_recheck_reason, submitted_at, created_at")
      .eq("org_slug", org.slug)
      .order("start_date", { ascending: false })
      .limit(50),
    adminSupabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("org_slug", org.slug)
      .gte("auto_published_at", sinceIso),
    loadOrgAnalytics({ orgSlug: org.slug, windowDays: 30 }),
    loadOrgAnalytics({ orgSlug: org.slug, windowDays: 90 }),
  ]);

  // Series count + published-event count are cheap head-only queries
  // used by the tab badges AND the org-setup checklist signals.
  const [
    { count: seriesCount },
    { count: publishedEventsCount },
  ] = await Promise.all([
    adminSupabase
      .from("event_series")
      .select("id", { count: "exact", head: true })
      .eq("org_slug", org.slug)
      .eq("status", "active"),
    adminSupabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("org_slug", org.slug)
      .eq("status", "published"),
  ]);

  // ── Org-setup checklist signals (computed server-side, passed to the
  // client component as plain booleans + counts). Three core items make
  // up the percentage:
  //   - Profile basics: logo + description + website all present
  //   - Team: ≥2 managers OR solo acknowledged
  //   - Events: ≥1 published event
  // Plus an optional bonus item (recurring series). The percentage is
  // ONLY over the three core items so an org with no series can hit 100.
  const profileMissing: ("logo" | "description" | "website")[] = [];
  if (!org.logo_url?.trim()) profileMissing.push("logo");
  if (!org.description?.trim()) profileMissing.push("description");
  if (!org.website_url?.trim()) profileMissing.push("website");
  const profileBasicsDone = profileMissing.length === 0;

  const hasCoManagers = managerRows.length > 1;
  const soloAck = !!org.solo_acknowledged_at;
  const teamDone = hasCoManagers || soloAck;
  const teamReason: OrgSetupSignals["teamReason"] =
    hasCoManagers ? "has_co_managers" :
    soloAck       ? "solo_acknowledged" :
    "incomplete";

  const eventsDone = (publishedEventsCount ?? 0) > 0;
  const seriesDone = (seriesCount ?? 0) > 0;

  const coreDoneCount = [profileBasicsDone, teamDone, eventsDone].filter(Boolean).length;
  const corePct = Math.round((coreDoneCount / 3) * 100);

  const orgSetupSignals: OrgSetupSignals = {
    profileBasicsDone,
    profileMissing,
    teamDone,
    teamReason,
    managerCount: managerRows.length,
    eventsDone,
    publishedEventsCount: publishedEventsCount ?? 0,
    seriesDone,
    activeSeriesCount: seriesCount ?? 0,
    corePct,
  };

  const founderId = managerRows[0]?.id ?? null;
  const viewerSeat = managerRows.find(m => m.user_id === userId) ?? null;
  const viewerIsDomainVerified = !!viewerSeat && isDomainVerified(viewerSeat.added_via);
  const viewerCanAutoPublish = !!viewerSeat && effectiveAutoPublish(viewerSeat);

  const managersForPanel: ManagerView[] = managerRows.map(m => ({
    id: m.id, user_id: m.user_id, email: m.email, role: m.role,
    added_at: m.added_at, verified_at: m.verified_at, added_via: m.added_via,
    is_founder: m.id === founderId, is_self: m.user_id === userId,
    can_autopublish: m.can_autopublish,
    autopublish_granted_at: m.autopublish_granted_at,
    is_trusted: isDomainVerified(m.added_via),
  }));
  const invitesForPanel: InviteView[] = inviteRows.map(i => ({
    id: i.id, invited_email: i.invited_email,
    invited_by_email: i.invited_by_email, note: i.note, status: i.status,
    expires_at: i.expires_at, created_at: i.created_at,
  }));
  const eventsForPanel: EventView[] = ((eventsRes.data ?? []) as EventView[]);
  const autoPublishedInWindow = autoPublishedCountRes.count ?? 0;

  // Tab slots — each is the same component that used to render as a
  // stacked section. Nothing about their props, fetch handlers, or
  // server-validated permissions has changed.
  const slots = {
    profile: (
      <ManageOrgForm
        slug={org.slug}
        initial={{
          name: org.name,
          short_name: org.short_name ?? "",
          description: org.description ?? "",
          logo_url: org.logo_url ?? "",
          cover_image_url: org.cover_image_url ?? "",
          website_url: org.website_url ?? "",
          twitter_url: org.twitter_url ?? "",
          linkedin_url: org.linkedin_url ?? "",
        }}
      />
    ),
    team: (
      <TeamPanel
        slug={org.slug}
        orgName={org.name}
        orgDomain={org.domain}
        managers={managersForPanel}
        invites={invitesForPanel}
        viewerIsDomainVerified={viewerIsDomainVerified}
      />
    ),
    events: (
      <EventsPanel
        slug={org.slug}
        orgName={org.name}
        events={eventsForPanel}
        viewerCanAutoPublish={viewerCanAutoPublish}
        viewerAddedVia={viewerSeat?.added_via ?? null}
        autoPublishedInWindow={autoPublishedInWindow}
        autoPublishCap={AUTOPUBLISH_CAP_PER_24H}
        autoPublishWindowHours={AUTOPUBLISH_WINDOW_HOURS}
      />
    ),
    series: (
      <SeriesPanel
        slug={org.slug}
        orgName={org.name}
        orgDomain={org.domain}
        defaultOrganization={org.name}
      />
    ),
    analytics: (
      <AnalyticsPanel
        slug={org.slug}
        orgName={org.name}
        summary30={analytics30}
        summary90={analytics90}
      />
    ),
    settings: <SettingsTab org={org} />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header — always visible, sits above the tabs */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/organizations/${org.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#0f2a4a] mb-2"
            >
              <Globe className="w-3 h-3" /> View public page
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0f2a4a] tracking-tight inline-flex items-center gap-2">
              {org.name}
              {org.is_verified && (
                <BadgeCheck
                  className="w-5 h-5 md:w-6 md:h-6 text-emerald-600"
                  aria-label="Verified organization"
                />
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Org settings · You&apos;re a verified manager.
            </p>
          </div>
        </header>

        {/* Optional flash banners — same copy as before. */}
        {searchParams.claimed === "1" && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm">
            Claim verified. Your verified badge is now live across ForaHub.
          </div>
        )}
        {searchParams.invited === "1" && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm">
            Welcome to the team. You can edit the org profile and invite colleagues.
          </div>
        )}

        {/* Org-wide setup checklist — sits above the tabs so it's
            visible from every section. Server-side signals; the
            component just renders + dispatches tab-change events. */}
        <OrgSetupChecklist slug={org.slug} signals={orgSetupSignals} />

        {/* Tabs — replaces the previous long single-scroll layout. The
            child component is wrapped in Suspense because it reads
            useSearchParams() and Next 14 requires that under SSR. */}
        <Suspense fallback={<div className="h-14" />}>
          <ManageTabs
            slots={slots}
            badges={{
              team: managerRows.length,
              events: eventsForPanel.length,
              series: seriesCount ?? 0,
            }}
            defaultTab="profile"
          />
        </Suspense>
      </main>
    </div>
  );
}

// ─── Settings tab ────────────────────────────────────────────────────
// The old in-page "Org status" mini-section. Same data, same source —
// now lives behind the Settings tab instead of trailing the long scroll.

function SettingsTab({ org }: { org: OrgRow }) {
  const verifiedAt = org.claimed_at
    ? new Date(org.claimed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Org status</h2>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Verification</dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 text-[#0f2a4a] font-semibold">
              {org.is_verified ? (
                <><BadgeCheck className="w-4 h-4 text-emerald-600" /> Verified</>
              ) : org.is_claimed ? (
                <><ShieldCheck className="w-4 h-4 text-[#4ea8de]" /> Claimed</>
              ) : (
                <span className="text-gray-500">Not claimed</span>
              )}
            </dd>
            {org.domain && (
              <dd className="text-xs text-gray-500 mt-0.5">
                Domain: <span className="font-mono">@{org.domain}</span>
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-gray-500">First verified</dt>
            <dd className="mt-1 text-[#0f2a4a] font-semibold inline-flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
              {verifiedAt ?? "—"}
            </dd>
          </div>
        </dl>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Public page</h2>
        <p className="text-sm text-gray-600 mt-2">
          Your organization&apos;s shareable page is at{" "}
          <Link href={`/organizations/${org.slug}`} className="text-[#0f2a4a] font-semibold hover:underline">
            /organizations/{org.slug}
          </Link>
          . Anything you update under Profile shows up there immediately.
        </p>
      </div>
    </section>
  );
}
