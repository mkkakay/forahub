"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { searchCities, flagEmoji, formatLocation, type LocationResult } from "@/lib/location/nominatim";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onPickedLocation: (loc: LocationResult) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 400;

export default function LocationCombobox({ value, onChange, onPickedLocation, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // Track the last picked value so we don't immediately re-query for it.
  const lastPickedRef = useRef<string>("");

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function scheduleQuery(q: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 2 || q === lastPickedRef.current) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchCities(q);
        setResults(r);
        setOpen(r.length > 0);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function pick(loc: LocationResult) {
    const formatted = formatLocation(loc);
    lastPickedRef.current = formatted;
    onChange(formatted);
    onPickedLocation(loc);
    setOpen(false);
    setResults([]);
  }

  return (
    <div className={`relative ${className ?? ""}`} ref={wrapperRef}>
      <div className="relative">
        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            scheduleQuery(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "e.g. Geneva, Switzerland"}
          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4ea8de]/40 focus:border-[#4ea8de] transition-colors"
          autoComplete="off"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-900 flex items-center gap-2 text-sm border-b border-gray-100 dark:border-slate-800 last:border-b-0"
              >
                <span className="text-base shrink-0">{flagEmoji(r.country_code)}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 dark:text-slate-100 block truncate">{formatLocation(r)}</span>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 block truncate">{r.display_name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
