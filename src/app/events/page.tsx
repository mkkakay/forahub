import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import EventsClient from "./EventsClient";
import Navbar from "@/components/Navbar";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export default async function EventsPage() {
  const today = new Date().toISOString();
  const twoYearsFromNow = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("start_date", today)
    .lte("start_date", twoYearsFromNow)
    .order("start_date", { ascending: true });

  const events = (data as EventRow[] | null) ?? [];

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
          <h1 className="text-3xl font-extrabold text-white">All Upcoming Events</h1>
          <p className="mt-2 text-blue-200 text-sm">
            Next 24 months · {events.length} events across all SDG goals
          </p>
        </div>
      </div>

      <EventsClient events={events} />

      <footer className="bg-[#0f2a4a] mt-8 py-8 px-4 text-center">
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} ForaHub. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
