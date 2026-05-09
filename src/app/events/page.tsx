import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import EventsClient from "./EventsClient";
import Navbar from "@/components/Navbar";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const now = new Date();
  const today = now.toISOString();
  const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
  const endOf2030 = "2030-12-31T23:59:59.999Z";

  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("start_date", twoYearsAgo)
    .lte("start_date", endOf2030)
    .order("start_date", { ascending: true });

  const events = (data as EventRow[] | null) ?? [];
  const searchQuery = searchParams.q?.trim() ?? "";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      {/* Page header */}
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-blue-300 text-sm mb-3">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Events</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Global Events</h1>
          <p className="mt-2 text-blue-200 text-sm">
            {events.length} events · 2023–2030 · across all SDG goals
          </p>
        </div>
      </div>

      <EventsClient events={events} initialSearch={searchQuery} today={today} />
    </div>
  );
}
