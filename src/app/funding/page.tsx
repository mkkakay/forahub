export const dynamic = "force-dynamic";

import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { Calendar, MapPin, Building2, ExternalLink, DollarSign } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Funded Opportunities",
  description: "Conferences and events with travel grants, fellowships, and scholarships.",
};

type EventRow = Database["public"]["Tables"]["events"]["Row"];

const SDG_COLORS: Record<number, string> = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",
  6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",
  11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",
  16:"#00689D",17:"#19486A",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function FundingPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
  );

  const today = new Date().toISOString();

  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("start_date", today)
    .or("has_travel_grant.eq.true,fellowship_available.eq.true")
    .order("start_date", { ascending: true });

  const events = (data as EventRow[] | null) ?? [];

  const { data: allData } = await supabase
    .from("events")
    .select("*")
    .gte("start_date", today)
    .ilike("description", "%travel grant%")
    .order("start_date", { ascending: true })
    .limit(50);

  const allFunded = [...events, ...(allData as EventRow[] | null ?? [])];
  const unique = Array.from(new Map(allFunded.map(e => [e.id, e])).values());

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign size={20} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white">Funded Opportunities</h1>
              <p className="text-blue-200 text-sm mt-0.5">Conferences with travel grants, fellowships &amp; scholarships</p>
            </div>
          </div>
          <p className="text-blue-200 text-sm max-w-2xl mt-4">
            These events offer financial support to help global development professionals attend. Deadlines move fast — save events to track them.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {unique.length === 0 ? (
          <div className="text-center py-20">
            <DollarSign size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No funded events found right now.</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon — we update listings regularly.</p>
            <Link href="/events" className="mt-4 inline-block text-[#4ea8de] hover:underline text-sm">Browse all events →</Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{unique.length} funded opportunities</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {unique.map(event => {
                const sdg = event.sdg_goals?.[0];
                const color = sdg ? SDG_COLORS[sdg] : "#3b82f6";
                return (
                  <Link key={event.id} href={`/events/${event.id}`}
                    className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] shadow-sm hover:shadow-md transition-all group overflow-hidden">
                    <div className="h-1.5" style={{ backgroundColor: color }} />
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                          <DollarSign size={11} /> Travel Grant
                        </span>
                        {sdg && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
                            SDG {sdg}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-[#0f2a4a] dark:text-white text-sm leading-snug group-hover:text-[#4ea8de] transition-colors line-clamp-2 mb-3">
                        {event.title}
                      </h3>
                      <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5"><Calendar size={11} /> {formatDate(event.start_date)}</span>
                        {event.location && <span className="flex items-center gap-1.5"><MapPin size={11} /><span className="truncate">{event.location}</span></span>}
                        {event.organization && <span className="flex items-center gap-1.5"><Building2 size={11} /><span className="truncate">{event.organization}</span></span>}
                      </div>
                      {event.registration_url && (
                        <div className="mt-4 flex items-center gap-1 text-xs text-[#4ea8de] font-medium">
                          <ExternalLink size={11} /> Apply for funding
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
