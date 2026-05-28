"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";

interface NominatimSuggestion {
  display_name: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  lat: number;
  lon: number;
}

export interface ResolvedCity {
  query: string;
  display_name: string;
  lat: number;
  lng: number;
  country_code: string | null;
  provider: "locationiq" | "nominatim";
}

const DEBOUNCE_MS = 250;

export default function CitySearchInput({
  onResolved,
  placeholder = "Enter your city…",
  autoFocus = false,
}: {
  onResolved: (city: ResolvedCity) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NominatimSuggestion[]>([]);
  const [resolving, setResolving] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Nominatim-backed typeahead via existing /api/orgs/search? No — that's orgs.
  // Use a thin wrapper around Nominatim directly, going through the same
  // browser-rate-limit pattern used by /submit's LocationCombobox.
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6`,
        { headers: { "Accept-Language": "en" } }
      );
      if (!res.ok) { setResults([]); return; }
      const raw = (await res.json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
        address?: { city?: string; town?: string; village?: string; country?: string; country_code?: string };
      }>;
      const list: NominatimSuggestion[] = raw.map(r => ({
        display_name: r.display_name,
        city: r.address?.city ?? r.address?.town ?? r.address?.village ?? null,
        country: r.address?.country ?? null,
        country_code: r.address?.country_code ?? null,
        lat: Number(r.lat),
        lon: Number(r.lon),
      }));
      setResults(list);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(v: string) {
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(v), DEBOUNCE_MS);
  }

  async function pick(s: NominatimSuggestion) {
    setValue(s.display_name);
    setOpen(false);
    setResolving(true);
    // Re-resolve through our server-side endpoint (LocationIQ-first) so the
    // committed coordinates come from the production geocoder.
    try {
      const res = await fetch(`/api/geo/resolve?q=${encodeURIComponent(s.display_name)}`);
      if (res.ok) {
        const r = (await res.json()) as { lat: number; lng: number; country_code: string | null; provider: "locationiq" | "nominatim" };
        onResolved({
          query: s.display_name,
          display_name: s.display_name,
          lat: r.lat,
          lng: r.lng,
          country_code: r.country_code,
          provider: r.provider,
        });
        return;
      }
    } catch {
      // ignore
    }
    // Fallback: use the Nominatim suggestion's coordinates directly.
    onResolved({
      query: s.display_name,
      display_name: s.display_name,
      lat: s.lat,
      lng: s.lon,
      country_code: s.country_code,
      provider: "nominatim",
    });
    setResolving(false);
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
      />
      {(loading || resolving) && (
        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-start gap-2 border-b border-slate-100 last:border-b-0"
              >
                <MapPin size={13} className="mt-0.5 text-emerald-600 shrink-0" />
                <span className="flex-1">
                  <span className="font-semibold text-slate-800 block">
                    {s.city ?? s.display_name.split(",")[0]}
                  </span>
                  <span className="text-xs text-slate-500 line-clamp-1">{s.display_name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
