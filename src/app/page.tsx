export const dynamic = "force-dynamic";

import Link from "next/link";
import { Search, MapPin, Calendar, Building2, Tag } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import Navbar from "@/components/Navbar";

type EventPreview = Pick<
  Database['public']['Tables']['events']['Row'],
  'id' | 'title' | 'start_date' | 'end_date' | 'location' | 'organization' | 'sdg_goals' | 'is_featured'
>;

const SDG_META: Record<number, { label: string; color: string }> = {
  1:  { label: "SDG 1 — No Poverty",              color: "bg-red-100 text-red-800" },
  2:  { label: "SDG 2 — Zero Hunger",              color: "bg-yellow-100 text-yellow-800" },
  3:  { label: "SDG 3 — Good Health",              color: "bg-green-100 text-green-800" },
  4:  { label: "SDG 4 — Quality Education",        color: "bg-red-100 text-red-800" },
  5:  { label: "SDG 5 — Gender Equality",          color: "bg-orange-100 text-orange-800" },
  6:  { label: "SDG 6 — Clean Water",              color: "bg-cyan-100 text-cyan-800" },
  7:  { label: "SDG 7 — Affordable Energy",        color: "bg-amber-100 text-amber-800" },
  8:  { label: "SDG 8 — Decent Work",              color: "bg-rose-100 text-rose-800" },
  9:  { label: "SDG 9 — Industry & Innovation",    color: "bg-orange-100 text-orange-800" },
  10: { label: "SDG 10 — Reduced Inequalities",    color: "bg-pink-100 text-pink-800" },
  11: { label: "SDG 11 — Sustainable Cities",      color: "bg-amber-100 text-amber-800" },
  12: { label: "SDG 12 — Responsible Consumption", color: "bg-lime-100 text-lime-800" },
  13: { label: "SDG 13 — Climate Action",          color: "bg-green-100 text-green-800" },
  14: { label: "SDG 14 — Life Below Water",        color: "bg-blue-100 text-blue-800" },
  15: { label: "SDG 15 — Life on Land",            color: "bg-lime-100 text-lime-800" },
  16: { label: "SDG 16 — Peace & Justice",         color: "bg-purple-100 text-purple-800" },
  17: { label: "SDG 17 — Partnerships",            color: "bg-indigo-100 text-indigo-800" },
};

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });

  if (!end) return fmt(start);

  const s = new Date(start);
  const e = new Date(end);

  if (
    s.getUTCFullYear() === e.getUTCFullYear() &&
    s.getUTCMonth() === e.getUTCMonth()
  ) {
    return `${s.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} ${s.getUTCDate()}–${e.getUTCDate()}, ${s.getUTCFullYear()}`;
  }

  return `${fmt(start)} – ${fmt(end)}`;
}

export default async function Home() {
  const today = new Date().toISOString();
  const twoYearsFromNow = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("events")
    .select("id, title, start_date, end_date, location, organization, sdg_goals, is_featured")
    .gte("start_date", today)
    .lte("start_date", twoYearsFromNow)
    .order("start_date", { ascending: true })
    .limit(6);
  const events = data as EventPreview[] | null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0f2a4a] pb-20 pt-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Never Miss a Global Development Event
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto">
            Conferences, side events, and convenings across all SDG goals, in one place.
          </p>

          {/* Search bar */}
          <div className="mt-8 flex items-center bg-white rounded-xl shadow-lg overflow-hidden max-w-2xl mx-auto">
            <Search className="ml-4 text-gray-400 shrink-0" size={20} />
            <input
              type="text"
              placeholder="Search events, organizations, or SDG goals…"
              className="flex-1 px-4 py-4 text-gray-800 placeholder-gray-400 text-sm focus:outline-none"
            />
            <button className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-6 py-4 text-sm transition-colors shrink-0">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Events section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-bold text-[#0f2a4a]">Upcoming Events</h2>
          <Link href="/events" className="text-[#4ea8de] hover:text-[#3a95cc] text-sm font-medium transition-colors">
            View all →
          </Link>
        </div>

        {!events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Calendar size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">Events coming soon.</p>
            <p className="text-gray-400 text-sm mt-1">Check back shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const primarySdg = event.sdg_goals?.[0];
              const sdg = primarySdg ? SDG_META[primarySdg] : null;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4 group"
                >
                  {/* SDG tag */}
                  {sdg && (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${sdg.color}`}>
                      <Tag size={11} />
                      {sdg.label}
                    </span>
                  )}

                  {/* Title */}
                  <h3 className="text-[#0f2a4a] font-semibold text-base leading-snug group-hover:text-[#4ea8de] transition-colors">
                    {event.title}
                  </h3>

                  {/* Meta */}
                  <div className="flex flex-col gap-2 mt-auto text-sm text-gray-500">
                    <span className="flex items-center gap-2">
                      <Calendar size={14} className="shrink-0 text-gray-400" />
                      {formatDateRange(event.start_date, event.end_date)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-2">
                        <MapPin size={14} className="shrink-0 text-gray-400" />
                        {event.location}
                      </span>
                    )}
                    {event.organization && (
                      <span className="flex items-center gap-2">
                        <Building2 size={14} className="shrink-0 text-gray-400" />
                        {event.organization}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-[#0f2a4a] mt-8 py-8 px-4 text-center">
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} ForaHub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
