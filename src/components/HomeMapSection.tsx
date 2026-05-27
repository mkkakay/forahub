"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Globe } from "lucide-react";

const EventsMap = dynamic(() => import("./EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
  ),
});

export default function HomeMapSection({ totalWithCoords }: { totalWithCoords: number }) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight inline-flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            Events around the world
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {totalWithCoords.toLocaleString()} upcoming in-person event{totalWithCoords === 1 ? "" : "s"} mapped globally
          </p>
        </div>
        <Link
          href="/map"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-[#4ea8de] hover:text-[#3a95cc]"
        >
          Explore the full map <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <EventsMap mode="teaser" height={300} />

      <div className="mt-2 sm:hidden text-right">
        <Link
          href="/map"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#4ea8de] hover:text-[#3a95cc]"
        >
          Explore the full map <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
