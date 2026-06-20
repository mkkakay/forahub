import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, ArrowLeft, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager, isDomainVerified, effectiveAutoPublish, listOrgManagers } from "@/lib/orgs/managers";
import { listPendingInvites } from "@/lib/orgs/invites";
import { AUTOPUBLISH_CAP_PER_24H, AUTOPUBLISH_WINDOW_HOURS } from "@/lib/orgs/autoPublish";
import ManageOrgForm from "./ManageOrgForm";
import TeamPanel, { type ManagerView, type InviteView } from "./TeamPanel";
import EventsPanel, { type EventView } from "./EventsPanel";
import SeriesPanel from "./SeriesPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import { loadOrgAnalytics } from "@/lib/analytics/aggregate";

export const dynamic = "force-dynamic";

interface OrgRow {
  slug: string;
  name: string;
  short_name: string | null;
  description: string | null;
  domain: string | null;
  logo_url: string | null;
  website_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  is_claimed: boolean | null;
  is_verified: boolean | null;
  claimed_at: string | null;
}

// Every "Coming soon" feature now ships as a live panel. Add new tiles
// here if you have something to tease — otherwise this can stay empty
// and the "Coming soon" section just won't render.
const LOCKED_FEATURES: { title: string; body: string }[] = [];

export default async function ManageOrgPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { claimed?: string; invited?: string };
}) {
  const sb = createServerSupabaseClient();
  const { data: u } = await sb.auth.getUser();
  const userId = u.user?.id ?? null;

  if (!userId) {
    redirect(`/auth/signin?next=${encodeURIComponent(`/orgs/${params.slug}/manage`)}`);
  }

  const { data, error } = await adminSupabase
    .from("organizations_directory")
    .select("slug, name, short_name, description, domain, logo_url, website_url, twitter_url, linkedin_url, is_claimed, is_verified, claimed_at")
    .eq("slug", params.slug)
    .maybeSingle();

  if (error || !data) {
    redirect(`/?error=org_not_found`);
  }
  const org = data as OrgRow;

  // Authoritative access check: a seat in org_managers for (slug, auth.uid()).
  // Same predicate the /claim short-circuit uses (isOrgManager), so the two
  // pages can never disagree.
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

  // Rolling-window cap counter — used by EventsPanel to show "X of N
  // instant-publishes used today" when capacity is low.
  const sinceIso = new Date(Date.now() - AUTOPUBLISH_WINDOW_HOURS * 3600 * 1000).toISOString();
  const [managerRows, inviteRows, eventsRes, autoPublishedCountRes, analytics30, analytics90] = await Promise.all([
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

  // Annotate each manager with founder/self flags so the TeamPanel can
  // disable the right buttons without re-running the same predicate
  // client-side. Founder = earliest added_at (managerRows is already
  // ordered ascending by listOrgManagers).
  const founderId = managerRows[0]?.id ?? null;
  const viewerSeat = managerRows.find(m => m.user_id === userId) ?? null;
  const viewerIsDomainVerified = !!viewerSeat && isDomainVerified(viewerSeat.added_via);
  const viewerCanAutoPublish = !!viewerSeat && effectiveAutoPublish(viewerSeat);

  const managersForPanel: ManagerView[] = managerRows.map(m => ({
    id: m.id,
    user_id: m.user_id,
    email: m.email,
    role: m.role,
    added_at: m.added_at,
    verified_at: m.verified_at,
    added_via: m.added_via,
    is_founder: m.id === founderId,
    is_self: m.user_id === userId,
    can_autopublish: m.can_autopublish,
    autopublish_granted_at: m.autopublish_granted_at,
    is_trusted: isDomainVerified(m.added_via),
  }));
  const invitesForPanel: InviteView[] = inviteRows.map(i => ({
    id: i.id,
    invited_email: i.invited_email,
    invited_by_email: i.invited_by_email,
    note: i.note,
    status: i.status,
    expires_at: i.expires_at,
    created_at: i.created_at,
  }));
  const eventsForPanel: EventView[] = ((eventsRes.data ?? []) as EventView[]);
  const autoPublishedInWindow = autoPublishedCountRes.count ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10 md:py-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2a4a] tracking-tight inline-flex items-center gap-3">
            Manage {org.name}
            <BadgeCheck className="w-7 h-7 text-emerald-600" aria-label="Verified organization" />
          </h1>
          <p className="text-base text-gray-600 mt-2">
            You&apos;re a verified manager. Update your org&apos;s profile below.
          </p>
        </header>

        {searchParams.claimed === "1" && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm">
            Claim verified. Your verified badge is now live across ForaHub.
          </div>
        )}
        {searchParams.invited === "1" && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-sm">
            Welcome to the team. You can update the org profile below and invite colleagues from the Team section.
          </div>
        )}

        <ManageOrgForm
          slug={org.slug}
          initial={{
            name: org.name,
            short_name: org.short_name ?? "",
            description: org.description ?? "",
            logo_url: org.logo_url ?? "",
            website_url: org.website_url ?? "",
            twitter_url: org.twitter_url ?? "",
            linkedin_url: org.linkedin_url ?? "",
          }}
        />

        <TeamPanel
          slug={org.slug}
          orgName={org.name}
          orgDomain={org.domain}
          managers={managersForPanel}
          invites={invitesForPanel}
          viewerIsDomainVerified={viewerIsDomainVerified}
        />

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

        <SeriesPanel
          slug={org.slug}
          orgName={org.name}
          orgDomain={org.domain}
          defaultOrganization={org.name}
        />

        <AnalyticsPanel
          slug={org.slug}
          orgName={org.name}
          summary30={analytics30}
          summary90={analytics90}
        />

        <section className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Org status</dt>
            <dd className="text-emerald-700 font-semibold inline-flex items-center gap-1.5 mt-1">
              <BadgeCheck className="w-4 h-4" /> {org.is_verified ? "Verified" : "Claimed"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">First verified</dt>
            <dd className="text-gray-800 mt-1">
              {org.claimed_at
                ? new Date(org.claimed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </dd>
          </div>
        </section>

        {LOCKED_FEATURES.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-[#0f2a4a] mb-3">Coming soon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {LOCKED_FEATURES.map(f => (
                <div key={f.title} className="bg-white rounded-2xl border border-dashed border-gray-300 p-4 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0f2a4a]">{f.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
