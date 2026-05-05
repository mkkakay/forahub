"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useSubscription } from "@/context/SubscriptionContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { Calendar, Globe, Star, Bookmark, Trophy, ArrowRight } from "lucide-react";

const SDG_COLORS: Record<number, string> = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",
  6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",
  11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",
  16:"#00689D",17:"#19486A",
};

const BADGES = [
  { id: "first", icon: "🌟", label: "First Event Saved", desc: "Save your first event" },
  { id: "five", icon: "🎯", label: "5 Events", desc: "Save 5 events" },
  { id: "ten", icon: "🏆", label: "10 Events", desc: "Save 10 events" },
  { id: "global", icon: "🌍", label: "Global Citizen", desc: "Events in 5+ countries" },
  { id: "sdgs", icon: "🎨", label: "SDG Explorer", desc: "Events across 5+ SDGs" },
];

interface SavedEvent {
  id: string;
  event_id: string;
  events: {
    id: string;
    title: string;
    start_date: string;
    location: string | null;
    organization: string | null;
    sdg_goals: number[];
    registration_deadline: string | null;
  } | null;
}

export default function DashboardPage() {
  const { userId, isLoading } = useSubscription();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !userId) router.push("/auth/signin");
  }, [isLoading, userId, router]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("saved_events")
      .select("id, event_id, events(id, title, start_date, location, organization, sdg_goals, registration_deadline)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSaved((data as SavedEvent[] | null) ?? []);
        setLoading(false);
      });
  }, [userId]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="skeleton h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  const events = saved.map(s => s.events).filter(Boolean);
  const today = new Date();
  const upcoming = events
    .filter(e => e && new Date(e.start_date) >= today)
    .sort((a, b) => new Date(a!.start_date).getTime() - new Date(b!.start_date).getTime())
    .slice(0, 3);

  const allSDGs = events.flatMap(e => e?.sdg_goals ?? []);
  const uniqueSDGs = Array.from(new Set(allSDGs));
  const sdgCounts = uniqueSDGs.reduce((acc, sdg) => {
    acc[sdg] = allSDGs.filter(s => s === sdg).length;
    return acc;
  }, {} as Record<number, number>);

  const earnedBadges = BADGES.filter(b => {
    if (b.id === "first") return events.length >= 1;
    if (b.id === "five") return events.length >= 5;
    if (b.id === "ten") return events.length >= 10;
    if (b.id === "sdgs") return uniqueSDGs.length >= 5;
    return false;
  });

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  function daysUntil(d: string) {
    return Math.ceil((new Date(d).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-white">My Dashboard</h1>
          <p className="text-blue-200 text-sm mt-1">Your professional development at a glance</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Bookmark size={20} className="text-[#4ea8de]" />, value: events.length, label: "Events Saved" },
            { icon: <Calendar size={20} className="text-green-500" />, value: upcoming.length, label: "Upcoming" },
            { icon: <Star size={20} className="text-amber-500" />, value: uniqueSDGs.length, label: "SDG Goals" },
            { icon: <Globe size={20} className="text-purple-500" />, value: earnedBadges.length, label: "Badges Earned" },
          ].map(({ icon, value, label }) => (
            <div key={label} className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                {icon}
                <span className="text-2xl font-bold text-[#0f2a4a] dark:text-white">{value}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white">Next Up</h2>
              <Link href="/saved" className="text-sm text-[#4ea8de] hover:underline flex items-center gap-1">
                All saved <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {upcoming.map(event => {
                if (!event) return null;
                const days = daysUntil(event.start_date);
                const sdg = event.sdg_goals?.[0];
                return (
                  <Link key={event.id} href={`/events/${event.id}`}
                    className="flex items-center gap-4 bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] p-4 hover:shadow-md transition-shadow">
                    {sdg && (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: SDG_COLORS[sdg] }}>
                        {sdg}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#0f2a4a] dark:text-white truncate">{event.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(event.start_date)} · {event.location}</p>
                    </div>
                    <div className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      days <= 7 ? "bg-red-100 text-red-700" : days <= 30 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {days}d
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* SDG Distribution */}
        {uniqueSDGs.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-4">SDG Focus</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sdgCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([sdg, count]) => (
                  <div key={sdg} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: SDG_COLORS[Number(sdg)] }}>
                    SDG {sdg} · {count}
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Badges */}
        <section>
          <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Achievements
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {BADGES.map(badge => {
              const earned = earnedBadges.find(b => b.id === badge.id);
              return (
                <div key={badge.id} className={`rounded-xl border p-3 text-center transition-all ${
                  earned
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700"
                    : "bg-gray-50 dark:bg-[#1e293b] border-gray-200 dark:border-[#334155] opacity-40"
                }`}>
                  <div className="text-2xl mb-1">{badge.icon}</div>
                  <p className="text-xs font-bold text-[#0f2a4a] dark:text-white">{badge.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{badge.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alerts link */}
        <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">Set up keyword alerts</p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">Get notified when new matching events are added</p>
          </div>
          <Link href="/alerts" className="text-sm font-semibold text-[#4ea8de] hover:underline flex items-center gap-1">
            Manage <ArrowRight size={14} />
          </Link>
        </section>
      </main>
    </div>
  );
}
