import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, ArrowLeft, Lock, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import { adminSupabase } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOrgManager, listOrgManagers } from "@/lib/orgs/managers";
import ManageOrgForm from "./ManageOrgForm";

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

const LOCKED_FEATURES = [
  { title: "Event management", body: "Auto-publish events from your team without admin review." },
  { title: "Analytics", body: "See views, saves, and registration clicks per event." },
  { title: "Recurring events", body: "Set up monthly webinars or annual conferences with one entry." },
  { title: "Team accounts", body: "Invite colleagues to manage events under your verified org." },
];

export default async function ManageOrgPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { claimed?: string };
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

  const managers = await listOrgManagers(org.slug);

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

        <section className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
          <h2 className="text-lg font-bold text-[#0f2a4a] inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0f2a4a]" /> Managers
            <span className="text-xs font-semibold text-gray-500 tabular-nums">({managers.length})</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Anyone with a verified <span className="font-semibold">{org.domain ? `@${org.domain}` : "matching work-email"}</span> can join as a co-manager from the claim page.
          </p>
          <ul className="mt-3 divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {managers.map(m => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="text-gray-800 truncate">{m.email || "(unknown email)"}</div>
                  <div className="text-[11px] text-gray-500">
                    {m.added_via === "domain_match"
                      ? "Verified via work-email domain match"
                      : m.added_via === "admin_review"
                      ? "Verified via admin review"
                      : "Verified manager"}
                    {m.verified_at && (
                      <> · {new Date(m.verified_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                  {m.role}
                </span>
              </li>
            ))}
            {managers.length === 0 && (
              <li className="px-3 py-3 text-sm text-gray-500">No managers on file.</li>
            )}
          </ul>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
          </div>
        </section>

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
      </main>
    </div>
  );
}
