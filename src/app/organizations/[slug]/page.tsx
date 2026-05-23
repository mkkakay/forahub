export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Calendar, ChevronLeft } from "lucide-react";
import type { Database } from "@/lib/supabase/types";
import Navbar from "@/components/Navbar";
import { getOrgBySlug } from "@/lib/organizations";
import type { EventPreview } from "@/components/HomeClient";
import OrgPageClient from "./OrgPageClient";

const COLS =
  "id, title, start_date, end_date, location, organization, sdg_goals, is_featured, format, region";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = getOrgBySlug(slug);
  if (!org) notFound();

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );

  const orFilter = org.matchPatterns
    .map(p => `organization.ilike.%${p.replace(/[(),]/g, " ").trim()}%`)
    .join(",");

  const { data } = await supabase
    .from("events")
    .select(COLS)
    .or(orFilter)
    .order("start_date", { ascending: true });

  const events = (data as EventPreview[] | null) ?? [];
  const upcomingCount = events.filter(
    e => new Date(e.start_date).getTime() >= Date.now()
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a]">
      <Navbar />

      {/* ── ORG HEADER ───────────────────────────────────────────────── */}
      <header
        className="border-b border-gray-200 dark:border-[#334155]"
        style={{ backgroundColor: `${org.color}10` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#0f2a4a] dark:hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft size={14} /> Back to home
          </Link>
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] flex items-center justify-center p-3 shrink-0 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={org.logo}
                alt={org.name}
                className="max-w-full max-h-full object-contain"
                crossOrigin="anonymous"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[11px] font-bold uppercase tracking-widest mb-1"
                style={{ color: org.color }}
              >
                {org.short}
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {org.name}
              </h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
                {org.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} />
                  {events.length} total event{events.length !== 1 ? "s" : ""}
                </span>
                {upcomingCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: org.color }}
                    />
                    {upcomingCount} upcoming
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {events.length === 0 ? (
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm p-10 md:p-16 text-center">
            <Calendar
              size={36}
              className="text-gray-300 dark:text-gray-600 mx-auto mb-4"
            />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No events yet for {org.short}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              We&apos;ll surface them here as soon as our scrapers pick them up.
              In the meantime, explore events from the wider network.
            </p>
            <Link
              href="/events"
              className="inline-block bg-[#0f2a4a] hover:bg-[#1a3f6e] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Browse all events
            </Link>
          </div>
        ) : (
          <OrgPageClient events={events} accentColor={org.color} />
        )}
      </main>
    </div>
  );
}
