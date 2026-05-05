import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { MapPin, Calendar, Building2, ExternalLink, ArrowLeft, Share2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import EventDetailActions from "./EventDetailActions";
import type { Database } from "@/lib/supabase/types";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Affordable Energy", 8: "Decent Work",
  9: "Industry & Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace & Justice", 17: "Partnerships",
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

  if (!event) notFound();

  const typedEvent = event as EventRow;
  const primarySdg = typedEvent.sdg_goals?.[0];
  const sdgColor = primarySdg ? SDG_COLORS[primarySdg] : "#0f2a4a";
  const orgInitial = typedEvent.organization?.trim()[0]?.toUpperCase() ?? "E";

  const daysUntil = typedEvent.registration_deadline
    ? Math.ceil((new Date(typedEvent.registration_deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a]">
      <Navbar />

      {/* Hero */}
      <div
        className="relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden"
        style={{ background: `linear-gradient(135deg, #0f2a4a 55%, ${sdgColor}44)` }}
      >
        {/* Subtle pattern */}
        <div className="absolute inset-0 bg-dot-grid opacity-10 pointer-events-none" aria-hidden="true" />

        <div className="max-w-4xl mx-auto relative">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-blue-300 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/events" className="hover:text-white transition-colors">Events</Link>
            <span>/</span>
            <span className="text-white/70 truncate max-w-xs">{typedEvent.title}</span>
          </nav>

          <div className="flex items-start gap-5">
            {/* Org initial avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-3xl shrink-0 shadow-lg"
              style={{ backgroundColor: sdgColor }}
            >
              {orgInitial}
            </div>

            <div className="flex-1 min-w-0">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {primarySdg && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: sdgColor }}
                  >
                    SDG {primarySdg} — {SDG_LABELS[primarySdg]}
                  </span>
                )}
                {typedEvent.format && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-blue-200">
                    {FORMAT_LABELS[typedEvent.format] ?? typedEvent.format}
                  </span>
                )}
                {typedEvent.event_type && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-blue-200">
                    {EVENT_TYPE_LABELS[typedEvent.event_type] ?? typedEvent.event_type}
                  </span>
                )}
              </div>

              {/* Organization */}
              {typedEvent.organization && (
                <p className="text-[#4ea8de] text-sm font-semibold mb-2">{typedEvent.organization}</p>
              )}

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                {typedEvent.title}
              </h1>

              {/* Quick meta row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-200 mb-5">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {formatDateRange(typedEvent.start_date, typedEvent.end_date)}
                </span>
                {typedEvent.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {typedEvent.location}
                  </span>
                )}
              </div>

              {/* Client actions */}
              <EventDetailActions event={typedEvent} />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Description + SDG tags */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm p-6">
              <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-4">About this event</h2>
              {typedEvent.description ? (
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-base">
                  {typedEvent.description}
                </p>
              ) : (
                <p className="text-gray-400 italic">No description available.</p>
              )}

              {typedEvent.sdg_goals && typedEvent.sdg_goals.length > 1 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-[#0f2a4a] dark:text-white mb-3">SDG Goals</h3>
                  <div className="flex flex-wrap gap-2">
                    {typedEvent.sdg_goals.map(sdgNum => (
                      <span
                        key={sdgNum}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full text-white"
                        style={{ backgroundColor: SDG_COLORS[sdgNum] ?? "#3b82f6" }}
                      >
                        SDG {sdgNum} — {SDG_LABELS[sdgNum]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Back to events */}
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-sm text-[#4ea8de] hover:text-[#3a95cc] transition-colors font-medium"
            >
              <ArrowLeft size={15} />
              Back to events
            </Link>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Register CTA — top of sidebar */}
            {typedEvent.registration_url && (
              <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm p-5">
                <a
                  href={typedEvent.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#4ea8de] hover:bg-[#3a95cc] text-white font-bold px-5 py-3.5 rounded-xl transition-colors text-base shadow-sm hover:shadow-md"
                >
                  Register Now
                  <ExternalLink size={16} />
                </a>
                {daysUntil !== null && daysUntil > 0 && (
                  <p className="text-center text-xs text-red-500 dark:text-red-400 mt-2 font-medium">
                    Registration closes in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                  </p>
                )}
                {daysUntil !== null && daysUntil <= 0 && (
                  <p className="text-center text-xs text-gray-400 mt-2">Registration deadline passed</p>
                )}
              </div>
            )}

            {/* Event details card */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm p-5">
              <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-widest">Event Details</h2>
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="shrink-0 text-[#4ea8de] mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#0f2a4a] dark:text-white text-xs uppercase tracking-wide mb-0.5">Date</p>
                    <p className="text-gray-600 dark:text-gray-300">{formatDateRange(typedEvent.start_date, typedEvent.end_date)}</p>
                  </div>
                </div>

                {typedEvent.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="shrink-0 text-[#4ea8de] mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#0f2a4a] dark:text-white text-xs uppercase tracking-wide mb-0.5">Location</p>
                      <p className="text-gray-600 dark:text-gray-300">{typedEvent.location}</p>
                    </div>
                  </div>
                )}

                {typedEvent.organization && (
                  <div className="flex items-start gap-3">
                    <Building2 size={16} className="shrink-0 text-[#4ea8de] mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#0f2a4a] dark:text-white text-xs uppercase tracking-wide mb-0.5">Organizer</p>
                      <p className="text-gray-600 dark:text-gray-300">{typedEvent.organization}</p>
                    </div>
                  </div>
                )}

                {typedEvent.registration_deadline && (
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#0f2a4a] dark:text-white text-xs uppercase tracking-wide mb-0.5">Registration Deadline</p>
                      <p className="text-red-600 dark:text-red-400">
                        {new Date(typedEvent.registration_deadline).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Share card */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-[#334155] shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                <Share2 size={12} /> Share
              </p>
              <div className="flex gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(typedEvent.title)}&url=${encodeURIComponent(`https://forahub.org/events/${typedEvent.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-gray-100 dark:bg-[#334155] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#475569] transition-colors"
                >
                  X / Twitter
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://forahub.org/events/${typedEvent.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-gray-100 dark:bg-[#334155] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#475569] transition-colors"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
