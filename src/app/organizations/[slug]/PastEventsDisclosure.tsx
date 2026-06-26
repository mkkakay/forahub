"use client";

// Lightweight client wrapper for the "Show N past events" toggle. The
// list itself stays server-rendered (good for SEO + cheap on shares);
// we just gate its visibility with a single useState. No fetch, no data
// dependency.

import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";

export default function PastEventsDisclosure({
  count, children,
}: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`${open ? "Hide" : "Show"} ${count} past event${count === 1 ? "" : "s"}`}
        className="w-full flex items-center justify-between gap-3 bg-white/5 dark:bg-white/5 border border-gray-200 dark:border-slate-700 hover:border-[#4ea8de] rounded-2xl px-4 py-3 text-left transition-colors group"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f2a4a] dark:text-white">
          <History className="w-4 h-4 text-gray-400 group-hover:text-[#4ea8de]" aria-hidden="true" />
          {open ? "Hide" : "Show"} {count} past event{count === 1 ? "" : "s"}
        </span>
        {open ? <ChevronUp size={16} className="text-gray-400" aria-hidden="true" /> : <ChevronDown size={16} className="text-gray-400" aria-hidden="true" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}
