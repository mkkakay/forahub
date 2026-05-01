import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { MapPin, Calendar, Building2, Tag, ExternalLink, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import EventDetailActions from "./EventDetailActions";
import type { Database } from "@/lib/supabase/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

const SDG_META: Record<number, { label: string; color: string }> = {
  1:  { label: "No Poverty",              color: "bg-red-100 text-red-800" },
  2:  { label: "Zero Hunger",             color: "bg-yellow-100 text-yellow-800" },
  3:  { label: "Good Health",             color: "bg-green-100 text-green-800" },
  4:  { label: "Quality Education",       color: "bg-red-100 text-red-800" },
  5:  { label: "Gender Equality",         color: "bg-orange-100 text-orange-800" },
  6:  { label: "Clean Water",             color: "bg-cyan-100 text-cyan-800" },
  7:  { label: "Affordable Energy",       color: "bg-amber-100 text-amber-800" },
  8:  { label: "Decent Work",             color: "bg-rose-100 text-rose-800" },
  9:  { label: "Industry & Innovation",   color: "bg-orange-100 text-orange-800" },
  10: { label: "Reduced Inequalities",    color: "bg-pink-100 text-pink-800" },
  11: { label: "Sustainable Cities",      color: "bg-amber-100 text-amber-800" },
  12: { label: "Responsible Consumption", color: "bg-lime-100 text-lime-800" },
  13: { label: "Climate Action",          color: "bg-green-100 text-green-800" },
  14: { label: "Life Below Water",        color: "bg-blue-100 text-blue-800" },
  15: { label: "Life on Land",            color: "bg-lime-100 text-lime-800" },
  16: { label: "Peace & Justice",         color: "bg-purple-100 text-purple-800" },
  17: { label: "Partnerships",            color: "bg-indigo-100 text-indigo-800" },
};

const FORMAT_LABELS: Record<string, string> = {
  in_person: "In Person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: "Conference",
  side_event: "Side Event",
  webinar: "Webinar",
  training: "Training",
};

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  if (!end) return fmt(start);
  const s = new Date(start);
  const e = new Date(end);
  if (s.getUTCFullYear() === e.getUTCFullYear() && s.getUTCMonth() === e.getUTCMonth()) {
    return `${s.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} ${s.getUTCDate()}–${e.getUTCDate()}, ${s.getUTCFullYear()}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  const typedEvent = event as EventRow;
  const primarySdg = typedEvent.sdg_goals?.[0];
  const primarySdgMeta = primarySdg ? SDG_META[primarySdg] : null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      {/* Dark navy header */}
      <div className="bg-[#0f2a4a] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-blue-300 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/events" className="hover:text-white transition-colors">Events</Link>
            <span>/</span>
            <span className="text-white truncate max-w-xs">{typedEvent.title}</span>
          </nav>

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {primarySdgMeta && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${primarySdgMeta.color}`}>
                <Tag size={11} />
                SDG {primarySdg} — {primarySdgMeta.label}
              </span>
            )}
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-blue-200">
              {FORMAT_LABELS[typedEvent.format] ?? typedEvent.format}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-blue-200">
              {EVENT_TYPE_LABELS[typedEvent.event_type] ?? typedEvent.event_type}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-4">
            {typedEvent.title}
          </h1>

          {/* Client actions: bookmark, calendar, share */}
          <EventDetailActions event={typedEvent} />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Description + SDG tags */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#0f2a4a] mb-4">About this event</h2>
              {typedEvent.description ? (
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{typedEvent.description}</p>
              ) : (
                <p className="text-gray-400 italic">No description available.</p>
              )}

              {/* All SDG goals */}
              {typedEvent.sdg_goals && typedEvent.sdg_goals.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-[#0f2a4a] mb-3">SDG Goals</h3>
                  <div className="flex flex-wrap gap-2">
                    {typedEvent.sdg_goals.map(sdgNum => {
                      const meta = SDG_META[sdgNum];
                      if (!meta) return null;
                      return (
                        <span
                          key={sdgNum}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}
                        >
                          <Tag size={11} />
                          SDG {sdgNum} — {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Registration button */}
              {typedEvent.registration_url && (
                <div className="mt-6">
                  <a
                    href={typedEvent.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
                  >
                    Register for this event
                    <ExternalLink size={15} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: event details */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-[#0f2a4a] mb-4 uppercase tracking-wide">Event Details</h2>
              <div className="flex flex-col gap-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="shrink-0 text-[#4ea8de] mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-800">Date</p>
                    <p>{formatDateRange(typedEvent.start_date, typedEvent.end_date)}</p>
                  </div>
                </div>

                {typedEvent.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="shrink-0 text-[#4ea8de] mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800">Location</p>
                      <p>{typedEvent.location}</p>
                    </div>
                  </div>
                )}

                {typedEvent.organization && (
                  <div className="flex items-start gap-3">
                    <Building2 size={16} className="shrink-0 text-[#4ea8de] mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800">Organizer</p>
                      <p>{typedEvent.organization}</p>
                    </div>
                  </div>
                )}

                {typedEvent.registration_deadline && (
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800">Registration Deadline</p>
                      <p className="text-red-600">
                        {new Date(typedEvent.registration_deadline).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Back to events */}
        <div className="mt-8">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm text-[#4ea8de] hover:text-[#3a95cc] transition-colors font-medium"
          >
            <ArrowLeft size={15} />
            Back to events
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0f2a4a] mt-8 py-8 px-4 text-center">
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} ForaHub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
