import { Calendar } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import EventsClient from "./EventsClient";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export default async function EventsPage() {
  const today = new Date().toISOString().split("T")[0];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + 24);
  const cutoffDate = cutoff.toISOString().split("T")[0];

  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("start_date", today)
    .lte("start_date", cutoffDate)
    .order("start_date", { ascending: true });

  const events = (data as EventRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navigation */}
      <nav className="bg-[#0f2a4a] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-white text-xl font-bold tracking-tight">
              Fora<span className="text-[#4ea8de]">Hub</span>
            </Link>
            <div className="flex items-center gap-3">
              <button className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                Sign In
              </button>
              <button className="bg-[#4ea8de] hover:bg-[#3a95cc] text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

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
